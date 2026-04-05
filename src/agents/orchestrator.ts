export interface AgentLog {
  agent: string;
  timestamp: string;
  decision: string;
  reasoning: string;
}

export interface Alert {
  type: 'skill_gap' | 'overload' | 'critical_unassigned' | 'reallocation';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface AgentState {
  rawInput: string;
  issues: any[];
  volunteers: any[];
  assignments: any[];
  alerts: Alert[];
  agentLogs: AgentLog[];
  currentStep: string;
  isComplete: boolean;
  confidence?: number;
}

// ============ SECTOR & SKILL KEYWORDS ============
const SECTOR_KEYWORDS: Record<string, string[]> = {
  water: ['water', 'handpump', 'tanker', 'drinking', 'dehydration', 'well', 'supply'],
  healthcare: ['clinic', 'hospital', 'medicine', 'antibiotics', 'insulin', 'ors', 'fever', 'patient', 'counseling', 'health'],
  electricity: ['power', 'outage', 'electric', 'light', 'grid'],
  sanitation: ['sewage', 'toilet', 'sanitation', 'diarrhea', 'overflow', 'latrine'],
  food: ['meal', 'food', 'supply', 'rice', 'grain', 'hunger', 'children'],
  education: ['school', 'student', 'education', 'teacher', 'class'],
  shelter: ['shelter', 'displaced', 'homeless', 'blanket', 'flooding', 'flood'],
  safety: ['safety', 'security', 'violence', 'protection'],
  logistics: ['transport', 'logistics', 'delivery', 'supply chain'],
};

const LOCATION_PATTERNS = [
  /(?:in|at|near|around|village|town|block|zone)\s+([A-Za-z\s]+?)(?:\.|,|:|\)|$)/gi,
];

const AFFECTED_COUNT_PATTERN = /(\d+)\s+(?:families|people|persons|residents|students|children|households|patients)/gi;

const sanitizeSector = (value: string | undefined): string => {
  const allowed = new Set([
    'water',
    'healthcare',
    'electricity',
    'sanitation',
    'food',
    'education',
    'shelter',
    'safety',
    'logistics',
    'counseling',
    'other',
  ]);
  const normalized = (value || 'other').toLowerCase().trim();
  return allowed.has(normalized) ? normalized : 'other';
};

const normalizeSkillTag = (value: string | undefined): string =>
  (value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

// ============ GEMINI EXTRACTION (OPTIONAL) ============
const extractWithGemini = async (rawInput: string, apiKey: string): Promise<any[]> => {
  const prompt = `You are analyzing NGO field reports.

Extract:
1. List of issues
2. Category of each issue
3. Location (if present)
4. Severity hint

Return JSON array with objects:
[{"issue": string, "category": string, "location": string | null, "severity_hint": "low" | "medium" | "high" | "critical"}]

Use category from:
[water, healthcare, electricity, sanitation, food, education, shelter, safety, logistics, counseling, other]

Report:
${rawInput}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed || []).map((issue: any) => ({
      issue_summary: issue.issue || issue.issue_summary || issue.summary || '',
      sector: sanitizeSector(issue.category || issue.sector),
      location: issue.location || 'Unknown',
      affected_count: null,
      severity_hint: (issue.severity_hint || 'medium').toLowerCase(),
      required_skills: [],
      priority_score: null,
      urgency_score: null,
      status: 'unassigned',
      assigned_volunteer_id: null,
      assignment_reason: null,
      created_at: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Gemini API error:', err);
    throw err;
  }
};

const assignWithGemini = async (
  issues: any[],
  volunteers: any[],
  apiKey: string
): Promise<Array<{ issue_index: number; volunteer_id: string | null; assignment_reason?: string }>> => {
  const compactIssues = issues.map((i, idx) => ({
    issue_index: idx,
    issue_summary: i.issue_summary,
    sector: i.sector,
    location: i.location,
    priority_score: i.priority_score,
    affected_count: i.affected_count,
  }));

  const compactVolunteers = volunteers
    .filter((v) => v.is_active)
    .map((v) => ({
      volunteer_id: v.id,
      name: v.name,
      skills: v.skills || [],
      zone: v.zone,
      availability_hours_per_week: v.availability_hours_per_week || 10,
    }));

  const prompt = `You are an NGO dispatch planner. Assign each issue to at most one volunteer.
Goals:
1) Prioritize higher priority_score first
2) Match sector with volunteer skills whenever possible
3) Balance workload fairly
4) If no fit exists, return volunteer_id as null

