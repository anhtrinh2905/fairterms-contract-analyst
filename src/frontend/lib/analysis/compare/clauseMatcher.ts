import type { Article, Paragraph } from "@/app/fairterms/lib/data";

export type ClauseChangeKind = "unchanged" | "modified" | "added" | "removed";

export interface ClauseDiffEntry {
  kind: ClauseChangeKind;
  /** Article number as displayed: the NEW side for matched/added, the OLD side for removed. */
  articleNo: string;
  /**
   * Article number the paragraph had on the OLD side (null for added clauses).
   * Kept separately from `articleNo` because a clause can be renumbered between
   * versions — the prior verdict was stored under the OLD number, so a lookup
   * must key off this, not the (possibly renumbered) display number.
   */
  oldArticleNo: string | null;
  articleTitle: string;
  oldParagraph: Paragraph | null;
  newParagraph: Paragraph | null;
  /** Word-overlap similarity in [0, 1] between oldParagraph and newParagraph; null when one side is missing. */
  similarity: number | null;
}

export interface ClauseDiffSummary {
  unchanged: number;
  modified: number;
  added: number;
  removed: number;
}

export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Canonical article-number key: case- and trailing-punctuation-insensitive so
 * that "ĐIỀU 5", "Điều 5:" and "điều 5." all collapse to the same value. A
 * second OCR pass frequently re-cases or re-punctuates headers; without this,
 * every article would look renumbered and the whole contract would diff as
 * removed + added.
 */
function normalizeArticleNo(articleNo: string): string {
  return articleNo
    .trim()
    .toLowerCase()
    .replace(/[\s.:)\]]+$/g, "")
    .replace(/\s+/g, " ");
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  );
}

/**
 * Dice coefficient over word sets. Cheap and diacritic-safe — good enough to
 * align paragraphs across two independent OCR passes of the same contract,
 * where whitespace/line-break noise (not wording) is the main source of drift.
 */
function textSimilarity(a: string, b: string): number {
  if (normalizeText(a) === normalizeText(b)) return 1;
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const token of setA) {
    if (setB.has(token)) shared++;
  }
  return (2 * shared) / (setA.size + setB.size);
}

// Two paragraphs below this word-overlap are treated as unrelated (a separate
// remove + add) rather than as an edit of one another. Distinct legal clauses
// share boilerplate ("Bên A", "hợp đồng", …) but sit comfortably below this;
// the same clause seen across two OCR passes — even with noise — sits well above.
const PAIR_MIN_SIMILARITY = 0.4;
// A paragraph that keeps the same article number gets a small preference so
// near-duplicate clauses in different articles don't cross-match. Tie-breaker
// only — it never lets a below-threshold pair through.
const SAME_ARTICLE_BONUS = 0.05;

interface FlatParagraph {
  articleNo: string;
  articleTitle: string;
  paragraph: Paragraph;
}

function flatten(articles: Article[]): FlatParagraph[] {
  return articles.flatMap((article) =>
    article.paragraphs.map((paragraph) => ({
      articleNo: article.so_dieu.trim(),
      articleTitle: article.tieu_de,
      paragraph,
    })),
  );
}

/**
 * Align paragraphs between an old and a new version of the same contract.
 *
 * Matching is GLOBAL and driven by text similarity, not by article number:
 * every old paragraph is compared against every new paragraph and the best
 * mutually-available pairs (word-overlap ≥ PAIR_MIN_SIMILARITY) are taken
 * greedily. The article number is only a tie-breaker (SAME_ARTICLE_BONUS).
 *
 * This is deliberately robust to the two contracts having been OCR'd/structured
 * in separate passes: re-cased headers, renumbered articles, or a paragraph
 * that got regrouped under a different article no longer break the alignment —
 * so the same clause across two passes reads as "unchanged/modified" instead of
 * a spurious "removed + added".
 */
