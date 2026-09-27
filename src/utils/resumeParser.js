/**
 * resumeParser.js
 * Client-side PDF parser and structural signal extractor using pdfjs-dist.
 * Replaces backend/resume_parser.py completely in the browser.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Production PDF.js worker configuration
// Resolves reliably in all production deployments (Vercel, Netlify, GitHub Pages) without localhost dependency
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
}

export const SECTION_KEYWORDS = [
  "experience", "work experience", "employment", "professional experience",
  "education", "skills", "technical skills", "projects", "certifications",
  "summary", "objective", "achievements", "awards", "publications",
  "volunteer", "leadership", "languages", "interests"
];

export const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
export const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?(\(?\d{3,4}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g;
export const LINKEDIN_RE = /linkedin\.com\/in\/[A-Za-z0-9\-_/]+/gi;
export const GITHUB_RE = /github\.com\/[A-Za-z0-9\-_/]+/gi;
export const URL_RE = /https?:\/\/[^\s)]+/gi;
export const METRIC_RE = /(\$\d[\d,]*\.?\d*\+?|\d+(\.\d+)?\s*%|\b\d{2,}\+?\s*(users|clients|hours|projects|people|members|engineers|countries|teams|transactions|stars|requests|downloads|commits)\b|\b\d+(\.\d+)?\s*(x|k|m|b)\b|\b(reduced|cut|saved|increased|grew|boosted)\s+by\s+\d+(\.\d+)?%?)/gi;
export const BULLET_RE = /^\s*[•\-\*▪●○◦‣∙]\s+(.+)$/gm;
export const CID_ARTIFACT_RE = /\(cid:\d+\)\s*/g;

export const WEAK_VERBS = [
  "responsible for",
  "helped with",
  "worked on",
  "was tasked with",
  "in charge of",
  "assisted in",
  "duties included"
];

export const STRONG_ACTION_VERBS = [
  "built", "led", "reduced", "launched", "negotiated", "architected", "engineered",
  "designed", "implemented", "deployed", "automated", "scaled", "spearheaded",
  "created", "overhauled", "mentored", "optimized", "generated", "orchestrated",
  "delivered", "accelerated", "restructured", "developed", "established", "drove",
  "transformed", "streamlined", "increased", "decreased", "cut", "saved"
];

export const BUZZWORDS = [
  "team player", "hardworking", "go-getter", "detail-oriented", "passionate",
  "fast learner", "multi-tasking", "synergy", "think outside the box",
  "self-starter", "results-driven", "dynamic individual", "hard working"
];

