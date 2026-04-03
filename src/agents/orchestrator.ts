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

const GEMINI_MODEL_CANDIDATES = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

type GeminiGenerationConfig = {
  temperature: number;
  maxOutputTokens: number;
};

const generateWithGeminiFallback = async (
  apiKey: string,
  prompt: string,
  generationConfig: GeminiGenerationConfig
): Promise<string> => {
  const errors: string[] = [];

  for (const model of GEMINI_MODEL_CANDIDATES) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    const errText = await response.text();
    errors.push(`${model}: ${response.status} ${errText}`);
  }

  throw new Error(`Gemini request failed for all models. ${errors.join(' | ')}`);
};

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

const normalizeText = (value: string | null | undefined): string =>
  (value || '').toLowerCase().trim();

const toSkillSet = (volunteer: any): Set<string> =>
  new Set((volunteer?.skills || []).map((s: string) => normalizeText(s)).filter(Boolean));

const issueSectorKeywords = (sector: string): string[] => {
  const normalizedSector = normalizeText(sector) || 'other';
  const bySector = SECTOR_KEYWORDS[normalizedSector] || [];
  return [normalizedSector, ...bySector].map((k) => normalizeText(k)).filter(Boolean);
};

const issueRequiresSkillMatch = (issue: any): boolean => normalizeText(issue?.sector) !== 'other';

const hasSectorSkillMatch = (issue: any, volunteer: any): boolean => {
  if (!issueRequiresSkillMatch(issue)) return true;
  const skills = toSkillSet(volunteer);
  const sectorKeys = issueSectorKeywords(issue?.sector);
  return sectorKeys.some((key) => skills.has(key));
};

const findMatchedSkills = (issue: any, volunteer: any): string[] => {
  const skills = Array.from(toSkillSet(volunteer));
  const sectorKeys = new Set(issueSectorKeywords(issue?.sector));
  return skills.filter((skill) => sectorKeys.has(skill));
};

const hasLocationMatch = (issue: any, volunteer: any): boolean => {
  const issueLoc = normalizeText(issue?.location);
  const volZone = normalizeText(volunteer?.zone);
  if (!issueLoc || issueLoc === 'unknown' || !volZone) return false;
  return issueLoc.includes(volZone) || volZone.includes(issueLoc);
};

const estimateIssueEffortHours = (issue: any): number => {
  const priority = Number(issue?.priority_score || 0);
  const affected = Number(issue?.affected_count || 0);
  const sector = normalizeText(issue?.sector);

  const priorityLoad = priority >= 8 ? 2.5 : priority >= 6 ? 2 : priority >= 4 ? 1.5 : 1;
  const affectedLoad = affected >= 1000 ? 2 : affected >= 300 ? 1.25 : affected >= 100 ? 0.75 : 0.25;
  const criticalSectorLoad = ['water', 'healthcare', 'sanitation', 'safety'].includes(sector) ? 0.75 : 0;

  return Math.min(6, parseFloat((1.5 + priorityLoad + affectedLoad + criticalSectorLoad).toFixed(1)));
};

const getVolunteerCapacityHours = (volunteer: any): number => {
  const declared = Number(volunteer?.availability_hours_per_week || 10);
  return Math.max(2, parseFloat((declared * 0.75).toFixed(1)));
};

const canTakeIssue = (
  volunteerId: string,
  issueEffortHours: number,
  volunteerLoads: Record<string, number>,
  volunteerCapacities: Record<string, number>
): boolean => {
  const current = volunteerLoads[volunteerId] || 0;
  const cap = volunteerCapacities[volunteerId] || 0;
  return current + issueEffortHours <= cap + 0.001;
};

const scoreVolunteerForIssue = (
  issue: any,
  volunteer: any,
  volunteerLoads: Record<string, number>,
  volunteerCapacities: Record<string, number>
): { score: number; matchedSkills: string[]; reasons: string[] } => {
  const matchedSkills = findMatchedSkills(issue, volunteer);
  const skillMatched = hasSectorSkillMatch(issue, volunteer);
  const locationMatched = hasLocationMatch(issue, volunteer);
  const currentLoad = volunteerLoads[volunteer.id] || 0;
  const capacity = volunteerCapacities[volunteer.id] || 1;
  const loadRatio = Math.min(1, currentLoad / capacity);

  if (issueRequiresSkillMatch(issue) && !skillMatched) {
    return { score: Number.NEGATIVE_INFINITY, matchedSkills: [], reasons: ['no sector-skill match'] };
  }

  const skillScore = skillMatched ? 45 : 15;
  const skillDepthScore = Math.min(20, matchedSkills.length * 7);
  const locationScore = locationMatched ? 12 : 0;
  const balanceScore = Math.max(0, (1 - loadRatio) * 20);

  const score = skillScore + skillDepthScore + locationScore + balanceScore;

  const reasons: string[] = [];
  if (matchedSkills.length > 0) reasons.push(`skills: ${matchedSkills.join(', ')}`);
  if (locationMatched) reasons.push(`zone match: ${volunteer.zone || 'local'}`);
  reasons.push(`load: ${currentLoad.toFixed(1)}/${capacity.toFixed(1)}h`);

  return { score, matchedSkills, reasons };
};

