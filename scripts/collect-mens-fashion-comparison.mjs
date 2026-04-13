#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_KEYWORDS = [
  "台男 穿搭",
  "台男 韓國",
  "台男 日本",
  "台男 日男 穿搭",
  "台男 韓男 穿搭",
  "台男 韓星",
  "台男 日星",
  "台男 模特",
  "台灣男生 穿搭",
  "台灣男生 日本男生 穿搭",
  "台灣男生 韓國男生 穿搭",
  "台男 韓系 穿搭",
  "台男 日系 穿搭",
  "台灣 男生 日韓 穿搭",
];

const DEFAULT_PTT_BOARDS = [
  "WomenTalk",
  "Boy-Girl",
  "MenTalk",
  "Mix_Match",
  "Mancare",
  "Gossiping",
];

const SOURCE_LABEL = {
  ptt: "PTT",
  dcard: "Dcard",
};

const USER_AGENT =
  "public-discussion-mvp-research-bot/0.1 (+https://github.com/u110008003-ai/MVP; contact: research use only)";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const options = {
    sources: ["ptt", "dcard"],
    keywords: DEFAULT_KEYWORDS,
    pttBoards: DEFAULT_PTT_BOARDS,
    limitPerQuery: 10,
    outDir: "research/mens-fashion-comparison/output",
    delayMs: 900,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--source" && next) {
      options.sources = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    } else if (arg === "--keywords" && next) {
      options.keywords = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    } else if (arg === "--ptt-boards" && next) {
      options.pttBoards = next.split(",").map((item) => item.trim()).filter(Boolean);
      index += 1;
    } else if (arg === "--limit" && next) {
      options.limitPerQuery = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === "--out" && next) {
      options.outDir = next;
      index += 1;
    } else if (arg === "--delay" && next) {
      options.delayMs = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Usage:
  npm.cmd run research:mens-fashion -- --source ptt,dcard --limit 10

Options:
  --source       Sources to collect: ptt,dcard. Default: ptt,dcard
  --keywords     Comma-separated search keywords.
  --ptt-boards   Comma-separated PTT boards. Default: ${DEFAULT_PTT_BOARDS.join(",")}
  --limit        Max posts per keyword per source/board. Default: 10
  --out          Output directory. Default: research/mens-fashion-comparison/output
  --delay        Delay between requests in milliseconds. Default: 900

Notes:
  This script only collects public text metadata/content. It does not download images,
  bypass logins, or solve anti-bot challenges. Dcard may block automated requests.
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const seenUrls = new Set();
  const records = [];

  for (const keyword of options.keywords) {
    if (options.sources.includes("ptt")) {
      for (const board of options.pttBoards) {
        const pttRecords = await collectPtt(keyword, board, options.limitPerQuery, options.delayMs);
        addUnique(records, pttRecords, seenUrls);
      }
    }

    if (options.sources.includes("dcard")) {
      const dcardRecords = await collectDcard(keyword, options.limitPerQuery, options.delayMs);
      addUnique(records, dcardRecords, seenUrls);
    }
  }

  const classified = records.map((record) => ({
    ...record,
    ...classifyRecord(record),
  }));

  await writeOutputs(classified, options.outDir);

  console.log(`Collected ${classified.length} unique records.`);
  console.log(`Output written to ${path.resolve(options.outDir)}`);
}

function addUnique(target, incoming, seenUrls) {
  for (const item of incoming) {
    if (!item.url || seenUrls.has(item.url)) {
      continue;
    }

    seenUrls.add(item.url);
    target.push(item);
  }
}

async function collectPtt(keyword, board, limit, delayMs) {
  const searchUrl = `https://www.ptt.cc/bbs/${encodeURIComponent(board)}/search?q=${encodeURIComponent(keyword)}`;
  const records = [];

  try {
    const searchHtml = await fetchText(searchUrl, {
      Cookie: "over18=1",
      Referer: `https://www.ptt.cc/bbs/${encodeURIComponent(board)}/index.html`,
    });

    const links = [...searchHtml.matchAll(/<div class="title">\s*<a href="([^"]+)">([^<]+)<\/a>/g)]
      .slice(0, limit)
      .map((match) => ({
        title: decodeHtml(match[2]).trim(),
        url: new URL(match[1], "https://www.ptt.cc").toString(),
      }));

    for (const link of links) {
      await sleep(delayMs);
      const articleHtml = await fetchText(link.url, {
        Cookie: "over18=1",
        Referer: searchUrl,
      });
      const article = parsePttArticle(articleHtml);

      records.push({
        source: SOURCE_LABEL.ptt,
        platform: "ptt",
        keyword,
        board,
        title: article.title || link.title,
        url: link.url,
        author: article.author,
        published_at: article.date,
        excerpt: article.content.slice(0, 240),
        content: article.content,
      });
    }
  } catch (error) {
    console.warn(`[PTT] skipped ${board} / ${keyword}: ${error.message}`);
  }

  return records;
}

