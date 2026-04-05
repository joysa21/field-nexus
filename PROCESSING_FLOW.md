# New Backend-Friendly Processing Flow

## What Changed

You now have a **cleaner, modular architecture** for processing field reports:

### Old Flow (Single Monolithic Function)
```
Files → processFilesWithGemini() → Gemini API → Structured Report
```
- All API keys exposed on frontend
- No separation of concerns
- Hard to extend or modify

### New Flow (Separated Steps)

#### Method 1: Files → Backend Text Extraction → Gemini Structuring
```
Upload Files 
  ↓ (extractTextFromFiles)
Extract Text
  ↓ (structureTextWithGemini)
Structure with Gemini
  ↓
Structured Report
```

**Benefits:**
- Text extraction uses local PDF.js (no API calls)
- Only structured text sent to Gemini
- Can easily move text extraction to backend later
- Smaller payloads to Gemini API

#### Method 2: Raw Text → Direct Gemini Structuring
```
Paste Raw Text
  ↓ (processRawTextWithGemini)
Send to Gemini
  ↓
Structured Report
```

**Benefits:**
- No file uploads needed
- Quick for manual reports
- Works with any text input

## How to Use

### In the UI (RunAgents Page)

**Option 1: Process Files**
1. Upload one or more files (PDF, TXT, CSV, JSON, etc.)
2. Click **"Process Files with Gemini"**
3. Watch the progress: Reading → Sending → Processing
4. Review the structured output
5. Click **"Run Agents"** to process with volunteer matching

**Option 2: Structure Pasted Text**
1. Paste your field report into the text area
2. Click **"Structure with Gemini"**
3. Raw text gets automatically converted to structured format
4. Click **"Run Agents"** to process

**Option 3: Direct Agent Processing**
1. Paste an already-structured report (or use output from Option 1/2)
2. Click **"Run Agents"** directly
3. Skip structuring if text is already formatted

## Code Examples

### For Frontend Developers

```typescript
// Option 1: Process files
const output = await processFilesWithGemini(
  [file1, file2], 
  (msg) => console.log(msg)
);

// Option 2: Structure raw text
const structured = await processRawTextWithGemini(
  "Raw field report text...",
  (msg) => console.log(msg)
);

// Option 3: Extract text only (for manual processing)
const fileContents = await extractTextFromFiles([file1, file2]);
// Do custom processing here...
```

### For Backend Integration (Future)

Currently, the Gemini API key is on the frontend. To move to backend:

**1. Create Supabase Edge Function** (`supabase/functions/structure-text/index.ts`):
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  if (req.method === "POST") {
    const { text, fileNames } = await req.json()
    
    // Call Gemini API with backend key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    )
    
    return new Response(JSON.stringify(result), { status: 200 })
  }
})
```

**2. Update geminiService.ts**:
```typescript
export async function structureTextWithGemini(
  extractedText: string,
  fileNames: string[],
  onProgress?: (message: string) => void
): Promise<string> {
  // Use backend endpoint instead
  const response = await fetch(
    `${BACKEND_API_URL}/functions/v1/structure-text`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: extractedText,
        fileNames: fileNames
      })
    }
  )
  // ... rest of implementation
}
```

**3. Deploy**:
```bash
supabase functions deploy structure-text
```

## Key Functions

### Core Text Processing

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `extractTextFromPDF()` | PDF → Text | File object | String |
| `readFileAsText()` | Any file → Text | File object | String |
| `extractTextFromFiles()` | Multiple files → Text array | File[] | `{name, content}[]` |
| `structureTextWithGemini()` | Text → Structured report | String | String |
| `processRawTextWithGemini()` | Direct text → Report | String | String |
| `processFilesWithGemini()` | Files → Report (orchestrator) | File[] | `ProcessedOutput` |

### Utilities

| Function | Purpose |
|----------|---------|
| `downloadAsTextFile()` | Save report as .txt file |
| `formatOutputForDownload()` | Add metadata to report |
| `generateFallbackReport()` | Local report generation if Gemini fails |

## Configuration

### Environment Variables Needed
```bash
VITE_GEMINI_API_KEY="AIzaSy..."  # Gemini API key (for now, frontend)
VITE_BACKEND_API_URL="..."        # Optional, for future backend calls
```

### Fallback Behavior
- If Gemini API fails → Generate structured report locally
- If network error → Show error message with fallback option
- If API key missing → Show clear error about configuration

## Advantages Over Old Approach

✅ **Modular**: Each function has single responsibility  
✅ **Testable**: Can unit test each step independently  
✅ **Extensible**: Easy to add new processors or transformations  
✅ **Movable**: Can shift text extraction or Gemini calls to backend anytime  
✅ **Fallback Support**: Works even if Gemini API fails temporarily  
✅ **Progress Tracking**: Real-time status updates for user feedback  
✅ **Flexible Input**: Files, text, or raw paste  

## Next Steps

1. **Test the flow** with your field reports
2. **Check console errors** if Gemini API still has issues
3. **Consider moving Gemini calls to backend** when ready (see Backend Integration above)
4. **Add custom sector/issue classifiers** in the future
5. **Integrate with OCR** for scanned documents

---

**Questions or issues?** Check `API_ARCHITECTURE.md` for detailed technical documentation.
