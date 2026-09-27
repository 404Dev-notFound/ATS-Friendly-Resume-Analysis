// ============================================================
// Resume Screen — Modern Client-Side ATS Screener
// 100% In-Browser Execution • Privacy Guaranteed
// ============================================================

import { extractTextFromPdf } from './utils/resumeParser.js';
import { analyzeResume } from './utils/resumeAnalyzer.js';
import { calculateScore } from './utils/resumeScorer.js';

// DOM Elements
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const filePill = document.getElementById("filePill");
const fileName = document.getElementById("fileName");
const removeFile = document.getElementById("removeFile");
const analyzeBtn = document.getElementById("analyzeBtn");
const intakeFolder = document.getElementById("intakeFolder");
const heroSection = document.getElementById("heroSection");

const loadSampleGood = document.getElementById("loadSampleGood");
const loadSampleBad = document.getElementById("loadSampleBad");

const processing = document.getElementById("processing");
const processingLine = document.getElementById("processingLine");
const errorCard = document.getElementById("errorCard");
const errorMessage = document.getElementById("errorMessage");
const errorRetry = document.getElementById("errorRetry");
const results = document.getElementById("results");
const startOverBtn = document.getElementById("startOverBtn");
const printReportBtn = document.getElementById("printReportBtn");
const caseNumber = document.getElementById("caseNumber");

let selectedFile = null;

// Generate Session Case Tag
function generateAuditTag() {
  if (caseNumber) {
    caseNumber.textContent = "AUDIT #" + Math.floor(100000 + Math.random() * 899999);
  }
}
generateAuditTag();

// ---------- File Selection & Drag-and-Drop ----------
// browseBtn is a native <label for="fileInput">, so clicking it directly opens
// the OS file dialog with zero synthetic event blocks. We also add keyboard support.
if (browseBtn) {
  browseBtn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
}

if (dropzone) {
  dropzone.addEventListener("click", (e) => {
    // Only trigger if clicking background dropzone, not the browse label or sample buttons
    if (e.target.closest("#browseBtn") || e.target.closest(".sample-btn") || e.target.closest(".samples-bar") || e.target.closest("#filePill")) {
      return;
    }
    fileInput.click();
  });

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
}

if (fileInput) {
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });
}