export class ParsedResume {
  constructor(rawText, pageCount, pageTexts = []) {
    this.rawText = rawText;
    this.pageCount = pageCount;
    this.pageTexts = pageTexts;

    const words = rawText.trim().split(/\s+/).filter(Boolean);
    this.wordCount = words.length;

    // Detect bullets
    const bulletMatches = [];
    let bMatch;
    const bulletRegex = new RegExp(BULLET_RE);
    while ((bMatch = bulletRegex.exec(rawText)) !== null) {
      bulletMatches.push(bMatch[1].trim());
    }
    this.bullets = bulletMatches;
    this.bulletCount = bulletMatches.length;

    // Contact info
    const emails = rawText.match(EMAIL_RE) || [];
    this.emails = emails;
    this.hasEmail = emails.length > 0;
    this.email = emails[0] || "";

    const phones = rawText.match(PHONE_RE) || [];
    this.phones = phones;
    this.hasPhone = phones.length > 0;
    this.phone = phones[0] || "";

    const linkedins = rawText.match(LINKEDIN_RE) || [];
    this.linkedins = linkedins;
    this.hasLinkedIn = linkedins.length > 0;
    this.linkedIn = linkedins[0] || "";

    const githubs = rawText.match(GITHUB_RE) || [];
    this.githubs = githubs;
    this.hasGitHub = githubs.length > 0;
    this.github = githubs[0] || "";

    const allUrls = rawText.match(URL_RE) || [];
    this.otherLinks = allUrls.filter(u =>
      !u.toLowerCase().includes("linkedin") && !u.toLowerCase().includes("github")
    );

    // Metrics
    const metricMatches = rawText.match(METRIC_RE) || [];
    this.metricMentions = metricMatches;
    this.metricCount = metricMatches.length;

    // Sections recognized
    const lower = rawText.toLowerCase();
    this.sectionsFound = SECTION_KEYWORDS.filter(kw => {
      const reg = new RegExp(`\\b${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      return reg.test(lower);
    });

    // Weak phrase hits
    this.weakPhraseHits = WEAK_VERBS.filter(w => lower.includes(w));

    // Strong action verbs found
    this.actionVerbsFound = STRONG_ACTION_VERBS.filter(v => {
      const reg = new RegExp(`\\b${v}\\b`, 'i');
      return reg.test(lower);
    });

    // Buzzword hits
    this.buzzwordHits = BUZZWORDS.filter(b => lower.includes(b));

    // Segment sections
    this.sectionMap = this.segmentSections();
  }

  segmentSections() {
    const lines = this.rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const sections = {
      summary: [],
      experience: [],
      skills: [],
      education: [],
      projects: [],
      other: []
    };

    let currentSection = 'summary';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      // Check if line looks like a header (short and contains keyword)
      if (line.length < 40) {
        if (/^(summary|objective|profile|about me)\b/i.test(lowerLine)) {
          currentSection = 'summary';
          continue;
        } else if (/^(experience|work experience|employment|professional experience|career)\b/i.test(lowerLine)) {
          currentSection = 'experience';
          continue;
        } else if (/^(skills|technical skills|technologies|core competencies)\b/i.test(lowerLine)) {
          currentSection = 'skills';
          continue;
        } else if (/^(education|academic background|academics)\b/i.test(lowerLine)) {
          currentSection = 'education';
          continue;
        } else if (/^(projects|technical projects|personal projects)\b/i.test(lowerLine)) {
          currentSection = 'projects';
          continue;
        } else if (/^(interests|hobbies|certifications|awards|leadership|volunteer)\b/i.test(lowerLine)) {
          currentSection = 'other';
          continue;
        }
      }

      sections[currentSection].push(line);
    }

    return {
      summary: sections.summary.join('\n'),
      experience: sections.experience.join('\n'),
      skills: sections.skills.join('\n'),
      education: sections.education.join('\n'),
      projects: sections.projects.join('\n'),
      other: sections.other.join('\n')
    };
  }

  toSignalBlock() {
    const lines = [
      `Page count: ${this.pageCount}`,
      `Total word count: ${this.wordCount}`,
      `Bullet points detected: ${this.bulletCount}`,
      `Email address detected: ${this.hasEmail ? 'yes' : 'NO'}`,
      `Phone number detected: ${this.hasPhone ? 'yes' : 'NO'}`,
      `LinkedIn URL detected: ${this.hasLinkedIn ? 'yes' : 'no'}`,
      `GitHub/portfolio URL detected: ${this.hasGitHub ? 'yes' : 'no'}`,
      `Other links detected: ${this.otherLinks.length}`,
      `Quantified metrics found (numbers/%/$/scale words): ${this.metricCount}`,
      `Section headers recognized: ${this.sectionsFound.length ? this.sectionsFound.join(', ') : 'NONE RECOGNIZED'}`,
      `Weak/passive phrases found: ${this.weakPhraseHits.length ? this.weakPhraseHits.join(', ') : 'none'}`,
    ];
    return lines.join('\n');
  }
}

/**
 * Extracts text and signals directly in the browser from a PDF File or ArrayBuffer.
 * @param {File|ArrayBuffer|Uint8Array} fileInput
 * @returns {Promise<ParsedResume>}
 */
export async function extractTextFromPdf(fileInput) {
  let arrayBuffer;
  if (fileInput instanceof ArrayBuffer) {
    arrayBuffer = fileInput;
  } else if (fileInput.arrayBuffer) {
    arrayBuffer = await fileInput.arrayBuffer();
  } else if (fileInput.buffer) {
    arrayBuffer = fileInput.buffer;
  } else {
    throw new Error("Invalid file input: must be a File or ArrayBuffer.");
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true
  });

  let pdf;
  try {
    pdf = await loadingTask.promise;
  } catch (err) {
    console.error("PDF loading error:", err);
    throw new Error("Could not read this PDF. It may be corrupted or password-protected.");
  }

  const pageCount = pdf.numPages;
  const pageTexts = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    
    // Sort text items to preserve layout order
    const items = content.items || [];
    // Group items by vertical position (Y), then horizontal (X)
    let lastY = null;
    let pageLines = [];
    let currentLine = [];

    items.forEach(item => {
      const transform = item.transform;
      const y = transform ? Math.round(transform[5]) : 0;
      const str = item.str || "";

      if (lastY === null || Math.abs(y - lastY) > 5) {
        if (currentLine.length > 0) {
          pageLines.push(currentLine.join(" "));
        }
        currentLine = [str];
        lastY = y;
      } else {
        currentLine.push(str);
      }
    });

    if (currentLine.length > 0) {
      pageLines.push(currentLine.join(" "));
    }

    const pageStr = pageLines.join("\n");
    pageTexts.push(pageStr);
  }

  let rawText = pageTexts.join("\n").trim();
  // Strip CID font encoding artifacts (e.g. bullet glyphs)
  rawText = rawText.replace(CID_ARTIFACT_RE, "- ");

  if (!rawText || rawText.trim().length === 0) {
    throw new Error(
      "No extractable text found in this PDF. It may be a scanned image " +
      "or built entirely from graphics, which most ATS systems also cannot read. " +
      "This is itself an important ATS-compatibility flaw worth flagging."
    );
  }

  return new ParsedResume(rawText, pageCount, pageTexts);
}
