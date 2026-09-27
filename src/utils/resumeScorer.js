/**
 * resumeScorer.js
 * Computes multi-dimensional scores, recruiter verdicts, and the complete response payload.
 */

export function calculateScore(parsed, analysis) {
  // 1. Content & Impact (35 points max)
  let contentScore = 0;
  if (parsed.metricCount >= 6) {
    contentScore += 35;
  } else if (parsed.metricCount >= 3) {
    contentScore += 24;
  } else if (parsed.metricCount >= 1) {
    contentScore += 14;
  } else {
    contentScore += 4; // Severe penalty for zero metrics (ci04)
  }

  // Action verbs bonus / weak verbs deduction
  contentScore += Math.min(6, parsed.actionVerbsFound.length * 1.5);
  contentScore -= parsed.weakPhraseHits.length * 4;
  contentScore = Math.max(0, Math.min(35, contentScore));

  // 2. ATS & Formatting (25 points max)
  const atsComponent = (analysis.atsScore / 100) * 25;

  // 3. Skills & Categorization (15 points max)
  let skillsScore = parsed.sectionsFound.includes("skills") ? 15 : 4;
  skillsScore -= parsed.buzzwordHits.length * 2.5;
  skillsScore = Math.max(2, Math.min(15, skillsScore));

  // 4. Experience & Structure (15 points max)
  let expScore = parsed.sectionsFound.includes("experience") ? 12 : 2;
  if (parsed.bulletCount >= 4) expScore += 3;
  if (parsed.pageCount > 2) expScore -= 4;
  expScore = Math.max(2, Math.min(15, expScore));

  // 5. Education & Contact (10 points max)
  let contactScore = 0;
  if (parsed.hasEmail) contactScore += 3;
  if (parsed.hasPhone) contactScore += 2;
  if (parsed.hasLinkedIn) contactScore += 2;
  if (parsed.sectionsFound.includes("education")) contactScore += 3;
  contactScore = Math.max(0, Math.min(10, contactScore));

  // Raw Total (0 - 100)
  let totalScore = Math.round(contentScore + atsComponent + skillsScore + expScore + contactScore);
  totalScore = Math.max(5, Math.min(98, totalScore));

  // Verdict determination
  let verdict = "Likely Rejected";
  let verdictReason = "";

  if (totalScore >= 85) {
    verdict = "Likely Accepted";
    verdictReason = `Strong candidate profile with ${parsed.metricCount} quantified impact metrics, clean ATS-compliant structure, and decisive action-oriented achievements.`;
  } else if (totalScore >= 50) {
    verdict = "Borderline";
    verdictReason = `Solid professional foundation with recognized core sections, but compromised by ${parsed.metricCount === 0 ? 'a total lack of measurable metrics' : 'limited metric density'} and ${parsed.weakPhraseHits.length ? 'passive duty-oriented phrasing' : 'minor ATS formatting risks'}.`;
  } else {
    verdict = "Likely Rejected";
    verdictReason = `High screening rejection risk: ${parsed.metricCount === 0 ? 'zero quantified metrics' : 'low impact evidence'}, ${parsed.weakPhraseHits.length ? 'heavy reliance on passive phrasing ("' + parsed.weakPhraseHits[0] + '")' : 'critical ATS structural issues'}, and missing essential recruiter signals.`;
  }

  return {
    overall_score: totalScore,
    verdict: verdict,
    verdict_reason: verdictReason,
    ats_compatibility: {
      score: analysis.atsScore,
      issues: analysis.atsIssues
    },
    strengths: analysis.strengths,
    flaws: analysis.flaws,
    missing_quantification_examples: analysis.missingQuantificationExamples,
    section_feedback: analysis.sectionFeedback,
    top_3_priority_fixes: analysis.topPriorityFixes,
    breakdown: {
      content: { score: Math.round(contentScore), max: 35, label: "Content & Impact" },
      ats: { score: Math.round(atsComponent), max: 25, label: "ATS Formatting & Structure" },
      skills: { score: Math.round(skillsScore), max: 15, label: "Skills & Keywords" },
      experience: { score: Math.round(expScore), max: 15, label: "Experience & Chronology" },
      contact: { score: Math.round(contactScore), max: 10, label: "Contact & Online Profiles" }
    },
    _meta: {
      model_used: "The Resume Desk Client Engine (TF-IDF RAG)",
      page_count: parsed.pageCount,
      word_count: parsed.wordCount,
      bullet_count: parsed.bulletCount,
      metric_mentions_found: parsed.metricCount,
      sections_recognized: parsed.sectionsFound
    }
  };
}
