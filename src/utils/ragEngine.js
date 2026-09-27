/**
 * ragEngine.js
 * Client-side TF-IDF vectorizer and Cosine Similarity retrieval engine.
 * Fully mirrors rag_engine.py entirely in the browser.
 */

import { KNOWLEDGE_BASE, CATEGORIES } from './knowledgeBase.js';

// Common English stopwords
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t',
  'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having',
  'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its',
  'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t',
  'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d',
  'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
  'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t',
  'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

function tokenize(text) {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));

  const tokens = [...words];
  // Add bigrams
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]} ${words[i + 1]}`);
  }
  return tokens;
}

export class ResumeRAG {
  constructor(chunks = KNOWLEDGE_BASE) {
    this.chunks = chunks;
    this.vocabulary = new Map(); // term -> index
    this.idf = [];
    this.docVectors = [];
    this.categoryIndices = {};

    CATEGORIES.forEach(cat => {
      this.categoryIndices[cat] = [];
    });

    this.fit();
  }

  fit() {
    const docTokensList = [];
    const df = new Map();

    // Tokenize all KB documents
    this.chunks.forEach((chunk, docIdx) => {
      const tokens = tokenize(chunk.text);
      docTokensList.push(tokens);

      const uniqueTerms = new Set(tokens);
      uniqueTerms.forEach(term => {
        df.set(term, (df.get(term) || 0) + 1);
      });

      if (!this.categoryIndices[chunk.category]) {
        this.categoryIndices[chunk.category] = [];
      }
      this.categoryIndices[chunk.category].push(docIdx);
    });

    // Build vocabulary
    let termIdx = 0;
    df.forEach((docCount, term) => {
      this.vocabulary.set(term, termIdx);
      // Smoothed IDF: log((N + 1) / (df + 1)) + 1
      const idfVal = Math.log((this.chunks.length + 1) / (docCount + 1)) + 1;
      this.idf[termIdx] = idfVal;
      termIdx++;
    });

    // Build TF-IDF vectors for KB docs
    this.docVectors = docTokensList.map(tokens => this.vectorize(tokens));
  }

  vectorize(tokens) {
    const tf = new Map();
    tokens.forEach(t => {
      if (this.vocabulary.has(t)) {
        tf.set(t, (tf.get(t) || 0) + 1);
      }
    });

    const vec = new Map();
    let normSq = 0;

    tf.forEach((count, term) => {
      const idx = this.vocabulary.get(term);
      const tfVal = count; // Raw term frequency
      const tfidf = tfVal * this.idf[idx];
      vec.set(idx, tfidf);
      normSq += tfidf * tfidf;
    });

    const norm = Math.sqrt(normSq) || 1;
    // Normalize to unit vector for fast dot-product cosine similarity
    const normalized = new Map();
    vec.forEach((val, idx) => {
      normalized.set(idx, val / norm);
    });

    return normalized;
  }

  cosineSimilarity(vecA, vecB) {
    let dot = 0;
    // Iterate over smaller vector
    const [smaller, larger] = vecA.size < vecB.size ? [vecA, vecB] : [vecB, vecA];
    smaller.forEach((val, idx) => {
      if (larger.has(idx)) {
        dot += val * larger.get(idx);
      }
    });
    return dot;
  }

  /**
   * Retrieves top_k rules per category matching the resume text.
   */
  retrieve(resumeText, topKPerCategory = 3) {
    const queryTokens = tokenize(resumeText);
    const queryVec = this.vectorize(queryTokens);
    const results = {};

    CATEGORIES.forEach(cat => {
      const indices = this.categoryIndices[cat] || [];
      const ranked = indices.map(docIdx => {
        const sim = this.cosineSimilarity(queryVec, this.docVectors[docIdx]);
        return {
          id: this.chunks[docIdx].id,
          category: this.chunks[docIdx].category,
          text: this.chunks[docIdx].text,
          score: Math.round(sim * 10000) / 10000,
          docIdx
        };
      });

      ranked.sort((a, b) => b.score - a.score);
      results[cat] = ranked.slice(0, topKPerCategory);
    });

    return results;
  }

  asPromptContext(resumeText) {
    const retrieved = this.retrieve(resumeText);
    const lines = [];
    for (const [cat, chunks] of Object.entries(retrieved)) {
      if (!chunks.length) continue;
      lines.push(`\n[${cat.replace(/_/g, ' ')}]`);
      chunks.forEach(c => {
        lines.push(`- (${c.id}, relevance=${c.score}) ${c.text}`);
      });
    }
    return lines.join('\n');
  }
}

export const rag = new ResumeRAG();