export function matchClauses(oldArticles: Article[], newArticles: Article[]): ClauseDiffEntry[] {
  const oldFlat = flatten(oldArticles);
  const newFlat = flatten(newArticles);

  interface Candidate {
    i: number;
    j: number;
    score: number;
    rank: number;
  }
  const candidates: Candidate[] = [];
  for (let i = 0; i < oldFlat.length; i++) {
    for (let j = 0; j < newFlat.length; j++) {
      const score = textSimilarity(oldFlat[i].paragraph.text, newFlat[j].paragraph.text);
      if (score < PAIR_MIN_SIMILARITY) continue;
      const sameArticle =
        normalizeArticleNo(oldFlat[i].articleNo) === normalizeArticleNo(newFlat[j].articleNo);
      candidates.push({ i, j, score, rank: score + (sameArticle ? SAME_ARTICLE_BONUS : 0) });
    }
  }
  candidates.sort((a, b) => b.rank - a.rank);

  const matchedOldOfNew = new Array<number>(newFlat.length).fill(-1);
  const usedOld = new Set<number>();
  const usedNew = new Set<number>();
  for (const { i, j } of candidates) {
    if (usedOld.has(i) || usedNew.has(j)) continue;
    usedOld.add(i);
    usedNew.add(j);
    matchedOldOfNew[j] = i;
  }

  const makeMatched = (i: number, j: number): ClauseDiffEntry => {
    const o = oldFlat[i];
    const n = newFlat[j];
    const score = textSimilarity(o.paragraph.text, n.paragraph.text);
    return {
      kind: score === 1 ? "unchanged" : "modified",
      articleNo: n.articleNo,
      oldArticleNo: o.articleNo,
      articleTitle: n.articleTitle,
      oldParagraph: o.paragraph,
      newParagraph: n.paragraph,
      similarity: score,
    };
  };
  const makeAdded = (n: FlatParagraph): ClauseDiffEntry => ({
    kind: "added",
    articleNo: n.articleNo,
    oldArticleNo: null,
    articleTitle: n.articleTitle,
    oldParagraph: null,
    newParagraph: n.paragraph,
    similarity: null,
  });
  const makeRemoved = (o: FlatParagraph): ClauseDiffEntry => ({
    kind: "removed",
    articleNo: o.articleNo,
    oldArticleNo: o.articleNo,
    articleTitle: o.articleTitle,
    oldParagraph: o.paragraph,
    newParagraph: null,
    similarity: null,
  });

  // Emit in NEW document order (matched + added), flushing each removed old
  // paragraph roughly where it used to sit (between its matched neighbours),
  // so the result still reads top-to-bottom like the revised contract.
  const entries: ClauseDiffEntry[] = [];
  let lastOldEmitted = -1;
  const flushRemovedUpTo = (oldBound: number) => {
    for (let i = lastOldEmitted + 1; i < oldBound; i++) {
      if (!usedOld.has(i)) entries.push(makeRemoved(oldFlat[i]));
    }
  };
  for (let j = 0; j < newFlat.length; j++) {
    const i = matchedOldOfNew[j];
    if (i >= 0) {
      flushRemovedUpTo(i);
      entries.push(makeMatched(i, j));
      lastOldEmitted = i;
    } else {
      entries.push(makeAdded(newFlat[j]));
    }
  }
  // Any removed paragraphs after the last matched one (or all of them, if
  // nothing matched) come last.
  for (let i = lastOldEmitted + 1; i < oldFlat.length; i++) {
    if (!usedOld.has(i)) entries.push(makeRemoved(oldFlat[i]));
  }

  return entries;
}

export function summarizeClauseDiff(entries: ClauseDiffEntry[]): ClauseDiffSummary {
  const summary: ClauseDiffSummary = { unchanged: 0, modified: 0, added: 0, removed: 0 };
  for (const entry of entries) {
    summary[entry.kind]++;
  }
  return summary;
}
