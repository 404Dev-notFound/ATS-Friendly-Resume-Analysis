// ============================================================
// The Resume Desk — frontend logic
// Talks to the Flask backend at API_BASE. No fabricated results
// are ever rendered here — every number/string comes straight
// from the JSON the backend returns from the live LLM call.
// ============================================================

const API_BASE = "http://localhost:5000";

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const filePill = document.getElementById("filePill");
const fileName = document.getElementById("fileName");
const removeFile = document.getElementById("removeFile");
const analyzeBtn = document.getElementById("analyzeBtn");
const intakeHint = document.getElementById("intakeHint");
const intakeFolder = document.getElementById("intakeFolder");

const processing = document.getElementById("processing");
const processingLine = document.getElementById("processingLine");
const errorCard = document.getElementById("errorCard");
const errorMessage = document.getElementById("errorMessage");
const errorRetry = document.getElementById("errorRetry");
const results = document.getElementById("results");
const startOverBtn = document.getElementById("startOverBtn");
const caseNumber = document.getElementById("caseNumber");

let selectedFile = null;

// Random-ish case number just for flavor (display only, no logic depends on it)
caseNumber.textContent = "CASE No. " + Math.floor(100000 + Math.random() * 899999);

// ---------- File selection ----------
browseBtn.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("click", (e) => {
  if (e.target === browseBtn) return;
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

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});

function handleFile(file) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    showError("That's not a PDF. This desk only accepts PDF resumes.");
    return;
  }
  selectedFile = file;
  fileName.textContent = file.name;
  filePill.hidden = false;
  analyzeBtn.disabled = false;
  intakeHint.textContent = "Ready. Click \u201cSubmit for Review\u201d when you are.";
}

removeFile.addEventListener("click", () => {
  selectedFile = null;
  fileInput.value = "";
  filePill.hidden = true;
  analyzeBtn.disabled = true;
  intakeHint.textContent = "Waiting on a file. Nothing leaves this desk until you add one.";
});

// ---------- Analyze ----------
const LOADING_MESSAGES = [
  "Opening the folder…",
  "Reading the resume line by line…",
  "Cross-checking against the screening rulebook…",
  "Weighing strengths against the flags…",
  "Drafting the verdict…",
];

analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  intakeFolder.hidden = true;
  errorCard.hidden = true;
  results.hidden = true;
  processing.hidden = false;

  let msgIndex = 0;
  processingLine.textContent = LOADING_MESSAGES[0];
  const msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
    processingLine.textContent = LOADING_MESSAGES[msgIndex];
  }, 1400);

  const formData = new FormData();
  formData.append("resume", selectedFile);

  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    clearInterval(msgInterval);
    processing.hidden = true;

    if (!res.ok) {
      showError(data.error || "The server could not process this resume.");
      return;
    }

    renderResults(data);
  } catch (err) {
    clearInterval(msgInterval);
    processing.hidden = true;
    showError(
      "Could not reach the backend at " + API_BASE + ". Make sure the Flask server is running " +
      "(see README.md) and that GROQ_API_KEY is set."
    );
  }
});

function showError(message) {
  intakeFolder.hidden = false;
  processing.hidden = true;
  results.hidden = true;
  errorCard.hidden = false;
  errorMessage.textContent = message;
}

errorRetry.addEventListener("click", () => {
  errorCard.hidden = true;
  intakeFolder.hidden = false;
});

startOverBtn.addEventListener("click", () => {
  results.hidden = true;
  intakeFolder.hidden = false;
  removeFile.click();
  caseNumber.textContent = "CASE No. " + Math.floor(100000 + Math.random() * 899999);
});

