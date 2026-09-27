import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ParsedResume, SECTION_KEYWORDS, EMAIL_RE, PHONE_RE, LINKEDIN_RE, GITHUB_RE, URL_RE, METRIC_RE, BULLET_RE, CID_ARTIFACT_RE, WEAK_VERBS, STRONG_ACTION_VERBS, BUZZWORDS } from './src/utils/resumeParser.js';
import { analyzeResume } from './src/utils/resumeAnalyzer.js';
import { calculateScore } from './src/utils/resumeScorer.js';

async function parsePdfNode(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true
  });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const pageTexts = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items || [];
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

    pageTexts.push(pageLines.join("\n"));
  }

  let rawText = pageTexts.join("\n").trim();
  rawText = rawText.replace(CID_ARTIFACT_RE, "- ");
  return new ParsedResume(rawText, pageCount, pageTexts);
}

async function runTest() {
  console.log("=== TESTING SARAH NGUYEN (EXPECTED: ACCEPTED) ===");
  const sarahParsed = await parsePdfNode('./public/samples/Sarah_Nguyen.pdf');
  console.log("Sarah Signals:");
  console.log(sarahParsed.toSignalBlock());
  const sarahAnalysis = analyzeResume(sarahParsed);
  const sarahResult = calculateScore(sarahParsed, sarahAnalysis);
  console.log("\nVerdict:", sarahResult.verdict);
  console.log("Overall Score:", sarahResult.overall_score);
  console.log("ATS Score:", sarahResult.ats_compatibility.score);
  console.log("Strengths Count:", sarahResult.strengths.length);
  console.log("Flaws Count:", sarahResult.flaws.length);
  console.log("Verdict Reason:", sarahResult.verdict_reason);

  console.log("\n=== TESTING JOHN CARTER (EXPECTED: REJECTED) ===");
  const johnParsed = await parsePdfNode('./public/samples/John_Carter.pdf');
  console.log("John Signals:");
  console.log(johnParsed.toSignalBlock());
  const johnAnalysis = analyzeResume(johnParsed);
  const johnResult = calculateScore(johnParsed, johnAnalysis);
  console.log("\nVerdict:", johnResult.verdict);
  console.log("Overall Score:", johnResult.overall_score);
  console.log("ATS Score:", johnResult.ats_compatibility.score);
  console.log("Strengths Count:", johnResult.strengths.length);
  console.log("Flaws Count:", johnResult.flaws.length);
  console.log("Rewrites Generated:", johnResult.missing_quantification_examples.length);
  console.log("Sample Rewrite:", johnResult.missing_quantification_examples[0]);
  console.log("Verdict Reason:", johnResult.verdict_reason);
}

runTest().catch(console.error);
