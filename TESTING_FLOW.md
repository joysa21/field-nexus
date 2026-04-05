# Testing the New Processing Flow

## Quick Test Checklist

### 1. File Upload Test
```
[ ] Open RunAgents page
[ ] Upload a sample PDF/TXT report
[ ] Click "Process Files with Gemini"
[ ] Verify progress messages appear
[ ] Check extracted text in textarea
[ ] Confirm "Run Agents" button is ready
```

### 2. Text Structure Test
```
[ ] Paste raw field report text
[ ] Click "Structure with Gemini"
[ ] Wait for progress: "Sending → Structuring → Complete"
[ ] Verify text is formatted as:
    - FIELD REPORT SUMMARY
    - CRITICAL ISSUES
    - ALL REPORTED ISSUES (numbered)
    - RESOURCE GAPS
[ ] Click "Run Agents" to proceed
```

### 3. Direct Agent Processing
```
[ ] Paste already-structured report
[ ] Click "Run Agents" (skip structuring)
[ ] Monitor pipeline:
    ✓ Ingestion
    ✓ Extraction
    ✓ Scoring
    ✓ Gap Detection
    ✓ Matching
    ✓ (Reallocation - if needed)
    ✓ Report Generation
[ ] Verify action plan is created
```

### 4. Error Handling Test
```
[ ] Test invalid API key:
    - Temporarily change VITE_GEMINI_API_KEY
    - Try processing
    [ ] Verify fallback report is generated
    [ ] Confirm error toast is shown

[ ] Test empty input:
    - Click "Structure with Gemini" with empty textarea
    [ ] Verify error message "Please paste a field report"

[ ] Test network timeout:
    - (Requires dev tools network throttling)
    [ ] System should handle timeout gracefully
    [ ] User sees appropriate error message
```

### 5. Download Test
```
[ ] Process a file with Gemini
[ ] Click "Download" button
[ ] Verify file contains:
    - Timestamp
    - Source files list
    - Structured report content
[ ] File should be named: processed-report-TIMESTAMP.txt
```

## Sample Test Data

### Minimal Text Report
```
Water Crisis in Village A:
- 200 families without clean water
- Well collapsed, needs repair
- Nearby clinic also affected

Education Issue:
- School damaged in storm
- 150 children can't attend
- Teachers need shelter
```

### Expected Structured Output
```
FIELD REPORT SUMMARY:
This report documents critical water and education infrastructure failures affecting 350+ residents. Immediate intervention needed for water restoration and school repairs.

CRITICAL ISSUES:
1. Contaminated/no water access - 200 families
2. School infrastructure damage - 150 children out of school

ALL REPORTED ISSUES:
1. Well collapse and water shortage. Location: Village A. Sector: water. Affected: 200 people.
2. School damage due to storm. Location: Village A. Sector: education. Affected: 150 people.
3. Clinic affected by water crisis. Location: Village A. Sector: healthcare. Affected: 1200 people.

RESOURCE GAPS:
- Need 1-2 water engineers for well reconstruction
- School repair requires construction materials and labor
- Healthcare facility needs water restoration plan
```

## Debugging Tips

### If Text Extraction Fails
```
Check console for:
- PDF.js worker initialization errors
- File type mismatch (verify file extension)
- File corruption or unsupported format

Solution:
- Try text file (.txt) instead of PDF
- Verify PDF is text-based (not scanned image)
```

### If Gemini API Returns Error
```
Check browser console for:
- 401: Invalid API key
- 403: Quota exceeded
- 429: Rate limited
- CORS errors

Solution:
- Verify VITE_GEMINI_API_KEY is set in .env
- Check Google Cloud console for quota limits
- Wait a minute and retry (rate limit)
- Check browser CORS settings if cross-origin error
```

### If Agent Processing Fails
```
Check console for:
- Issue parsing errors
- Volunteer matching failures
- Database save errors

Solution:
- Verify structured report format matches expected schema
- Check volunteer list is populated
- Verify database connection is working
```

## Monitoring Progress

### Console Logs to Watch
```javascript
// Text extraction
"Extracting text from: report.pdf"
"Initializing file processing..."

// Structuring
"Sending extracted text to Gemini for structuring..."
"Structuring complete!"

// Agent processing
[Agent Logs] Ingestion: Detected 5 issues
[Agent Logs] Extraction: Parsed issues into structured format
[Agent Logs] Scoring: Computed priority scores
[Agent Logs] Gap Detection: Identified skill gaps
[Agent Logs] Matching: Assigned volunteers to issues
```

### Expected Timings
```
File Upload: < 1 second
Text Extraction: 2-5 seconds (depends on file size)
Gemini Processing: 3-8 seconds (API latency + generation)
Agent Pipeline: 5-10 seconds (processing + assignment)
Total: ~15-25 seconds for full flow
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Gemini API error: 401" | Invalid API key | Update VITE_GEMINI_API_KEY in .env |
| "Failed to extract PDF text" | Scanned image PDF | Convert to text-based PDF or use text file |
| "No files provided" | Upload button clicked with no selection | Select at least one file before processing |
| "Structure with Gemini" button disabled | Text is empty | Paste or type text before structuring |
| Fallback report generated | Gemini API failed | Check network, API quota, or try again |
| Agent processing hangs | Volunteer data not loading | Verify Supabase connection, check auth status |
| Issues not being assigned | No matching volunteers | Add more volunteers with relevant skills |

## Success Indicators

### ✅ Text Extraction Working
- File text appears in textarea
- No "PDF extraction error" messages
- Progress shows "Reading file..."

### ✅ Gemini Structuring Working
- Text reformatted with proper headers
- Issues numbered and categorized
- Sectors assigned correctly
- Location and affected counts visible

### ✅ Agent Processing Working
- All 7 pipeline steps execute
- Issues assigned to volunteers
- Action plan generated with assignments
- Report saved to database

### ✅ System Healthy
- No console errors
- Progress messages display
- Toast notifications appear
- User can download reports

---

**Need help?** Check the logs in browser DevTools (F12 → Console) for detailed error messages.