async function collectDcard(keyword, limit, delayMs) {
  const records = [];
  const searchUrl = `https://www.dcard.tw/service/api/v2/search/posts?query=${encodeURIComponent(keyword)}&limit=${limit}`;

  try {
    const posts = await fetchJson(searchUrl, {
      Referer: `https://www.dcard.tw/search?query=${encodeURIComponent(keyword)}`,
    });

    if (!Array.isArray(posts)) {
      throw new Error("Dcard search did not return a post array.");
    }

    for (const post of posts.slice(0, limit)) {
      await sleep(delayMs);
      const id = String(post.id ?? "");
      const forumAlias = String(post.forumAlias ?? post.forum_alias ?? "topics");
      const url = `https://www.dcard.tw/f/${forumAlias}/p/${id}`;
      const detail = id
        ? await fetchJson(`https://www.dcard.tw/service/api/v2/posts/${id}`, {
            Referer: url,
          }).catch(() => null)
        : null;

      const content = String(detail?.content ?? post.content ?? post.excerpt ?? "");

      records.push({
        source: SOURCE_LABEL.dcard,
        platform: "dcard",
        keyword,
        board: String(post.forumName ?? post.forumAlias ?? ""),
        title: String(post.title ?? ""),
        url,
        author: String(post.school ?? post.department ?? "匿名"),
        published_at: String(post.createdAt ?? ""),
        excerpt: String(post.excerpt ?? content.slice(0, 240)),
        content,
      });
    }
  } catch (error) {
    console.warn(`[Dcard] skipped ${keyword}: ${error.message}`);
  }

  return records;
}

