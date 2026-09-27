/**
 * resumeAnalyzer.js
 * In-browser screening and diagnostic engine.
 * Evaluates document signals and extracted text against the RAG rulebook.
 */

import { rag } from './ragEngine.js';
import { METRIC_RE, WEAK_VERBS } from './resumeParser.js';

export function analyzeResume(parsed) {
  const retrievedRules = rag.retrieve(parsed.rawText, 3);

  const atsIssues = [];
  const strengths = [];
  const flaws = [];
  const missingQuantificationExamples = [];
  const topPriorityFixes = [];

  const rawLower = parsed.rawText.toLowerCase();

  // ==========================================
  // 1. ATS COMPATIBILITY DIAGNOSTICS
  // ==========================================
  let atsScoreDeductions = 0;

  // Contact info in body
  if (!parsed.hasEmail) {
    atsIssues.push("No email address detected in parseable text. Many ATS parsers reject profiles without an identifiable email (af05, sc01).");
    flaws.push({
      issue: "Missing parseable email address",
      severity: "Critical",
      fix: "Add a clear professional email in the top contact header (sc01)."
    });
    atsScoreDeductions += 25;
  }

  if (!parsed.hasPhone) {
    atsIssues.push("No phone number detected in body text (sc01).");
    flaws.push({
      issue: "Missing phone number in contact information",
      severity: "Major",
      fix: "Include a standardized phone number (e.g., +1 (555) 012-3456) in plain text."
    });
    atsScoreDeductions += 15;
  }

  // Check email professionalism
  if (parsed.hasEmail) {
    const emailPrefix = parsed.email.split('@')[0].toLowerCase();
    const unprofessionalKeywords = ["cool", "sexy", "gamer", "party", "killer", "badboy", "ninja", "guy19", "girl19", "dude"];
    if (unprofessionalKeywords.some(kw => emailPrefix.includes(kw))) {
      flaws.push({
        issue: `Unprofessional email address detected (${parsed.email})`,
        severity: "Major",
        fix: "Replace informal email handles with a professional firstname.lastname@domain.com format (rf02)."
      });
      atsScoreDeductions += 10;
    }
  }

  // LinkedIn and GitHub checks
  if (parsed.hasLinkedIn) {
    strengths.push({
      point: "Verified LinkedIn Profile Link",
      why_it_matters: "Enables recruiters and ATS platforms to immediately cross-reference your online professional presence (sc02)."
    });
  } else {
    flaws.push({
      issue: "No LinkedIn profile URL provided",
      severity: "Minor",
      fix: "Include a clean custom LinkedIn URL (e.g. linkedin.com/in/yourname) in your contact header (sc02)."
    });
    atsScoreDeductions += 5;
  }

  const isTechnical = /developer|engineer|software|python|sql|java|react|api|docker|devops|data/i.test(rawLower);
  if (isTechnical) {
    if (parsed.hasGitHub || parsed.otherLinks.some(l => /github|gitlab|portfolio/i.test(l))) {
      strengths.push({
        point: "Code Repository / Portfolio Link Provided",
        why_it_matters: "Recruiters and hiring managers strongly favor candidates who supply verifiable proof of technical output (sc03)."
      });
    } else {
      flaws.push({
        issue: "Missing GitHub or project portfolio link for a technical candidate",
        severity: "Major",
        fix: "Add your GitHub profile or live project demo links to substantiate technical capabilities (sc03)."
      });
      atsScoreDeductions += 10;
    }
  }

  // Section headers check
  const requiredSections = ["experience", "education", "skills"];
  const missingRequired = requiredSections.filter(s => !parsed.sectionsFound.includes(s));
  if (missingRequired.length > 0) {
    atsIssues.push(`Missing standard section headers: ${missingRequired.join(', ')}. ATS systems rely on exact section labels to index candidate records (af03).`);
    flaws.push({
      issue: `Non-standard or missing core sections: ${missingRequired.join(', ')}`,
      severity: "Critical",
      fix: "Use standard headers like 'EXPERIENCE', 'EDUCATION', and 'SKILLS' rather than creative titles (af03)."
    });
    atsScoreDeductions += 20 * missingRequired.length;
  } else {
    strengths.push({
      point: "Standard ATS Section Hierarchy",
      why_it_matters: "All core sections (Experience, Education, Skills) are explicitly labeled with standard keywords ATS parsers recognize (af03)."
    });
  }

  // Check page count
  if (parsed.pageCount > 2) {
    atsIssues.push(`Resume length is ${parsed.pageCount} pages. Most recruiters spend only 6-8 seconds scanning and favor 1-2 pages (af07).`);
    flaws.push({
      issue: `Excessive resume length (${parsed.pageCount} pages)`,
      severity: "Major",
      fix: "Condense experience to 1-2 pages by trimming older roles and focusing strictly on high-impact accomplishments (af07)."
    });
    atsScoreDeductions += 15;
  } else if (parsed.pageCount === 1) {
    strengths.push({
      point: "Concise One-Page Format",
      why_it_matters: "High information density respecting recruiter scan time; avoids fluff and keeps focus sharp (af07)."
    });
  }

  // ==========================================
  // 2. CONTENT & IMPACT DIAGNOSTICS
  // ==========================================
  const bulletRatio = parsed.bulletCount > 0 ? (parsed.metricCount / parsed.bulletCount) : 0;

  if (parsed.metricCount === 0) {
    flaws.push({
      issue: "Zero quantified impact metrics detected across the entire resume",
      severity: "Critical",
      fix: "Incorporate numbers, percentages, dollar values, or scale metrics into every bullet using the X-Y-Z formula (ci03, ci04)."
    });
  } else if (bulletRatio >= 0.5) {
    strengths.push({
      point: `High Metric Quantification Density (${parsed.metricCount} measurable outcomes found)`,
      why_it_matters: "Measurable metrics (%, $, scale, users, latency) substantiate claims and prove concrete business value (ci03)."
    });
  } else {
    flaws.push({
      issue: `Low metric density (${parsed.metricCount} metrics across ${parsed.bulletCount} bullet points)`,
      severity: "Major",
      fix: "Add quantifiable measurements (percentages, revenue, time saved, team size) to at least 60% of your experience bullets (ci03)."
    });
  }

  // Weak/passive phrasing vs strong action verbs
  if (parsed.weakPhraseHits.length > 0) {
    flaws.push({
      issue: `Passive or responsibility-based language found: "${parsed.weakPhraseHits.join('", "')}"`,
      severity: "Major",
      fix: "Replace passive phrases like 'responsible for' or 'helped with' with active ownership verbs like 'Led', 'Architected', or 'Overhauled' (ci01, ci02)."
    });
  }

  if (parsed.actionVerbsFound.length >= 4) {
    strengths.push({
      point: `Strong Action Verb Usage (${parsed.actionVerbsFound.slice(0, 5).join(', ')}…)`,
      why_it_matters: "Beginning bullets with proactive, decisive verbs communicates ownership and leadership (ci02)."
    });
  } else {
    flaws.push({
      issue: "Limited variety of strong action verbs at the start of bullets",
      severity: "Minor",
      fix: "Begin every bullet point with a decisive past-tense action verb (ci02, ci10)."
    });
  }

  // Buzzword detection
  if (parsed.buzzwordHits.length >= 2) {
    flaws.push({
      issue: `Overuse of unsubstantiated buzzwords: "${parsed.buzzwordHits.join('", "')}"`,
      severity: "Minor",
      fix: "Remove generic buzzwords ('team player', 'go-getter', 'hardworking') and replace them with concrete project evidence (ci05)."
    });
  }

  // Objective statement vs Executive Summary
  if (/objective/i.test(parsed.rawText) && !/summary/i.test(parsed.rawText)) {
    flaws.push({
      issue: "Use of outdated 'Objective' section instead of a Professional Summary",
      severity: "Minor",
      fix: "Replace 'Objective' (which focuses on candidate desires) with a 2-3 sentence executive 'Summary' showcasing candidate value (ci08)."
    });
  } else if (/summary/i.test(parsed.rawText)) {
    strengths.push({
      point: "Dedicated Professional Summary",
      why_it_matters: "A succinct summary immediately orients the recruiter to your domain focus and core value proposition (ci08)."
    });
  }

  // Skills categorization check
  if (parsed.sectionsFound.includes("skills")) {
    const skillsText = parsed.sectionMap.skills || "";
    if (/(languages|frameworks|tools|databases|cloud|libraries):/i.test(skillsText)) {
      strengths.push({
        point: "Categorized Technical Skills Section",
        why_it_matters: "Grouping skills into logical categories (Languages, Frameworks, Cloud, Data) optimizes scan efficiency for technical screeners (sk05)."
      });
    } else if (skillsText.split(',').length > 12) {
      flaws.push({
        issue: "Uncategorized wall of skills",
        severity: "Minor",
        fix: "Group skills into distinct subcategories (e.g. Languages, Frameworks, Cloud & Tools) rather than an undifferentiated list (sk05)."
      });
    }
  }

  // Outdated technologies check
  const outdated = ["flash", "actionscript", "jquery", "visual basic 6", "frontpage"].filter(t => rawLower.includes(t));
  if (outdated.length > 0) {
    flaws.push({
      issue: `Outdated technologies listed (${outdated.join(', ')})`,
      severity: "Minor",
      fix: "Remove deprecated technologies from your skills list to avoid signaling an outdated skill set (sk03)."
    });
  }

  // Interests / hobbies check
  if (/interests|hobbies/i.test(rawLower)) {
    const interestSection = parsed.sectionMap.other || "";
    if (/video games|movies|hang(ing)? out|partying/i.test(interestSection)) {
      flaws.push({
        issue: "Informal or irrelevant personal hobbies included",
        severity: "Minor",
        fix: "Remove casual interests ('video games', 'watching movies') to save valuable real estate for professional achievements (rf04)."
      });
    }
  }

  // ==========================================
  // 3. REWRITE EXAMPLES GENERATOR
  // ==========================================
  // Find real bullets from the candidate's resume that lack numbers or use weak phrasing
  const candidatesForRewrite = parsed.bullets.filter(b => {
    const hasMetric = METRIC_RE.test(b);
    const hasWeak = WEAK_VERBS.some(w => b.toLowerCase().includes(w));
    return !hasMetric || hasWeak;
  });

  const selectedForRewrite = candidatesForRewrite.slice(0, 3);
  selectedForRewrite.forEach(b => {
    let rewritten = b;
    // Replace weak opener
    WEAK_VERBS.forEach(wv => {
      const reg = new RegExp(`^${wv}\\s+`, 'i');
      if (reg.test(rewritten)) {
        rewritten = rewritten.replace(reg, "Led and executed ");
      }
    });

    if (/social media/i.test(b)) {
      rewritten = "Spearheaded multi-channel social media campaigns across 4 platforms, increasing organic engagement by 38% and driving 15k+ monthly website visits.";
    } else if (/email/i.test(b)) {
      rewritten = "Engineered targeted email marketing automation workflows for 25k+ subscribers, boosting click-through rates from 2.1% to 4.8%.";
    } else if (/excel|reporting|spreadsheet/i.test(b)) {
      rewritten = "Built automated financial models and reporting dashboards in Excel, saving 8 hours/week across 3 departments.";
    } else if (/website|web/i.test(b)) {
      rewritten = "Redesigned core company web pages, reducing bounce rate by 22% and improving page load times by 1.4s.";
    } else if (/sales|store|floor/i.test(b)) {
      rewritten = "Consistently exceeded quarterly retail sales targets by 15-20%, generating $140,000 in monthly merchandise revenue.";
    } else if (/inventory/i.test(b)) {
      rewritten = "Overhauled inventory tracking process across 1,200+ SKUs, reducing discrepancy rates from 6.5% to under 0.8%.";
    } else if (/customer/i.test(b)) {
      rewritten = "Resolved 60+ customer inquiries daily while maintaining a 96% positive satisfaction rating across 12 consecutive months.";
    } else {
      rewritten = `Led initiative: "${b.replace(/[.]+$/, '')}", resulting in a 25% efficiency gain and saving an estimated 10 hours/week.`;
    }

    missingQuantificationExamples.push(`Original: "${b}" ➔ Rewrite Example: "${rewritten}"`);
  });

  // If no weak bullets found (e.g. already strong resume), leave empty or provide optimization tip
  if (missingQuantificationExamples.length === 0 && parsed.bulletCount > 0) {
    // Keep it empty as per guidelines for clean files
  }

  // ==========================================
  // 4. SECTION FEEDBACK SUMMARY
  // ==========================================
  const sectionFeedback = {
    summary: parsed.sectionsFound.includes("summary")
      ? "Professional summary is present and clearly articulates domain experience and career focus."
      : parsed.sectionsFound.includes("objective")
      ? "Objective statement is present, but modern recruiting standards strongly favor a value-oriented Professional Summary instead."
      : "Not present. Adding a 2-3 sentence executive summary at the top helps recruiters immediately grasp your primary value proposition.",

    experience: parsed.sectionsFound.includes("experience")
      ? (parsed.metricCount > 4 && parsed.weakPhraseHits.length === 0)
        ? `Strong experience section. Features ${parsed.metricCount} quantified metrics and decisive action verbs demonstrating ownership.`
        : `Experience section has clear chronological entries, but needs higher metric density and elimination of passive phrases (${parsed.weakPhraseHits.length ? parsed.weakPhraseHits.join(', ') : 'none detected'}).`
      : "Not present. A dedicated 'Experience' or 'Work Experience' section is mandatory for ATS indexing.",

    skills: parsed.sectionsFound.includes("skills")
      ? (parsed.buzzwordHits.length > 1)
        ? `Skills section is present but diluted with subjective soft-skill buzzwords (${parsed.buzzwordHits.join(', ')}). Group by technical category instead.`
        : "Skills section is well structured with relevant industry tooling and technical proficiencies."
      : "Not present. Include an explicit 'Skills' section with categorized competencies.",

    education: parsed.sectionsFound.includes("education")
      ? "Education credentials are clearly displayed with degree and institution."
      : "Not present. Standard ATS rules require an explicit Education section with institution and graduation details.",

    formatting: (parsed.pageCount <= 2 && parsed.bulletCount > 0 && atsIssues.length === 0)
      ? "Clean, ATS-compliant layout. Standard page length, readable font structure, and clear bulleted hierarchy."
      : `Formatting has ${atsIssues.length} potential ATS hurdles. Ensure single/two column linear flow, standard section headers, and consistent date formatting.`
  };

  // ==========================================
  // 5. TOP PRIORITY FIXES
  // ==========================================
  const criticalFlaws = flaws.filter(f => f.severity === "Critical");
  const majorFlaws = flaws.filter(f => f.severity === "Major");
  const minorFlaws = flaws.filter(f => f.severity === "Minor");

  const rankedFlaws = [...criticalFlaws, ...majorFlaws, ...minorFlaws];
  rankedFlaws.slice(0, 3).forEach(f => {
    topPriorityFixes.push(`${f.issue}: ${f.fix}`);
  });

  // Calculate ATS Score
  const atsScore = Math.max(10, Math.min(100, 100 - atsScoreDeductions));

  return {
    atsScore,
    atsIssues,
    strengths,
    flaws,
    missingQuantificationExamples,
    sectionFeedback,
    topPriorityFixes,
    retrievedRules
  };
}
