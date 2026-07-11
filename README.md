# The Resume Desk — RAG Resume Screener

A real, working Retrieval-Augmented Generation (RAG) project that screens a resume PDF the way a strict recruiter + ATS system would: it tells you exactly what will get your resume rejected, and exactly what's working in your favor — with a live LLM call, not a canned response.

- **Backend:** Python (Flask) + a hand-built TF-IDF RAG pipeline + a free LLM on **Groq**
- **Frontend:** plain HTML / CSS / JavaScript (no build step, no framework)
- **No fake outputs:** every score, strength, and flaw in the UI comes directly from the JSON the LLM returns for the specific file you upload. If the API key isn't set or the call fails, you get a real error message — never a fabricated result.

---

## How it actually works

```
PDF upload
   │
   ▼
resume_parser.py   → extracts raw text + real structural signals
   │                  (word count, bullet count, quantified-metric count,
   │                   contact-info detection, recognized section headers…)
   ▼
rag_engine.py      → TF-IDF retrieval over knowledge_base.json, a hand-written
   │                  set of 40+ real recruiter/ATS screening rules, split into
   │                  7 categories (formatting, content, skills, experience,
   │                  education, red flags, contact/summary). The engine pulls
   │                  the most relevant rules for THIS resume from each
   │                  category, so the LLM's judgment is grounded in retrieved
   │                  context rather than free-floating opinion.
   ▼
app.py             → builds a strict prompt (resume text + measured signals +
   │                  retrieved rules) and calls a free Groq-hosted LLM,
   │                  requiring a structured JSON verdict back.
   ▼
frontend/          → renders the verdict: an overall score, an ATS-compatibility
                      score, strengths, flaws (with severity + fix), section-by-
                      section notes, and the top 3 priority fixes.
```

This is a genuine RAG architecture: retrieval (TF-IDF over a curated knowledge base) feeding generation (the LLM call), not just a wrapper around a single prompt.

---

## Project structure

```
resume-rag-screener/
├── backend/
│   ├── app.py                 # Flask API server
│   ├── rag_engine.py          # TF-IDF retrieval engine
│   ├── resume_parser.py       # PDF text + signal extraction
│   ├── knowledge_base.json    # 40+ recruiter/ATS screening rules (the RAG corpus)
│   ├── requirements.txt
│   └── .env.example           # copy to .env and add your free Groq API key
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── samples/
│   ├── sample_resume_REJECTED_John_Carter.pdf   # deliberately weak resume
│   └── sample_resume_ACCEPTED_Sarah_Nguyen.pdf  # deliberately strong resume
└── README.md
```

---

## Setup

### 1. Get a free Groq API key

Groq gives fast, free-tier access to open models like Llama 3.3. Sign up at **https://console.groq.com/keys** and generate a key — no credit card required for the free tier.

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# open .env and paste your key:
# GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

python app.py
```

The server starts at `http://localhost:5000`. Confirm it's alive:

```bash
curl http://localhost:5000/api/health
```

### 3. Frontend

The frontend is plain static HTML/CSS/JS — no build step needed. Just open it:

```bash
cd frontend
python -m http.server 8080
# then visit http://localhost:8080
```

(Opening `index.html` directly by double-clicking also works in most browsers, but serving it avoids occasional local file/CORS quirks.)

If you deploy the backend somewhere other than `localhost:5000`, update the `API_BASE` constant at the top of `frontend/script.js`.

### 4. Try it

Upload one of the two sample PDFs in `samples/` to see the full flow, or upload your own resume.

---

## Sample PDFs included

| File | What it demonstrates |
| --- | --- |
| `sample_resume_REJECTED_John_Carter.pdf` | A fictional, deliberately weak resume: no quantified achievements, passive language ("responsible for"), no LinkedIn/portfolio link, vague dates, generic buzzwords, inconsistent formatting. Expect a low score. |
| `sample_resume_ACCEPTED_Sarah_Nguyen.pdf` | A fictional, deliberately strong resume: quantified impact in nearly every bullet, clean ATS-safe formatting, consistent structure, tailored skills section, links to GitHub/LinkedIn. Expect a high score. |

Both names and details are entirely fictional, created for demo purposes only.

**Note:** the exact score and wording you see are generated live by the LLM at request time — they are not hardcoded, and will vary slightly between runs, just like a real human reviewer's notes would.

---

## Customization

- **Swap the model:** change `GROQ_MODEL` in `.env` to any chat model available on your Groq account (see https://console.groq.com/docs/models for the current free-tier list).
- **Expand the knowledge base:** add more entries to `backend/knowledge_base.json`. Keep the `category` field consistent with one of the 7 existing categories (or add a new one and register it in `CATEGORIES` inside `rag_engine.py`).
- **Tune retrieval depth:** change `TOP_K_PER_CATEGORY` in `rag_engine.py` to retrieve more or fewer guideline chunks per category.
- **Target a specific job description:** you can extend `app.py` to accept an optional job description field and pass it into the prompt so the LLM tailors keyword-matching feedback to that specific posting.

---

## Honest limitations

- This tool gives a strong, structured, evidence-based second opinion — it is not a guarantee of what a specific company's ATS or recruiter will decide. Real hiring decisions also depend on the job description, the company, and factors outside a resume's text.
- PDF text extraction can fail on resumes that are scanned images rather than real text; the tool will tell you this directly (and this is itself a real ATS-compatibility flaw worth fixing).
- Free-tier LLM APIs can rate-limit under heavy use; if a request fails, the app surfaces the real error rather than a fake result.

---

## License

Built for demonstration/educational purposes. Use and modify freely.