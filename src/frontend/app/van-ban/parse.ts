/* Parse legal markdown (frontmatter already stripped by backend) into
   chapters/articles for display. Mirrors the backend heading convention:
   H1 = law title, H2 = chapter, H3 = article ("### Điều X. ..."). */

export interface LegalArticle {
  anchorId: string;
  heading: string;
  /** "472" from "Điều 472. Lãi suất", or null when heading is not an Điều. */
  dieuNum: string | null;
  lines: string[];
}

export interface LegalChapter {
  anchorId: string;
  heading: string;
  introLines: string[];
  articles: LegalArticle[];
}

export interface ParsedLegalDoc {
  lawTitle: string | null;
  preambleLines: string[];
  chapters: LegalChapter[];
}

const RE_DIEU = /^Điều\s+(\d+[a-zA-Z]?)/;

function cleanLine(line: string): string {
  return line.replace(/\s+$/, "");
}

export function parseLegalMarkdown(content: string): ParsedLegalDoc {
  const doc: ParsedLegalDoc = { lawTitle: null, preambleLines: [], chapters: [] };
  const anchorCounts = new Map<string, number>();

  const uniqueAnchor = (base: string): string => {
    const count = (anchorCounts.get(base) ?? 0) + 1;
    anchorCounts.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };

  let chapter: LegalChapter | null = null;
  let article: LegalArticle | null = null;

  const ensureChapter = (): LegalChapter => {
    if (!chapter) {
      chapter = {
        anchorId: uniqueAnchor("chuong"),
        heading: "",
        introLines: [],
        articles: [],
      };
      doc.chapters.push(chapter);
    }
    return chapter;
  };

  for (const raw of content.split("\n")) {
    const line = cleanLine(raw);

    if (line.startsWith("### ")) {
      const heading = line.slice(4).trim();
      const dieuMatch = RE_DIEU.exec(heading);
      const dieuNum = dieuMatch ? dieuMatch[1].toLowerCase() : null;
      article = {
        anchorId: uniqueAnchor(dieuNum ? `dieu-${dieuNum}` : "muc"),
        heading,
        dieuNum,
        lines: [],
      };
      ensureChapter().articles.push(article);
      continue;
    }
    if (line.startsWith("## ")) {
      article = null;
      chapter = {
        anchorId: uniqueAnchor("chuong"),
        heading: line.slice(3).trim(),
        introLines: [],
        articles: [],
      };
      doc.chapters.push(chapter);
      continue;
    }
    if (line.startsWith("# ")) {
      if (!doc.lawTitle) doc.lawTitle = line.slice(2).trim();
      continue;
    }

    if (!line.trim()) continue;
    if (article) {
      article.lines.push(line.trim());
    } else if (chapter) {
      chapter.introLines.push(line.trim());
    } else {
      doc.preambleLines.push(line.trim());
    }
  }

  return doc;
}

/** Find the article matching an "Điều" number (e.g. "472"). */
export function findArticleAnchor(doc: ParsedLegalDoc, dieu: string): string | null {
  const wanted = dieu.trim().toLowerCase();
  for (const chapter of doc.chapters) {
    for (const article of chapter.articles) {
      if (article.dieuNum === wanted) return article.anchorId;
    }
  }
  return null;
}