// ============ GEMINI EXTRACTION (OPTIONAL) ============
const extractWithGemini = async (rawInput: string, apiKey: string): Promise<any[]> => {
  const prompt = `Extract field coordination issues from this report. For each issue, provide:
- issue_summary: Brief description (max 100 chars)
- sector: One of [water, healthcare, electricity, sanitation, food, education, shelter, safety, logistics, counseling, other]
- location: Specific location name
- affected_count: Number of people affected (if mentioned)

Report:
${rawInput}

Return a JSON array of objects with these fields. Only valid sectors allowed.`;

  try {
    const content = (await generateWithGeminiFallback(apiKey, prompt, {
      temperature: 0.3,
      maxOutputTokens: 1500,
    })) || '[]';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed || []).map((issue: any) => ({
      issue_summary: issue.issue_summary || issue.summary || '',
      sector: sanitizeSector(issue.sector),
      location: issue.location || 'Unknown',
      affected_count: issue.affected_count || null,
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

  const content = (await generateWithGeminiFallback(apiKey, prompt, {
    temperature: 0.2,
    maxOutputTokens: 1500,
  })) || '[]';
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

  try {
    return await generateWithGeminiFallback(apiKey, prompt, {
      temperature: 0.4,
      maxOutputTokens: 600,
    });
  } catch {
    return '';
  }
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
  const scored = state.issues.map((issue) => {
    // Urgency: based on affected count and sector criticality
    const criticalSectors = ['water', 'healthcare', 'sanitation'];
    const baseCritical = criticalSectors.includes(issue.sector) ? 0.3 : 0;
    const affectedScore = Math.min(1.0, (issue.affected_count || 0) / 500);
    const urgency = (baseCritical + affectedScore) / 2 * 10;

    // Priority: urgency + vulnerability factor
    const vulnerabilityBoost = issue.affected_count && issue.affected_count > 100 ? 1.5 : 1.0;
    const priority = Math.min(10, (urgency * vulnerabilityBoost) / 1.5);

    return {
      ...issue,
      priority_score: parseFloat(priority.toFixed(1)),
      urgency_score: parseFloat(urgency.toFixed(1)),
    };
  });

  return {
    state: {
      ...state,
      issues: scored,
    },
    confidence: 0.9,
  };
};

// ============ TOOL: GAP DETECTION ============
const gapTool = async (state: AgentState): Promise<{ state: AgentState; confidence: number }> => {
  const newAlerts = [...state.alerts];

  for (const issue of state.issues) {
    const sector = issue.sector || 'other';

    // Check if any active volunteer has matching skill
    const hasSkill = state.volunteers.some(
      (v) => v.is_active && v.skills && v.skills.includes(sector)
    );

    if (!hasSkill && sector !== 'other') {
      newAlerts.push({
        type: 'skill_gap',
        message: `No volunteer with ${sector} skill for "${issue.issue_summary?.substring(0, 50)}..."`,
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
  volunteerLoads: Record<string, number>,
  volunteerCapacities: Record<string, number>
): any | null => {
  const activeVolunteers = volunteers.filter(
    (v) =>
      v.is_active &&
      v.id !== assignedVolunteerId &&
      hasSectorSkillMatch(issue, v) &&
      canTakeIssue(v.id, estimateIssueEffortHours(issue), volunteerLoads, volunteerCapacities)
  );

  if (activeVolunteers.length === 0) {
    return null;
  }

  return activeVolunteers
    .map((volunteer) => ({
      volunteer,
      scored: scoreVolunteerForIssue(issue, volunteer, volunteerLoads, volunteerCapacities),
    }))
    .sort((a, b) => b.scored.score - a.scored.score)[0]?.volunteer || null;
};

// ============ TOOL: MATCH ============
const matchTool = async (state: AgentState): Promise<{ state: AgentState; confidence: number }> => {
  const matched = [...state.issues];
  const assignments: any[] = [];
  const volunteerLoads: Record<string, number> = {};
  const volunteerCapacities: Record<string, number> = {};
  const geminiSuggestedByIssue: Record<number, string> = {};

  // Initialize load/capacity trackers in effort-hours.
  state.volunteers.forEach((v) => {
    volunteerLoads[v.id] = 0;
    volunteerCapacities[v.id] = getVolunteerCapacityHours(v);
  });

  // 1) Ask Gemini for suggestions, then validate with hard capacity + skill rules.
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  console.log('[Matching Tool] Gemini API key check:', !!geminiKey);
  
  if (geminiKey && geminiKey !== 'your-gemini-api-key-here') {
    try {
      console.log('[Matching Tool] Calling Gemini assignment suggestion with', matched.length, 'issues');
      const plan = await assignWithGemini(matched, state.volunteers, geminiKey);
      console.log('[Matching Tool] Gemini returned', plan.length, 'suggestions');

      for (const item of plan) {
        const idx = item.issue_index;
        if (idx < 0 || idx >= matched.length || !item.volunteer_id) {
          continue;
        }
        geminiSuggestedByIssue[idx] = item.volunteer_id;
      }
    } catch (err) {
      console.error('[Matching] Gemini suggestion failed:', err);
    }
  } else {
    console.log('[Matching] No Gemini key, using deterministic assignment');
  }

  // 2) Deterministic matcher with strict anti-overload checks.
  console.log('[Matching] Starting deterministic matcher. Unassigned:', matched.filter((i) => i.status !== 'assigned').length);
  const sortedIssues = matched
    .map((issue, idx) => ({ issue, idx }))
    .sort((a, b) => {
      const prioDiff = (b.issue.priority_score || 0) - (a.issue.priority_score || 0);
      if (prioDiff !== 0) return prioDiff;
      return (b.issue.affected_count || 0) - (a.issue.affected_count || 0);
    });

  for (const { issue, idx } of sortedIssues) {
    if (issue.status === 'assigned') {
      continue;
    }

    const effortHours = estimateIssueEffortHours(issue);

    const candidates = state.volunteers
      .filter((v) => v.is_active)
      .filter((v) => canTakeIssue(v.id, effortHours, volunteerLoads, volunteerCapacities))
      .map((volunteer) => ({
        volunteer,
        scored: scoreVolunteerForIssue(issue, volunteer, volunteerLoads, volunteerCapacities),
      }))
      .filter((entry) => Number.isFinite(entry.scored.score));

    if (candidates.length === 0) {
      console.log('[Matching] No valid candidate for issue', idx, '(sector:', issue.sector, ')');
      continue;
    }

    const preferredId = geminiSuggestedByIssue[idx];
    const preferredCandidate = preferredId
      ? candidates.find((c) => c.volunteer.id === preferredId)
      : undefined;

    const ranked = [...candidates].sort((a, b) => {
      if (b.scored.score !== a.scored.score) return b.scored.score - a.scored.score;
      return (volunteerLoads[a.volunteer.id] || 0) - (volunteerLoads[b.volunteer.id] || 0);
    });

    const best = preferredCandidate || ranked[0];
    const selectedVolunteer = best.volunteer;
    const selectedScore = best.scored;

    const backupVol = findBackupVolunteer(
      selectedVolunteer.id,
      issue,
      state.volunteers,
      volunteerLoads,
      volunteerCapacities
    );
    const backupInfo = backupVol
      ? ` | Backup: ${backupVol.name}`
      : ' | No backup available';

    matched[idx] = {
      ...matched[idx],
      assigned_volunteer_id: selectedVolunteer.id,
      assignment_reason: `Assigned to ${selectedVolunteer.name} (${selectedScore.reasons.join('; ')}) | effort ${effortHours.toFixed(1)}h${backupInfo}`,
      status: 'assigned',
    };

    volunteerLoads[selectedVolunteer.id] = (volunteerLoads[selectedVolunteer.id] || 0) + effortHours;
    assignments.push({ issue_index: idx, volunteer_id: selectedVolunteer.id });
  }

  state.volunteers.forEach((volunteer) => {
    const load = volunteerLoads[volunteer.id] || 0;
    const cap = volunteerCapacities[volunteer.id] || 0;
    if (volunteer.is_active && cap > 0 && load > cap + 0.001) {
      state.alerts.push({
        type: 'overload',
        message: `${volunteer.name} exceeds capacity: ${load.toFixed(1)}h / ${cap.toFixed(1)}h`,
        severity: 'warning',
      });
    }
  });

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
  const volunteerCapacities: Record<string, number> = {};

  state.volunteers.forEach((v) => {
    volunteerCapacities[v.id] = getVolunteerCapacityHours(v);
    volunteerLoads[v.id] = reallocated
      .filter((i) => i.assigned_volunteer_id === v.id)
      .reduce((sum, issue) => sum + estimateIssueEffortHours(issue), 0);
  });

  const overloaded = state.volunteers
    .filter((v) => v.is_active && volunteerLoads[v.id] > (volunteerCapacities[v.id] || 0))
    .sort(
      (a, b) =>
        (volunteerLoads[b.id] - (volunteerCapacities[b.id] || 0)) -
        (volunteerLoads[a.id] - (volunteerCapacities[a.id] || 0))
    );

  for (const overvol of overloaded) {
    const theirIssues = reallocated
      .map((i, idx) => ({ i, idx }))
      .filter(({ i }) => i.assigned_volunteer_id === overvol.id && i.status === 'assigned')
      .sort((a, b) => {
        const prioDiff = (a.i.priority_score || 0) - (b.i.priority_score || 0);
        if (prioDiff !== 0) return prioDiff;
        return estimateIssueEffortHours(b.i) - estimateIssueEffortHours(a.i);
      });

    for (const { i: issue, idx: issueIdx } of theirIssues) {
      if (volunteerLoads[overvol.id] <= (volunteerCapacities[overvol.id] || 0)) {
        break;
      }

      const effortHours = estimateIssueEffortHours(issue);
      const candidates = state.volunteers
        .filter((v) => v.id !== overvol.id && v.is_active)
        .filter((v) => hasSectorSkillMatch(issue, v))
        .filter((v) => canTakeIssue(v.id, effortHours, volunteerLoads, volunteerCapacities))
        .map((volunteer) => ({
          volunteer,
          scored: scoreVolunteerForIssue(issue, volunteer, volunteerLoads, volunteerCapacities),
        }))
        .filter((entry) => Number.isFinite(entry.scored.score))
        .sort((a, b) => b.scored.score - a.scored.score);

      if (candidates.length === 0) {
        continue;
      }

      const best = candidates[0].volunteer;

      if (issueIdx >= 0) {
        reallocated[issueIdx] = {
          ...reallocated[issueIdx],
          assigned_volunteer_id: best.id,
          assignment_reason: `Reallocated from ${overvol.name} to ${best.name} (capacity-safe balancing)`,
        };
      }

      volunteerLoads[overvol.id] -= effortHours;
      volunteerLoads[best.id] = (volunteerLoads[best.id] || 0) + effortHours;
    }
  }

  return {
    state: {
      ...state,
      issues: reallocated,
    },
    confidence: 0.85,
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
  // Decide which tool to run next based on state
  if (state.currentStep === 'starting' || state.currentStep === 'ingestion') {
    return 'extract';
  }
  if (state.issues.length === 0 && state.currentStep === 'extraction') {
    return 'extract'; // Retry extraction
  }
  if (state.issues.some((i) => i.priority_score === null)) {
    return 'score';
  }
  if (state.currentStep === 'scoring' || state.currentStep === 'gap_detection') {
    return 'gap';
  }
  if (
    state.issues.some((i) => i.status === 'unassigned') &&
    state.volunteers.length > 0
  ) {
    return 'match';
  }
  if (state.alerts.some((a) => a.type === 'overload')) {
    return 'reallocate';
  }
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
    const volunteerCapacities: Record<string, number> = {};
    state.volunteers.forEach((v) => {
      volunteerCapacities[v.id] = getVolunteerCapacityHours(v);
      volunteerLoads[v.id] = state.issues
        .filter((i) => i.assigned_volunteer_id === v.id)
        .reduce((sum, issue) => sum + estimateIssueEffortHours(issue), 0);
    });

    for (const vol of state.volunteers) {
      if (
        vol.is_active &&
        volunteerLoads[vol.id] > (volunteerCapacities[vol.id] || 0) + 0.001 &&
        !state.alerts.some((a) => a.message.includes(vol.name))
      ) {
        state.alerts.push({
          type: 'overload',
          message: `${vol.name} has ${volunteerLoads[vol.id].toFixed(1)}h load (capacity: ${(volunteerCapacities[vol.id] || 0).toFixed(1)}h).`,
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