function handleFile(file) {
  if (!file) return;

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    showError("Please upload a valid PDF document. Resume Screen currently specializes in PDF screening.");
    return;
  }

  const maxMb = 15;
  if (file.size > maxMb * 1024 * 1024) {
    showError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is ${maxMb}MB.`);
    return;
  }

  selectedFile = file;
  fileName.textContent = file.name;
  filePill.hidden = false;
  analyzeBtn.disabled = false;
}

if (removeFile) {
  removeFile.addEventListener("click", () => {
    clearSelectedFile();
  });
}

function clearSelectedFile() {
  selectedFile = null;
  if (fileInput) fileInput.value = "";
  filePill.hidden = true;
  analyzeBtn.disabled = true;
}

// ---------- Pre-Screened Sample Loaders ----------
async function loadSample(sampleFileName, defaultName) {
  const candidatePaths = [
    `./samples/${sampleFileName}`,
    `./public/samples/${sampleFileName}`,
    `samples/${sampleFileName}`,
    `public/samples/${sampleFileName}`
  ];

  let blob = null;
  let lastErr = null;

  for (const p of candidatePaths) {
    try {
      const res = await fetch(p);
      if (res.ok) {
        blob = await res.blob();
        break;
      }
    } catch (e) {
      lastErr = e;
    }
  }

  if (!blob) {
    console.error("Failed to load sample resume:", lastErr);
    showError("Could not load sample resume. You can still select any PDF resume from your device.");
    return;
  }

  const file = new File([blob], defaultName, { type: "application/pdf" });
  handleFile(file);
  filePill.scrollIntoView({ behavior: "smooth", block: "center" });
}

if (loadSampleGood) {
  loadSampleGood.addEventListener("click", (e) => {
    e.stopPropagation();
    loadSample("Sarah_Nguyen.pdf", "sample_resume_ACCEPTED_Sarah_Nguyen.pdf");
  });
}

if (loadSampleBad) {
  loadSampleBad.addEventListener("click", (e) => {
    e.stopPropagation();
    loadSample("John_Carter.pdf", "sample_resume_REJECTED_John_Carter.pdf");
  });
}

// ---------- Analysis Pipeline ----------
const LOADING_STEPS = [
  "Extracting document text & layout in browser…",
  "Vectorizing & cross-referencing against 40+ screening rules…",
  "Measuring bullet quantification & action verb density…",
  "Checking ATS parsing compatibility & standard headers…",
  "Synthesizing recommendations & final audit report…"
];

if (analyzeBtn) {
  analyzeBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    if (heroSection) heroSection.hidden = true;
    intakeFolder.hidden = true;
    errorCard.hidden = true;
    results.hidden = true;
    processing.hidden = false;

    let stepIndex = 0;
    processingLine.textContent = LOADING_STEPS[0];
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % LOADING_STEPS.length;
      processingLine.textContent = LOADING_STEPS[stepIndex];
    }, 650);

    // Short tick for smooth UI rendering
    await new Promise(r => setTimeout(r, 500));

    try {
      // Step 1: Client-side PDF extraction
      const parsed = await extractTextFromPdf(selectedFile);

      await new Promise(r => setTimeout(r, 350));

      // Step 2: TF-IDF RAG retrieval & diagnostics
      const analysis = analyzeResume(parsed);

      // Step 3: Multi-dimensional score calculation
      const data = calculateScore(parsed, analysis);

      clearInterval(stepInterval);
      processing.hidden = true;

      renderResults(data);
    } catch (err) {
      clearInterval(stepInterval);
      processing.hidden = true;
      console.error("Analysis pipeline error:", err);
      showError(err.message || "An unexpected error occurred while parsing the resume.");
    }
  });
}

function showError(message) {
  if (heroSection) heroSection.hidden = false;
  intakeFolder.hidden = false;
  processing.hidden = true;
  results.hidden = true;
  errorCard.hidden = false;
  errorMessage.textContent = message;
  errorCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (errorRetry) {
  errorRetry.addEventListener("click", () => {
    errorCard.hidden = true;
    intakeFolder.hidden = false;
    clearSelectedFile();
  });
}

if (startOverBtn) {
  startOverBtn.addEventListener("click", () => {
    results.hidden = true;
    if (heroSection) heroSection.hidden = false;
    intakeFolder.hidden = false;
    clearSelectedFile();
    generateAuditTag();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

if (printReportBtn) {
  printReportBtn.addEventListener("click", () => {
    window.print();
  });
}

// ---------- Results Rendering ----------
function renderResults(data) {
  results.hidden = false;

  // 1. Verdict Badge & Summary
  const verdictBadge = document.getElementById("verdictBadge");
  const stampText = document.getElementById("stampText");
  const verdict = (data.verdict || "").toLowerCase();

  verdictBadge.classList.remove("accepted", "borderline", "rejected");

  if (verdict.includes("accept")) {
    verdictBadge.classList.add("accepted");
    stampText.textContent = "LIKELY ACCEPTED";
  } else if (verdict.includes("border")) {
    verdictBadge.classList.add("borderline");
    stampText.textContent = "BORDERLINE PROFILE";
  } else {
    verdictBadge.classList.add("rejected");
    stampText.textContent = "REVISION NEEDED";
  }

  document.getElementById("verdictReason").textContent = data.verdict_reason || "";

  // 2. Overall Score Gauge
  const score = clampScore(data.overall_score);
  const dialFill = document.getElementById("dialFill");
  const circumference = 402; // 2 * PI * 64
  const offset = circumference - (circumference * score) / 100;
  
  const color = score >= 85 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
  dialFill.style.stroke = color;
  
  requestAnimationFrame(() => {
    dialFill.style.strokeDashoffset = offset;
  });
  animateNumber(document.getElementById("scoreNumber"), score);

  // Score Tier Label
  const tierLabel = document.getElementById("scoreTierLabel");
  if (tierLabel) {
    tierLabel.textContent = score >= 85 ? "Excellent Tier" : score >= 70 ? "Competitive" : score >= 50 ? "Borderline" : "Needs Revision";
    tierLabel.style.color = color;
  }

  // 3. ATS Compatibility
  const ats = data.ats_compatibility || {};
  const atsScoreVal = clampScore(ats.score);
  document.getElementById("atsScore").textContent = atsScoreVal;
  
  const atsScoreBadge = document.getElementById("atsScoreBadge");
  if (atsScoreBadge) {
    atsScoreBadge.textContent = `${atsScoreVal}% Safety`;
    atsScoreBadge.style.color = atsScoreVal >= 85 ? "#10b981" : atsScoreVal >= 60 ? "#f59e0b" : "#f43f5e";
  }

  const atsIssuesEl = document.getElementById("atsIssues");
  atsIssuesEl.innerHTML = "";
  if (ats.issues && ats.issues.length) {
    ats.issues.forEach((issue) => {
      const li = document.createElement("li");
      li.textContent = issue;
      atsIssuesEl.appendChild(li);
    });
  } else {
    atsIssuesEl.innerHTML = '<li class="ats__empty">✓ No critical ATS parsing risks detected. Clean document hierarchy.</li>';
  }

  // 4. Dimension Breakdown
  const breakdownGrid = document.getElementById("breakdownGrid");
  if (breakdownGrid) {
    breakdownGrid.innerHTML = "";
    const b = data.breakdown || {
      content: { score: 28, max: 35, label: "Content & Impact" },
      ats: { score: 22, max: 25, label: "ATS Formatting & Structure" },
      skills: { score: 14, max: 15, label: "Skills & Keywords" },
      experience: { score: 12, max: 15, label: "Experience & Chronology" },
      contact: { score: 9, max: 10, label: "Contact & Online Profiles" }
    };

    Object.values(b).forEach(item => {
      const pct = Math.round((item.score / item.max) * 100);
      const row = document.createElement("div");
      row.className = "breakdown-row";
      row.innerHTML = `
        <div class="breakdown-row__header">
          <span class="breakdown-row__label">${escapeHtml(item.label)}</span>
          <span class="breakdown-row__score">${item.score} / ${item.max} pts (${pct}%)</span>
        </div>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width: ${pct}%"></div>
        </div>
      `;
      breakdownGrid.appendChild(row);
    });
  }

  // 5. Top Priority Fixes
  const priorityList = document.getElementById("priorityList");
  priorityList.innerHTML = "";
  (data.top_3_priority_fixes || []).forEach((fix) => {
    const li = document.createElement("li");
    li.textContent = fix;
    priorityList.appendChild(li);
  });
  if (!priorityList.children.length) {
    priorityList.innerHTML = '<li class="empty-note">No critical fixes required — resume demonstrates strong ATS and recruiter alignment.</li>';
  }

  // 6. Strengths
  const strengthsList = document.getElementById("strengthsList");
  strengthsList.innerHTML = "";
  (data.strengths || []).forEach((s) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${escapeHtml(s.point)}</strong><span>${escapeHtml(s.why_it_matters || "")}</span>`;
    strengthsList.appendChild(li);
  });
  if (!strengthsList.children.length) {
    strengthsList.innerHTML = '<li class="empty-note">No standout strengths detected in this draft.</li>';
  }

  // 7. Flagged Flaws
  const flawsList = document.getElementById("flawsList");
  flawsList.innerHTML = "";
  (data.flaws || []).forEach((f) => {
    const li = document.createElement("li");
    const sevClass = "severity-" + (f.severity || "minor").toLowerCase();
    li.innerHTML = `
      <div class="flaw-header">
        <span class="severity-tag ${sevClass}">${escapeHtml((f.severity || "Minor").toUpperCase())}</span>
        <strong>${escapeHtml(f.issue)}</strong>
      </div>
      <p class="flaw-fix"><strong>Recommended Fix:</strong> ${escapeHtml(f.fix || "")}</p>
    `;
    flawsList.appendChild(li);
  });
  if (!flawsList.children.length) {
    flawsList.innerHTML = '<li class="empty-note">No flaws worth flagging. Clean file.</li>';
  }

  // 8. Missing Quantification Rewrites
  const metricCard = document.getElementById("metricCard");
  const metricsList = document.getElementById("metricsList");
  metricsList.innerHTML = "";
  const metricExamples = data.missing_quantification_examples || [];
  if (metricExamples.length) {
    metricCard.hidden = false;
    metricExamples.forEach((m) => {
      // Parse Original vs Rewrite
      let orig = m;
      let rec = "";
      if (m.includes("➔")) {
        const parts = m.split("➔");
        orig = parts[0].replace(/^Original:\s*["']?|["']?\s*$/gi, "").trim();
        rec = parts[1].replace(/^Rewrite Example:\s*["']?|["']?\s*$/gi, "").trim();
      }

      const card = document.createElement("div");
      card.className = "rewrite-card";
      card.innerHTML = `
        <div class="rewrite-card__original">
          <span class="rewrite-label rewrite-label--orig">Original Bullet (Passive / Unquantified)</span>
          <p>"${escapeHtml(orig)}"</p>
        </div>
        <div class="rewrite-card__suggestion">
          <span class="rewrite-label rewrite-label--rec">Actionable Recruiter Rewrite (Measured Impact)</span>
          <p>"${escapeHtml(rec || m)}"</p>
        </div>
      `;
      metricsList.appendChild(card);
    });
  } else {
    metricCard.hidden = true;
  }

  // 9. Section Assessment
  const sectionGrid = document.getElementById("sectionGrid");
  sectionGrid.innerHTML = "";
  const sf = data.section_feedback || {};
  Object.keys(sf).forEach((key) => {
    const div = document.createElement("div");
    div.className = "section-item";
    div.innerHTML = `<h4>${escapeHtml(key)}</h4><p>${escapeHtml(sf[key])}</p>`;
    sectionGrid.appendChild(div);
  });

  // 10. Audit Metadata Bar
  const meta = data._meta || {};
  const evidence = document.getElementById("evidenceTag");
  evidence.textContent =
    `AUDIT SUMMARY: ${meta.model_used || "In-Browser RAG"} · ${meta.page_count ?? 1} page(s) · ` +
    `${meta.word_count ?? 0} words · ${meta.bullet_count ?? 0} bullets · ` +
    `${meta.metric_mentions_found ?? 0} metric mentions found · 100% processed locally`;

  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clampScore(n) {
  n = Number(n);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function animateNumber(el, target) {
  let current = 0;
  const step = Math.max(1, Math.round(target / 25));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    el.textContent = current;
  }, 22);
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
