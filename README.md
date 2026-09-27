# The Resume Desk — 100% Client-Side RAG Resume Screener

A privacy-first, 100% frontend-only resume screening application that screens PDF resumes the way a strict technical recruiter and Applicant Tracking System (ATS) would.

Everything runs **completely in your browser**:
- **0 external backend servers**
- **0 databases or authentication requirements**
- **0 external network calls** — your personal resume never leaves your computer
- Deployable directly as a static frontend to **Vercel**, **Netlify**, **GitHub Pages**, or any static host.

---

## Architecture & How It Works

```
User uploads Resume PDF
         │
         ▼
src/utils/resumeParser.js
   • Extracts layout & raw text in-browser using pdfjs-dist
   • Computes structural document signals (word count, bullet count,
     contact detection, metric quantification, section recognition, weak verbs)
         │
         ▼
src/utils/ragEngine.js
   • Runs an in-browser TF-IDF vectorizer + Cosine Similarity search
   • Cross-references resume text against 40+ curated recruiter/ATS rules
     across 7 categories (ATS_FORMATTING, CONTENT_IMPACT, SKILLS,
     EXPERIENCE, EDUCATION, RED_FLAGS, SUMMARY_CONTACT)
         │
         ▼
src/utils/resumeAnalyzer.js
   • Evaluates ATS compliance & formatting risks
   • Diagnoses weak responsibility language vs strong action verbs
   • Generates realistic rewrite suggestions for unquantified bullets
         │
         ▼
src/utils/resumeScorer.js
   • Computes calibrated ATS score and weighted Overall Score (0-100)
   • Issues stamp verdict (ACCEPTED, BORDERLINE, REJECTED)
   • Generates section-by-section qualitative notes and top priority fixes
         │
         ▼
UI Results Display
   • Interactive score dial, rubber stamp verdict, flaw severity tags,
     sample rewrites, and actionable feedback
```

---

## Project Structure

```text
Resume-Screener/
├── index.html                   # Main application entry point
├── vite.config.js               # Vite bundler configuration (relative base for all hosts)
├── package.json                 # Scripts and dependencies
├── src/
│   ├── main.js                  # Main UI orchestrator & event handlers
│   ├── style.css                # Retro typewriter/manila desk styling
│   └── utils/
│       ├── knowledgeBase.js     # 40+ recruiter/ATS screening rules (RAG corpus)
│       ├── ragEngine.js         # Client-side TF-IDF vectorizer & cosine similarity
│       ├── resumeParser.js      # In-browser PDF text & signal extraction
│       ├── resumeAnalyzer.js    # Rule evaluator, diagnostics & rewrite engine
│       └── resumeScorer.js      # Score calculator & verdict synthesizer
├── public/
│   └── samples/                 # Sample PDFs for 1-click test cases
│       ├── Sarah_Nguyen.pdf     # Strong sample (Likely Accepted)
│       └── John_Carter.pdf      # Weak sample (Likely Rejected)
└── test-pipeline.js             # Automated pipeline verification test suite
```

---

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
Run the local development server with instant hot-reloading:
```bash
npm run dev
```

### 3. Build for Production
Build the optimized static bundle into `dist/`:
```bash
npm run build
```

### 4. Preview the Production Build
```bash
npm run preview
```

### 5. Automated Pipeline Tests
Run the automated pipeline test suite against the included test resumes:
```bash
npm test
```

---

## Deployment

Because this project is **100% static frontend**, you can deploy it directly without any server setup:

### Vercel
1. Connect your repository to Vercel.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Deploy!

### Netlify
1. Connect your repository to Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Deploy!

### GitHub Pages
1. Build locally or via GitHub Action: `npm run build`
2. Deploy the `dist/` directory to GitHub Pages.
   *(The `vite.config.js` is already configured with `base: './'` for seamless subpath routing).*

---

## Sample Test Resumes Included

You can click the 1-click test buttons directly in the UI or upload either of the sample PDFs in `public/samples/`:

| File | Characteristics | Expected Verdict |
|---|---|---|
| `Sarah_Nguyen.pdf` | Quantified impact in bullets, clean ATS structure, reverse-chronological dates, categorized technical skills, LinkedIn & GitHub links. | **Likely Accepted** (Score: ~95-100) |
| `John_Carter.pdf` | No quantified metrics, passive duties ("responsible for"), missing LinkedIn/portfolio, informal email handle, outdated objective statement, unverified buzzwords. | **Likely Rejected** (Score: ~40-50) |

---

## Privacy Guarantee

Personal resume information is sensitive. Unlike traditional ATS screening tools that upload your resume to cloud servers or third-party APIs:
- Document reading and parsing happen **100% in-memory in your browser**.
- TF-IDF retrieval and scoring calculations execute **entirely on your device**.
- Clicking **"Screen another resume"** completely wipes all resume data from memory.