Return ONLY a JSON array with objects:
[{"issue_index": number, "volunteer_id": string | null, "assignment_reason": string}]

Issues:
${JSON.stringify(compactIssues)}

Volunteers:
${JSON.stringify(compactVolunteers)}
`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini assignment failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item) => typeof item?.issue_index === 'number')
    .map((item) => ({
      issue_index: item.issue_index,
      volunteer_id: item.volunteer_id ?? null,
      assignment_reason: item.assignment_reason || 'Gemini-recommended assignment',
    }));
};

const generateActionPlanSummaryWithGemini = async (state: AgentState, apiKey: string): Promise<string> => {
  const planContext = {
    total_issues: state.issues.length,
    assigned_issues: state.issues.filter((i) => i.status === 'assigned').length,
    unassigned_issues: state.issues.filter((i) => i.status !== 'assigned').length,
    top_issues: [...state.issues]
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
      .slice(0, 5)
      .map((i) => ({
        issue_summary: i.issue_summary,
        sector: i.sector,
        priority_score: i.priority_score,
        assigned_volunteer_id: i.assigned_volunteer_id,
      })),
    alerts: state.alerts,
  };

  const prompt = `Create a concise NGO action plan summary in 5-7 bullet points.
Include: immediate actions, critical risks, and next 24h recommendations.
Keep it practical and field-ready.

Data:
${JSON.stringify(planContext)}
`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
    }),
  });

  if (!response.ok) return '';

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

const scoreWithGemini = async (issues: any[], apiKey: string): Promise<Array<{ issue_index: number; urgency_score: number }>> => {
  const prompt = `Rate urgency from 1-10 based on:
- impact on life
- number of people affected
- immediacy

Return ONLY JSON array:
[{"issue_index": number, "urgency_score": number}]

Issues:
${JSON.stringify(
    issues.map((i, idx) => ({
      issue_index: idx,
      issue: i.issue_summary,
      sector: i.sector,
      location: i.location,
      affected_count: i.affected_count,
      severity_hint: i.severity_hint,
    }))
  )}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini scoring failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item) => typeof item?.issue_index === 'number')
    .map((item) => ({
      issue_index: item.issue_index,
      urgency_score: Math.max(1, Math.min(10, Number(item.urgency_score) || 5)),
    }));
};

