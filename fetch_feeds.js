/**
 * fetch_feeds.js
 * 从 feeds.json 读取 RSS 源列表，抓取 XML 并解析为结构化数据
 * 输出 raw_feeds.json（原始未翻译数据），供 Claude Code 后续翻译使用
 *
 * 用法: node fetch_feeds.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { XMLParser } from 'fast-xml-parser';

const FEEDS_FILE = 'feeds.json';
const OUTPUT_FILE = 'raw_feeds.json';
const CONCURRENCY = 8;   // 同时最多 8 个请求
const TIMEOUT_MS = 25000; // 单个请求超时 25s
const MAX_RETRIES = 2;    // 失败后重试次数

// ─── 读取源列表 ───────────────────────────────────────────
const feeds = JSON.parse(readFileSync(FEEDS_FILE, 'utf-8'));
console.log(`📡 读取到 ${feeds.length} 个 RSS 源`);
console.log();

// ─── XML 解析器 ────────────────────────────────────────────
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

// ─── 抓取单个源（含重试） ──────────────────────────────────
async function fetchFeed(feed, attempt = 1) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RSS-Dashboard/1.0' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = parser.parse(xml);

    // RSS 2.0: rss.channel.item  |  Atom: feed.entry  |  RDF/RSS 1.0: rdf:RDF > item
    const rdf = parsed['rdf:RDF'];
    const channel = parsed.rss?.channel || parsed.feed || rdf;
    if (!channel) throw new Error('无法识别 RSS/Atom/RDF 格式');

    // RDF 格式中 item 与 channel 同级，直接在 rdf:RDF 下
    const items = channel.item || channel.entry || rdf?.item || [];
    const list = (Array.isArray(items) ? items : [items]).map(item => {
      // 标题
      const title = typeof item.title === 'string'
        ? item.title
        : item.title?.['#text'] || '';

      // 链接
      let link = '';
      if (typeof item.link === 'string') {
        link = item.link;
      } else if (Array.isArray(item.link)) {
        link = item.link.find(l => l['@_rel'] === 'alternate')?.['@_href']
            || item.link[0]?.['@_href'] || '';
      } else if (item.link?.['@_href']) {
        link = item.link['@_href'];
      }

      // 发布时间（含 RDF 的 dc:date）
      const pubDate = item.pubDate || item.published || item.updated || item['dc:date'] || '';

      // 摘要 / 描述
      let summary = '';
      const desc = item.description || item.summary || item.content || '';
      if (typeof desc === 'string') {
        summary = desc.replace(/<[^>]+>/g, '').trim().slice(0, 500);
      }

      return { title: title.trim(), link, pubDate, summary };
    });

    console.log(`   ✅ ${feed.nameZh}（${feed.id}）: ${list.length} 篇`);
    return { ...feed, articles: list, error: null };
  } catch (err) {
    if (attempt <= MAX_RETRIES) {
      const delay = attempt * 2000;
      console.log(`   ⏳ ${feed.nameZh}: 第${attempt}次重试（${delay/1000}s后）...`);
      await new Promise(r => setTimeout(r, delay));
      return fetchFeed(feed, attempt + 1);
    }
    console.log(`   ❌ ${feed.nameZh}（${feed.id}）: ${err.message}`);
    return { ...feed, articles: [], error: err.message };
  }
}

// ─── 分批并发执行 ──────────────────────────────────────────
async function fetchAllInBatches(feedList) {
  const results = [];
  for (let i = 0; i < feedList.length; i += CONCURRENCY) {
    const batch = feedList.slice(i, i + CONCURRENCY);
    const batchNum = Math.floor(i / CONCURRENCY) + 1;
    const totalBatches = Math.ceil(feedList.length / CONCURRENCY);
    console.log(`── 批次 ${batchNum}/${totalBatches}（${batch.map(f => f.nameZh).join('、')}）──`);
    const batchResults = await Promise.all(batch.map(f => fetchFeed(f)));
    results.push(...batchResults);
    // 批间间隔 500ms，避免被限流
    if (i + CONCURRENCY < feedList.length) await new Promise(r => setTimeout(r, 500));
  }
  return results;
}

// ─── 主流程 ────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  RSS 抓取工具 — 读取 feeds.json');
  console.log('═══════════════════════════════════════\n');

  const results = await fetchAllInBatches(feeds);

  const successCount = results.filter(r => !r.error).length;
  const totalArticles = results.reduce((sum, r) => sum + r.articles.length, 0);

  const output = {
    fetchedAt: new Date().toISOString(),
    feedCount: feeds.length,
    successCount,
    articleCount: totalArticles,
    feeds: results.map(r => ({
      id: r.id,
      name: r.name,
      nameZh: r.nameZh,
      category: r.category,
      color: r.color,
      lang: r.lang,
      articleCount: r.articles.length,
      error: r.error,
    })),
    articles: results.flatMap(r =>
      r.articles.map(a => ({
        feedId: r.id,
        feedName: r.name,
        feedNameZh: r.nameZh,
        category: r.category,
        color: r.color,
        lang: r.lang,
        title: a.title,
        link: a.link,
        pubDate: a.pubDate,
        summary: a.summary,
      }))
    ),
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

  console.log('\n═══════════════════════════════════════');
  console.log(`📦 输出: ${OUTPUT_FILE}`);
  console.log(`   成功: ${successCount}/${feeds.length} 源`);
  console.log(`   文章总数: ${totalArticles}`);
  const errors = output.feeds.filter(f => f.error);
  if (errors.length) {
    console.log(`   ⚠️ 失败（${errors.length}）:`);
    errors.forEach(e => console.log(`      - ${e.nameZh}（${e.id}）: ${e.error}`));
  }
  console.log('═══════════════════════════════════════');
}

main();