async function fetchText(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

function parsePttArticle(html) {
  const main = html.match(/<div id="main-content"[^>]*>([\s\S]*?)<span class="f2">/);
  const mainContent = main?.[1] ?? html;
  const title = matchMeta(mainContent, "標題");
  const author = matchMeta(mainContent, "作者");
  const date = matchMeta(mainContent, "時間");
  const withoutMeta = mainContent
    .replace(/<div class="article-metaline[\s\S]*?<\/div>/g, "")
    .replace(/<div class="article-metaline-right[\s\S]*?<\/div>/g, "")
    .replace(/<span class="f2">[\s\S]*$/g, "");

  return {
    title,
    author,
    date,
    content: normalizeText(stripHtml(withoutMeta)),
  };
}

function matchMeta(html, label) {
  const regex = new RegExp(
    `<span class="article-meta-tag">${label}<\\/span>\\s*<span class="article-meta-value">([\\s\\S]*?)<\\/span>`,
  );
  return decodeHtml(html.match(regex)?.[1] ?? "").trim();
}

function stripHtml(html) {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, ""),
  );
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeText(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function classifyRecord(record) {
  const text = `${record.title}\n${record.excerpt}\n${record.content}`.toLowerCase();
  const evidenceTerms = [];

  const ordinaryTerms = [
    "普通人",
    "一般人",
    "素人",
    "路人",
    "台男",
    "台灣男",
    "台灣男生",
    "台灣男性",
    "男大生",
  ];
  const celebrityTerms = [
    "明星",
    "藝人",
    "偶像",
    "idol",
    "模特",
    "model",
    "男團",
    "韓星",
    "日星",
    "演員",
    "網紅",
    "穿搭博主",
  ];
  const comparisonTerms = [
    "比",
    "比較",
    "對比",
    "差",
    "贏",
    "輸",
    "像",
    "不如",
    "屌打",
    "吊打",
    "vs",
    "v.s",
  ];
  const targetTerms = ["穿搭", "打扮", "日系", "韓系", "日本男", "韓國男", "日男", "韓男"];

  const ordinaryHit = collectHits(text, ordinaryTerms);
  const celebrityHit = collectHits(text, celebrityTerms);
  const comparisonHit = collectHits(text, comparisonTerms);
  const targetHit = collectHits(text, targetTerms);

  evidenceTerms.push(...ordinaryHit, ...celebrityHit, ...comparisonHit, ...targetHit);

  if (targetHit.length === 0) {
    return {
      category: "irrelevant_or_unclear",
      confidence: 0.15,
      evidence_terms: unique(evidenceTerms).join("|"),
      notes: "沒有明確穿搭或日韓男性比較語境。",
    };
  }

  if (ordinaryHit.length > 0 && celebrityHit.length > 0 && comparisonHit.length > 0) {
    return {
      category: "ordinary_vs_celebrity_or_model",
      confidence: 0.82,
      evidence_terms: unique(evidenceTerms).join("|"),
      notes: "同時出現普通人/台男、明星/模特與比較詞。",
    };
  }

  if (ordinaryHit.length > 0 && comparisonHit.length > 0) {
    return {
      category: "ordinary_vs_ordinary",
      confidence: 0.62,
      evidence_terms: unique(evidenceTerms).join("|"),
      notes: "有普通人/台男與比較詞，但沒有明確明星或模特。",
    };
  }

  if (celebrityHit.length > 0 && comparisonHit.length > 0) {
    return {
      category: "celebrity_or_model_vs_celebrity_or_model",
      confidence: 0.58,
      evidence_terms: unique(evidenceTerms).join("|"),
      notes: "有明星/模特與比較詞，但沒有明確普通人側。",
    };
  }

  return {
    category: "style_discussion_no_clear_subject",
    confidence: 0.45,
    evidence_terms: unique(evidenceTerms).join("|"),
    notes: "像是在討論風格，但比較對象不明確。",
  };
}

function collectHits(text, terms) {
  return terms.filter((term) => text.includes(term.toLowerCase()));
}

function unique(items) {
  return Array.from(new Set(items));
}

async function writeOutputs(records, outDir) {
  await mkdir(outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(outDir, `records-${timestamp}.json`);
  const csvPath = path.join(outDir, `records-${timestamp}.csv`);
  const reportPath = path.join(outDir, `summary-${timestamp}.md`);

  await writeFile(jsonPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  await writeFile(csvPath, toCsv(records), "utf8");
  await writeFile(reportPath, toMarkdownReport(records), "utf8");
}

function toCsv(records) {
  const columns = [
    "source",
    "platform",
    "keyword",
    "board",
    "title",
    "url",
    "published_at",
    "category",
    "confidence",
    "evidence_terms",
    "notes",
  ];

  const rows = records.map((record) =>
    columns.map((column) => csvEscape(record[column] ?? "")).join(","),
  );

  return `${columns.join(",")}\n${rows.join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toMarkdownReport(records) {
  const byCategory = countBy(records, (record) => record.category);
  const bySource = countBy(records, (record) => record.source);
  const total = records.length || 1;
  const ordinaryVsCelebrity = byCategory.get("ordinary_vs_celebrity_or_model") ?? 0;

  const lines = [
    "# 台灣男性與日韓男性穿搭比較貼文初步統計",
    "",
    `- 總筆數：${records.length}`,
    `- 普通人 vs 明星/模特：${ordinaryVsCelebrity}（${formatPercent(ordinaryVsCelebrity / total)}）`,
    "",
    "## 依分類",
    "",
    ...[...byCategory.entries()].map(
      ([category, count]) => `- ${category}：${count}（${formatPercent(count / total)}）`,
    ),
    "",
    "## 依來源",
    "",
    ...[...bySource.entries()].map(
      ([source, count]) => `- ${source}：${count}（${formatPercent(count / total)}）`,
    ),
    "",
    "## 注意",
    "",
    "- 這是規則式初分類，不是最終研究結論。",
    "- Dcard 可能阻擋自動請求；若被阻擋，輸出會只包含 PTT 或成功抓到的 Dcard 結果。",
    "- 本腳本不下載圖片，也不判斷圖片中的人物身份；若貼文本身只靠圖片比較，需人工複核。",
  ];

  return `${lines.join("\n")}\n`;
}

function countBy(records, getKey) {
  const counts = new Map();

  for (const record of records) {
    const key = getKey(record);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