// ---------- Rendering ----------
function renderResults(data) {
  results.hidden = false;

  // Stamp
  const stamp = document.getElementById("stamp");
  const stampText = document.getElementById("stampText");
  stamp.classList.remove("green", "amber");
  const verdict = (data.verdict || "").toLowerCase();
  if (verdict.includes("accept")) {
    stamp.classList.add("green");
    stampText.textContent = "ACCEPTED";
  } else if (verdict.includes("border")) {
    stamp.classList.add("amber");
    stampText.textContent = "BORDERLINE";
  } else {
    stampText.textContent = "REJECTED";
  }
  // restart stamp animation
  stamp.style.animation = "none";
  void stamp.offsetWidth;
  stamp.style.animation = "";

  document.getElementById("verdictReason").textContent = data.verdict_reason || "";

  // Score dial
  const score = clampScore(data.overall_score);
  const dialFill = document.getElementById("dialFill");
  const circumference = 251; // matches the arc path length approximation
  const offset = circumference - (circumference * score) / 100;
  const color = score >= 85 ? "#3D6B4F" : score >= 50 ? "#B8862B" : "#A6362C";
  dialFill.style.stroke = color;
  requestAnimationFrame(() => {
    dialFill.style.strokeDashoffset = offset;
  });
  animateNumber(document.getElementById("scoreNumber"), score);

  // ATS
  const ats = data.ats_compatibility || {};
  document.getElementById("atsScore").firstChild.textContent = clampScore(ats.score);
  const atsIssuesEl = document.getElementById("atsIssues");
  atsIssuesEl.innerHTML = "";
  if (ats.issues && ats.issues.length) {
    ats.issues.forEach((issue) => {
      const li = document.createElement("li");
      li.textContent = issue;
      atsIssuesEl.appendChild(li);
    });
  } else {
    atsIssuesEl.innerHTML = '<li class="ats__empty">No ATS parsing risks detected.</li>';
  }

  // Priority fixes
  const priorityList = document.getElementById("priorityList");
  priorityList.innerHTML = "";
  (data.top_3_priority_fixes || []).forEach((fix) => {
    const li = document.createElement("li");
    li.textContent = fix;
    priorityList.appendChild(li);
  });
  if (!priorityList.children.length) {
    priorityList.innerHTML = '<li class="empty-note">No priority fixes — this resume is in strong shape.</li>';
  }

  // Strengths
  const strengthsList = document.getElementById("strengthsList");
  strengthsList.innerHTML = "";
  (data.strengths || []).forEach((s) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${escapeHtml(s.point)}</strong><span>${escapeHtml(s.why_it_matters || "")}</span>`;
    strengthsList.appendChild(li);
  });
  if (!strengthsList.children.length) {
    strengthsList.innerHTML = '<li class="empty-note">No standout strengths identified in this draft.</li>';
  }

  // Flaws
  const flawsList = document.getElementById("flawsList");
  flawsList.innerHTML = "";
  (data.flaws || []).forEach((f) => {
    const li = document.createElement("li");
    const sevClass = "severity-" + (f.severity || "minor").toLowerCase();
    li.innerHTML = `
      <div><span class="severity-tag ${sevClass}">${escapeHtml((f.severity || "Minor").toUpperCase())}</span><strong>${escapeHtml(f.issue)}</strong></div>
      <p class="flaw-fix">Fix: ${escapeHtml(f.fix || "")}</p>
    `;
    flawsList.appendChild(li);
  });
  if (!flawsList.children.length) {
    flawsList.innerHTML = '<li class="empty-note">No flaws worth flagging. Clean file.</li>';
  }

  // Missing quantification examples
  const metricCard = document.getElementById("metricCard");
  const metricsList = document.getElementById("metricsList");
  metricsList.innerHTML = "";
  const metricExamples = data.missing_quantification_examples || [];
  if (metricExamples.length) {
    metricCard.hidden = false;
    metricExamples.forEach((m) => {
      const li = document.createElement("li");
      li.textContent = m;
      metricsList.appendChild(li);
    });
  } else {
    metricCard.hidden = true;
  }

  // Section feedback
  const sectionGrid = document.getElementById("sectionGrid");
  sectionGrid.innerHTML = "";
  const sf = data.section_feedback || {};
  Object.keys(sf).forEach((key) => {
    const div = document.createElement("div");
    div.className = "section-item";
    div.innerHTML = `<h4>${escapeHtml(key)}</h4><p>${escapeHtml(sf[key])}</p>`;
    sectionGrid.appendChild(div);
  });

  // Evidence / meta tag
  const meta = data._meta || {};
  const evidence = document.getElementById("evidenceTag");
  evidence.textContent =
    `EXAMINED — model: ${meta.model_used || "n/a"} · pages: ${meta.page_count ?? "?"} · ` +
    `words: ${meta.word_count ?? "?"} · bullets: ${meta.bullet_count ?? "?"} · ` +
    `quantified metrics found: ${meta.metric_mentions_found ?? "?"}`;

  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clampScore(n) {
  n = Number(n);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function animateNumber(el, target) {
  let current = 0;
  const step = Math.max(1, Math.round(target / 30));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    el.textContent = current;
  }, 20);
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