const detectSkillsWithGemini = async (
  issues: any[],
  apiKey: string
): Promise<Array<{ issue_index: number; required_skills: string[] }>> => {
  const prompt = `For each NGO issue, list volunteer skills required to address it.
Return ONLY JSON array:
[{"issue_index": number, "required_skills": string[]}]

Use concise skill tags (examples: healthcare, counseling, logistics, water, sanitation, education, shelter, legal_aid, psychosocial_support, emergency_response).

Issues:
${JSON.stringify(
    issues.map((i, idx) => ({
      issue_index: idx,
      issue: i.issue_summary,
      sector: i.sector,
      location: i.location,
      priority_score: i.priority_score,
      urgency_score: i.urgency_score,
    }))
  )}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1000 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini skill-gap detection failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item) => typeof item?.issue_index === 'number')
    .map((item) => ({
      issue_index: item.issue_index,
      required_skills: Array.isArray(item.required_skills)
        ? item.required_skills.map((s: string) => normalizeSkillTag(s)).filter(Boolean)
        : [],
    }));
};

// ============ TOOL: INGEST ============
const ingestTool = async (state: AgentState): Promise<{ state: AgentState; confidence: number }> => {
  const trimmed = state.rawInput.trim();

  if (!trimmed || trimmed.length < 20) {
    return {
      state: {
        ...state,
        alerts: [
          ...state.alerts,
          { type: 'critical_unassigned', message: 'Empty or too-short input. Skipping pipeline.', severity: 'warning' },
        ],
      },
      confidence: 0.2,
    };
  }

  return {
    state: {
      ...state,
      rawInput: trimmed,
    },
    confidence: 1.0,
  };
};

// ============ TOOL: EXTRACT ============
const extractTool = async (state: AgentState): Promise<{ state: AgentState; confidence: number }> => {
  const extractedIssues: any[] = [];

  // Try Gemini extraction if API key available
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (geminiKey && geminiKey !== 'your-gemini-api-key-here') {
    try {
      const geminiIssues = await extractWithGemini(state.rawInput, geminiKey);
      if (geminiIssues.length > 0) {
        const confidence = Math.min(1.0, geminiIssues.length / 5);
        return {
          state: {
            ...state,
            issues: geminiIssues,
          },
          confidence,
        };
      }
    } catch (err) {
      console.warn('Gemini extraction failed, falling back to regex:', err);
    }
  }

  // Fallback: Split by common delimiters (newlines, bullets, numbers)
  const chunks = state.rawInput.split(/[\n]+/).filter((c) => c.trim().length > 10);

  for (const chunk of chunks) {
    const chunkLower = chunk.toLowerCase();

    // Detect sector
    let sector = 'other';
    for (const [sec, keywords] of Object.entries(SECTOR_KEYWORDS)) {
      if (keywords.some((kw) => chunkLower.includes(kw))) {
        sector = sec;
        break;
      }
    }

    // Extract location
    let location = 'Unknown';
    LOCATION_PATTERNS[0].lastIndex = 0;
    const locMatch = LOCATION_PATTERNS[0].exec(chunk);
    if (locMatch) {
      location = locMatch[1]?.trim() || 'Unknown';
    }

    // Extract affected count
    let affectedCount = 0;
    const countMatch = chunk.match(AFFECTED_COUNT_PATTERN);
    if (countMatch) {
      affectedCount = Math.max(...countMatch.map((m) => parseInt(m.match(/\d+/)?.[0] || '0', 10)));
    }

    if (chunk.trim().length > 15) {
      extractedIssues.push({
        issue_summary: chunk.trim(),
        sector: sanitizeSector(sector),
        location,
        affected_count: affectedCount || null,
        severity_hint: 'medium',
        required_skills: [],
        priority_score: null,
        urgency_score: null,
        status: 'unassigned',
        assigned_volunteer_id: null,
        assignment_reason: null,
        created_at: new Date().toISOString(),
      });
    }
  }

  const confidence = extractedIssues.length > 0 ? Math.min(1.0, extractedIssues.length / 5) : 0.3;

  return {
    state: {
      ...state,
      issues: extractedIssues,
    },
    confidence,
  };
};

// ============ TOOL: SCORE ============
const scoreTool = async (state: AgentState): Promise<{ state: AgentState; confidence: number }> => {
  let scored = [...state.issues];
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (geminiKey && geminiKey !== 'your-gemini-api-key-here') {
    try {
      const geminiScores = await scoreWithGemini(state.issues, geminiKey);
      if (geminiScores.length > 0) {
        const byIndex = new Map(geminiScores.map((s) => [s.issue_index, s.urgency_score]));
        scored = state.issues.map((issue, idx) => {
          const urgency = byIndex.get(idx) ?? 5;
          return {
            ...issue,
            urgency_score: parseFloat(Number(urgency).toFixed(1)),
            priority_score: parseFloat(Number(urgency).toFixed(1)),
          };
        });

        return {
          state: {
            ...state,
            issues: scored,
          },
          confidence: 0.92,
        };
      }
    } catch (err) {
      console.warn('Gemini scoring failed, using fallback scoring:', err);
    }
  }

  scored = state.issues.map((issue) => {
    const criticalSectors = ['water', 'healthcare', 'sanitation', 'shelter', 'safety'];
    const baseCritical = criticalSectors.includes(issue.sector) ? 0.5 : 0.2;
    const affectedScore = Math.min(1.0, (issue.affected_count || 0) / 500);
    const severityBoost = issue.severity_hint === 'critical' ? 0.4 : issue.severity_hint === 'high' ? 0.25 : 0.1;
    const urgency = Math.min(10, (baseCritical + affectedScore + severityBoost) * 10 / 1.6);

    return {
      ...issue,
      priority_score: parseFloat(urgency.toFixed(1)),
      urgency_score: parseFloat(urgency.toFixed(1)),
    };
  });

  return {
    state: {
      ...state,
      issues: scored,
    },
    confidence: 0.78,
  };
};

// ============ TOOL: GAP DETECTION ============
const gapTool = async (state: AgentState): Promise<{ state: AgentState; confidence: number }> => {
  const newAlerts = [...state.alerts];
  let enrichedIssues = [...state.issues];

  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (geminiKey && geminiKey !== 'your-gemini-api-key-here') {
    try {
      const skillsByIssue = await detectSkillsWithGemini(state.issues, geminiKey);
      if (skillsByIssue.length > 0) {
        const byIndex = new Map(skillsByIssue.map((s) => [s.issue_index, s.required_skills]));
        enrichedIssues = state.issues.map((issue, idx) => {
          const llmSkills = byIndex.get(idx) || [];
          const fallbackSkills = [normalizeSkillTag(issue.sector)].filter(Boolean);
          return {
            ...issue,
            required_skills: llmSkills.length > 0 ? llmSkills : fallbackSkills,
          };
        });
      }
    } catch (err) {
      console.warn('Gemini skill-gap detection failed, using fallback skills:', err);
    }
  }

  if (enrichedIssues.some((i) => !Array.isArray(i.required_skills) || i.required_skills.length === 0)) {
    enrichedIssues = enrichedIssues.map((issue) => ({
      ...issue,
      required_skills:
        Array.isArray(issue.required_skills) && issue.required_skills.length > 0
          ? issue.required_skills
          : [normalizeSkillTag(issue.sector)].filter(Boolean),
    }));
  }

  const volunteerSkills = state.volunteers
    .filter((v) => v.is_active)
    .map((v) => (Array.isArray(v.skills) ? v.skills : []))
    .flat()
    .map((s: string) => normalizeSkillTag(s));
  const volunteerSkillSet = new Set(volunteerSkills);

  for (const issue of enrichedIssues) {
    const requiredSkills: string[] = Array.isArray(issue.required_skills) ? issue.required_skills : [];
    const missingSkills = requiredSkills.filter((skill) => !volunteerSkillSet.has(skill));

    if (missingSkills.length > 0) {
      newAlerts.push({
        type: 'skill_gap',
        message: `Missing skills [${missingSkills.join(', ')}] for "${issue.issue_summary?.substring(0, 50)}..."`,
        severity: 'warning',
      });
    }

    // Check critical unassigned
    if ((issue.priority_score || 0) > 7 && issue.status === 'unassigned') {
      newAlerts.push({
        type: 'critical_unassigned',
        message: `Critical issue (score ${issue.priority_score}) unassigned: ${issue.issue_summary?.substring(0, 50)}...`,
        severity: 'critical',
      });
    }
  }

  return {
    state: {
      ...state,
      issues: enrichedIssues,
      alerts: newAlerts,
    },
    confidence: 0.85,
  };
};

// ============ HELPER: Generate Backup Volunteer ============
const findBackupVolunteer = (
  assignedVolunteerId: string,
  issue: any,
  volunteers: any[],
  volunteerLoads: Record<string, number>
): any | null => {
  const issueSkills: string[] = Array.isArray(issue.required_skills) && issue.required_skills.length > 0
    ? issue.required_skills
    : [normalizeSkillTag(issue.sector)].filter(Boolean);

  const activeVolunteers = volunteers.filter(
    (v) => {
      if (!v.is_active || v.id === assignedVolunteerId) return false;
      const volunteerSkills = (v.skills || []).map((s: string) => normalizeSkillTag(s));
      return issue.sector === 'other' || issueSkills.some((skill) => volunteerSkills.includes(skill));
    }
  );

  if (activeVolunteers.length === 0) {
    return null;
  }

  // Pick least-loaded backup volunteer
  return activeVolunteers.reduce((prev, curr) =>
    (volunteerLoads[prev.id] || 0) <= (volunteerLoads[curr.id] || 0) ? prev : curr
  );
};

// ============ TOOL: MATCH ============
const matchTool = async (state: AgentState): Promise<{ state: AgentState; confidence: number }> => {
  const matched = [...state.issues];
  const assignments: any[] = [];
  const volunteerLoads: Record<string, number> = {};

  // Initialize loads
  state.volunteers.forEach((v) => {
    volunteerLoads[v.id] = 0;
  });

  // 1) Try Gemini-based assignment first
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  console.log('[Matching Tool] Gemini API key check:', !!geminiKey);
  
  if (geminiKey && geminiKey !== 'your-gemini-api-key-here') {
    try {
      console.log('[Matching Tool] Calling Gemini assignment with', matched.length, 'issues');
      const plan = await assignWithGemini(matched, state.volunteers, geminiKey);
      console.log('[Matching Tool] Gemini returned', plan.length, 'assignments');
      
      for (const item of plan) {
        const idx = item.issue_index;
        if (idx < 0 || idx >= matched.length) {
          console.warn('[Matching] Invalid index:', idx);
          continue;
        }
        if (matched[idx]?.status === 'assigned') {
          console.log('[Matching] Already assigned at index:', idx);
          continue;
        }

        const volunteer = state.volunteers.find((v) => v.id === item.volunteer_id && v.is_active);
        if (!volunteer) {
          console.warn('[Matching] Volunteer not found:', item.volunteer_id);
          continue;
        }

        // Find backup volunteer (different from primary)
        const backupVol = findBackupVolunteer(volunteer.id, matched[idx], state.volunteers, volunteerLoads);
        const backupInfo = backupVol
          ? ` | Backup: ${backupVol.name} (${backupVol.skills?.join(', ')})`
          : ' | No backup available';

        console.log('[Matching] Assigning issue', idx, 'to', volunteer.name);
        matched[idx] = {
          ...matched[idx],
          assigned_volunteer_id: volunteer.id,
          assignment_reason: `${item.assignment_reason || `Matched ${volunteer.name}`}${backupInfo}`,
          status: 'assigned',
        };

        volunteerLoads[volunteer.id] = (volunteerLoads[volunteer.id] || 0) + 1;
        assignments.push({ issue_index: idx, volunteer_id: volunteer.id });
      }
    } catch (err) {
      console.error('[Matching] Gemini assignment failed:', err);
    }
  } else {
    console.log('[Matching] No Gemini key, skipping Gemini assignment');
  }

  // 2) Fallback matcher for remaining unassigned issues
  console.log('[Matching] Starting fallback matcher. Unassigned:', matched.filter((i) => i.status !== 'assigned').length);
  const sortedIssues = matched
    .map((issue, idx) => ({ issue, idx }))
    .sort((a, b) => (b.issue.priority_score || 0) - (a.issue.priority_score || 0));

  for (const { issue, idx } of sortedIssues) {
    if (issue.status === 'assigned') {
      console.log('[Matching] Issue', idx, 'already assigned, skipping');
      continue;
    }

    const requiredSkills: string[] = Array.isArray(issue.required_skills) && issue.required_skills.length > 0
      ? issue.required_skills
      : [normalizeSkillTag(issue.sector)].filter(Boolean);

    const candidates = state.volunteers.filter((v) => {
      if (!v.is_active) return false;
      const volunteerSkills = (v.skills || []).map((s: string) => normalizeSkillTag(s));
      const hasRequiredSkill = issue.sector === 'other' || requiredSkills.some((skill) => volunteerSkills.includes(skill));
      const underCapacity = (volunteerLoads[v.id] || 0) < (v.availability_hours_per_week || 10) * 0.8;
      return hasRequiredSkill && underCapacity;
    });

    if (candidates.length > 0) {
      // Pick least-loaded
      const best = candidates.reduce((prev, curr) =>
        (volunteerLoads[prev.id] || 0) <= (volunteerLoads[curr.id] || 0) ? prev : curr
      );

      // Find backup volunteer (different from primary)
      const backupVol = findBackupVolunteer(best.id, issue, state.volunteers, volunteerLoads);
      const backupInfo = backupVol
        ? ` | Backup: ${backupVol.name}`
        : ' | No backup available';

      console.log('[Matching] Assigning issue', idx, 'to', best.name, '(fallback)');
      if (idx >= 0) {
        matched[idx] = {
          ...matched[idx],
          assigned_volunteer_id: best.id,
          assignment_reason: `Matched: ${best.name} (${issue.sector} skill, load: ${volunteerLoads[best.id]}/${best.availability_hours_per_week}hrs)${backupInfo}`,
          status: 'assigned',
        };
      }

      volunteerLoads[best.id] = (volunteerLoads[best.id] || 0) + 1;
      assignments.push({ issue_index: idx, volunteer_id: best.id });
    } else {
      console.log('[Matching] No candidates for issue', idx, '(sector:', issue.sector, ')');
    }
  }

  console.log('[Matching] Complete:', matched.filter((i) => i.status === 'assigned').length, '/', matched.length, 'assigned');

  return {
    state: {
      ...state,
      issues: matched,
      assignments,
    },
    confidence: assignments.length > 0 ? 0.9 : 0.4,
  };
};

// ============ TOOL: REALLOCATE ============
const reallocateTool = async (state: AgentState): Promise<{ state: AgentState; confidence: number }> => {
  const reallocated = [...state.issues];
  const volunteerLoads: Record<string, number> = {};

  state.volunteers.forEach((v) => {
    volunteerLoads[v.id] = reallocated.filter((i) => i.assigned_volunteer_id === v.id).length;
  });

  // Find overloaded volunteers
  const overloaded = state.volunteers.filter(
    (v) => v.is_active && volunteerLoads[v.id] > (v.availability_hours_per_week || 10) / 2
  );

  for (const overvol of overloaded) {
    // Find lowest-priority issues assigned to this volunteer
    const theirIssues = reallocated
      .map((i, idx) => ({ i, idx }))
      .filter(({ i }) => i.assigned_volunteer_id === overvol.id && i.status === 'assigned')
      .sort((a, b) => (a.i.priority_score || 0) - (b.i.priority_score || 0));

    for (const { i: issue, idx: issueIdx } of theirIssues.slice(0, Math.ceil(theirIssues.length / 2))) {
      // Try reassign to another volunteer
      const candidates = state.volunteers.filter(
        (v) =>
          v.id !== overvol.id &&
          v.is_active &&
          (v.skills?.includes(issue.sector) || true) &&
          volunteerLoads[v.id] < (v.availability_hours_per_week || 10) / 2
      );

      if (candidates.length > 0) {
        const best = candidates.reduce((prev, curr) =>
          volunteerLoads[prev.id] <= volunteerLoads[curr.id] ? prev : curr
        );

        if (issueIdx >= 0) {
          reallocated[issueIdx] = {
            ...reallocated[issueIdx],
            assigned_volunteer_id: best.id,
            assignment_reason: `Reallocated from ${overvol.name} to ${best.name} (load balancing)`,
          };
        }

        volunteerLoads[overvol.id]--;
        volunteerLoads[best.id]++;
      }
    }
  }

  return {
    state: {
      ...state,
      issues: reallocated,
    },
    confidence: 0.8,
  };
};

// ============ TOOL: REPORT ============
const reportTool = async (state: AgentState): Promise<{ state: AgentState; confidence: number }> => {
  const assigned = state.issues.filter((i) => i.status === 'assigned').length;
  const unassigned = state.issues.length - assigned;
  const critical = state.issues.filter((i) => (i.priority_score || 0) > 7).length;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

  let planSummary = `Assigned ${assigned}/${state.issues.length} issues. Critical issues: ${critical}. Unassigned: ${unassigned}.`;

  if (geminiKey && geminiKey !== 'your-gemini-api-key-here') {
    try {
      const summary = await generateActionPlanSummaryWithGemini(state, geminiKey);
      if (summary?.trim()) {
        planSummary = summary.trim();
      }
    } catch (err) {
      console.warn('Gemini action-plan summary failed, using fallback summary:', err);
    }
  }

  return {
    state: {
      ...state,
      currentStep: 'complete',
      isComplete: true,
      agentLogs: [
        ...state.agentLogs,
        {
          agent: 'Report Agent',
          timestamp: new Date().toISOString(),
          decision: 'Action plan generated',
          reasoning: planSummary,
        },
      ],
    },
    confidence: 0.95,
  };
};

// ============ THINK FUNCTION (Agent Decision-Making) ============
const think = (state: AgentState): string => {
  if (state.currentStep === 'starting' || state.currentStep === 'ingestion') return 'extract';
  if (state.currentStep === 'extraction') return 'score';
  if (state.currentStep === 'scoring') return 'gap';
  if (state.currentStep === 'gap_detection') return 'match';
  if (state.currentStep === 'matching') return 'reallocate';
  if (state.currentStep === 'reallocation') return 'report';

  // Fallback safety
  if (state.issues.length === 0) return 'extract';
  if (state.issues.some((i) => i.priority_score === null)) return 'score';
  return 'report';
};

// ============ MAIN ORCHESTRATOR ============
export const runOrchestrator = async (
  rawInput: string,
  volunteers: any[],
  onStepComplete?: (state: AgentState) => void
): Promise<AgentState> => {
  let state: AgentState = {
    rawInput,
    issues: [],
    volunteers: volunteers.map((v) => ({ ...v, is_active: v.is_active !== false })),
    assignments: [],
    alerts: [],
    agentLogs: [],
    currentStep: 'starting',
    isComplete: false,
  };

  const tools: Record<string, (s: AgentState) => Promise<{ state: AgentState; confidence: number }>> = {
    ingest: ingestTool,
    extract: extractTool,
    score: scoreTool,
    gap: gapTool,
    match: matchTool,
    reallocate: reallocateTool,
    report: reportTool,
  };

  const toolStepMap: Record<string, string> = {
    ingest: 'ingestion',
    extract: 'extraction',
    score: 'scoring',
    gap: 'gap_detection',
    match: 'matching',
    reallocate: 'reallocation',
    report: 'complete',
  };

  let maxIterations = 20;
  let iteration = 0;

  // Ingest first
  const ingestResult = await ingestTool(state);
  state = {
    ...ingestResult.state,
    currentStep: 'ingestion',
    agentLogs: [
      ...ingestResult.state.agentLogs,
      {
        agent: 'Orchestrator (Ingestion)',
        timestamp: new Date().toISOString(),
        decision: `Input validation: ${state.rawInput.length} chars, confidence ${(ingestResult.confidence * 100).toFixed(0)}%`,
        reasoning: 'Cleaned raw text input for processing.',
      },
    ],
  };
  onStepComplete?.(state);

  // Reason-act loop
  while (!state.isComplete && iteration < maxIterations) {
    iteration++;
    const nextTool = think(state);

    if (nextTool === 'report' || state.isComplete) {
      break;
    }

    const tool = tools[nextTool];
    if (!tool) break;

    const result = await tool(state);
    const stepName = toolStepMap[nextTool] || nextTool;

    state = {
      ...result.state,
      currentStep: stepName,
      confidence: result.confidence,
      agentLogs: [
        ...result.state.agentLogs,
        {
          agent: `Orchestrator (${nextTool === 'gap' ? 'Gap Detection' : nextTool === 'match' ? 'Matching' : nextTool === 'reallocate' ? 'Reallocation' : nextTool.charAt(0).toUpperCase() + nextTool.slice(1)})`,
          timestamp: new Date().toISOString(),
          decision: `Executed ${nextTool} tool (confidence: ${(result.confidence * 100).toFixed(0)}%) — ${
            nextTool === 'extract'
              ? `${result.state.issues.length} issues extracted`
              : nextTool === 'score'
              ? `${result.state.issues.filter((i) => i.priority_score).length} issues scored`
              : nextTool === 'gap'
              ? `${result.state.alerts.length} alerts generated`
              : nextTool === 'match'
              ? `${result.state.issues.filter((i) => i.status === 'assigned').length} assignments made`
              : nextTool === 'reallocate'
              ? `workload rebalanced`
              : ''
          }`,
          reasoning:
            nextTool === 'extract'
              ? 'Parsing issues from field report using keyword matching and patterns.'
              : nextTool === 'score'
              ? 'Computing priority scores based on urgency, criticality, and affected population.'
              : nextTool === 'gap'
              ? 'Detecting skill gaps and capacity constraints.'
              : nextTool === 'match'
              ? 'Greedy assignment of issues to volunteers with matching skills and capacity.'
              : nextTool === 'reallocate'
              ? 'Rebalancing workload from overloaded volunteers.'
              : '',
        },
      ],
    };

    onStepComplete?.(state);

    // Add overload alerts if needed
    const volunteerLoads: Record<string, number> = {};
    state.volunteers.forEach((v) => {
      volunteerLoads[v.id] = state.issues.filter((i) => i.assigned_volunteer_id === v.id).length;
    });

    for (const vol of state.volunteers) {
      if (
        vol.is_active &&
        volunteerLoads[vol.id] > (vol.availability_hours_per_week || 10) / 2 &&
        !state.alerts.some((a) => a.message.includes(vol.name))
      ) {
        state.alerts.push({
          type: 'overload',
          message: `${vol.name} has ${volunteerLoads[vol.id]} assignments (capacity: ${vol.availability_hours_per_week || 10}/week).`,
          severity: 'warning',
        });
      }
    }
  }

  // Final report
  state = {
    ...state,
    currentStep: 'complete',
    isComplete: true,
    agentLogs: [
      ...state.agentLogs,
      {
        agent: 'Orchestrator (Report)',
        timestamp: new Date().toISOString(),
        decision: `Pipeline complete: ${state.issues.length} issues, ${state.issues.filter((i) => i.status === 'assigned').length} assigned, ${state.alerts.length} alerts.`,
        reasoning: 'Generated final action plan and summary.',
      },
    ],
  };

  onStepComplete?.(state);
  return state;
};

// Legacy exports (for backward compatibility if needed)
export const runIngestionAgent = async (state: AgentState): Promise<AgentState> => {
  const result = await ingestTool(state);
  return { ...result.state, currentStep: 'ingestion' };
};

export const runExtractionAgent = async (state: AgentState): Promise<AgentState> => {
  const result = await extractTool(state);
  return { ...result.state, currentStep: 'extraction' };
};

export const runScoringAgent = async (state: AgentState): Promise<AgentState> => {
  const result = await scoreTool(state);
  return { ...result.state, currentStep: 'scoring' };
};

export const runGapDetectionAgent = async (state: AgentState): Promise<AgentState> => {
  const result = await gapTool(state);
  return { ...result.state, currentStep: 'gap_detection' };
};

export const runMatchingAgent = async (state: AgentState): Promise<AgentState> => {
  const result = await matchTool(state);
  return { ...result.state, currentStep: 'matching' };
};

export const runReallocationAgent = async (state: AgentState): Promise<AgentState> => {
  const result = await reallocateTool(state);
  return { ...result.state, currentStep: 'reallocation' };
};

export const runReportAgent = async (state: AgentState): Promise<AgentState> => {
  const result = await reportTool(state);
  return result.state;
};
