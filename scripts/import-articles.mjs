#!/usr/bin/env node
/**
 * 把 articles/*.md 迁移成 Hugo content/posts/*.md。
 *
 * 源文件只有 `# 标题` 加正文，没有 front matter；这里补上 title/date/slug/
 * 分类与图片路径。脚本是幂等的，可反复运行，便于以后新增文章时再迁一次。
 *
 * 用法：
 *   node scripts/import-articles.mjs
 *   node scripts/import-articles.mjs --dry-run
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'articles');
const OUT_DIR = path.join(ROOT, 'content', 'posts');
const IMAGE_SRC = path.join(ROOT, 'images');
const IMAGE_OUT = path.join(ROOT, 'static', 'images');

const dryRun = process.argv.includes('--dry-run');

/** 抖音发布顺序与日期、体裁，取自 README 里的目录表格。 */
const META = {
  1: ['2026-10-25', '长文'],
  2: ['2026-10-13', '长文'],
  3: ['2026-09-22', '长文'],
  4: ['2026-11-04', '图文'],
  5: ['2026-11-03', '长文'],
  6: ['2026-11-02', '长文'],
  7: ['2026-11-02', '长文'],
  8: ['2026-11-01', '长文'],
  9: ['2026-11-01', '图文'],
  10: ['2026-11-01', '长文'],
  11: ['2026-10-30', '长文'],
  12: ['2026-10-27', '图文'],
  13: ['2026-10-26', '长文'],
  14: ['2026-10-23', '图文'],
  15: ['2026-10-22', '图文'],
  16: ['2026-10-21', '图文'],
  17: ['2026-10-20', '长文'],
  18: ['2026-10-17', '图文'],
  19: ['2026-10-15', '视频'],
  20: ['2026-10-13', '长文'],
  21: ['2026-10-10', '长文'],
  22: ['2026-10-10', '长文'],
  23: ['2026-10-08', '视频'],
  24: ['2026-10-08', '长文'],
  25: ['2026-10-08', '长文'],
  26: ['2026-10-06', '图文'],
  27: ['2026-10-05', '长文'],
  28: ['2026-10-01', '长文'],
  29: ['2026-09-30', '长文'],
  30: ['2026-09-30', '长文'],
  31: ['2026-09-30', '长文'],
  32: ['2026-09-29', '长文'],
  33: ['2026-09-27', '长文'],
  34: ['2026-09-27', '长文'],
  35: ['2026-09-26', '长文'],
  36: ['2026-09-26', '长文'],
  37: ['2026-09-25', '图文'],
  38: ['2026-09-24', '长文'],
  39: ['2026-09-20', '长文'],
  40: ['2026-09-19', '长文'],
  41: ['2026-09-04', '长文'],
  42: ['2026-05-18', '图文'],
};

/** 首页与列表用的短摘要：取正文前若干字，去掉图片与标题。 */
function summarize(body, limit = 96) {
  const text = body
    .replace(/^!\[[^\]]*\]\([^)]*\)\s*$/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const chars = [...text];
  return chars.length > limit ? `${chars.slice(0, limit).join('')}…` : text;
}

/** 纯图片的帖子没有可摘的正文，用标题兜底，避免列表里出现空白摘要。 */
function summaryFor(body, title, kind) {
  const text = summarize(body);
  if (text) return text;
  return `${title}（${kind ?? '图文'}，帖子正文以图片为主，点击查看原图。）`;
}

/** YAML 双引号字符串：转义反斜杠与双引号，保留中文原样。 */
function quote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function slugify(title) {
  // 中文标题无法直接做 URL，用序号保证链接稳定且可读。
  return title;
}

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function main() {
  // 按文件名里的序号排序，生成顺序与抖音发布顺序一致。
  const files = (await fs.readdir(SRC_DIR))
    .filter((f) => f.endsWith('.md'))
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
  const warnings = [];
  let written = 0;

  if (!dryRun) await fs.mkdir(OUT_DIR, { recursive: true });

  for (const name of files) {
    const match = /^(\d+)-(.+)\.md$/.exec(name);
    if (!match) {
      warnings.push(`跳过文件名不符合 “NN-标题.md” 规则的文件：${name}`);
      continue;
    }
    const order = Number(match[1]);
    const [date, kind] = META[order] ?? [null, null];
    if (!date) {
      warnings.push(`第 ${order} 篇缺少发布日期，已回退为 2026-01-01：${name}`);
    }

    const raw = await fs.readFile(path.join(SRC_DIR, name), 'utf8');
    const lines = raw.replace(/\r\n/g, '\n').split('\n');

    // 去掉首行的 `# 标题`，文件名里的标题更权威。
    let headingTitle = '';
    while (lines.length && lines[0].trim() === '') lines.shift();
    if (lines[0]?.startsWith('# ')) {
      headingTitle = lines.shift().slice(2).trim();
    }
    const title = match[2].trim() || headingTitle;

    const body = lines
      .join('\n')
      // 图片从 `../images/xx/yy.jpeg` 改为站内绝对路径。
      .replace(/\]\(\.\.\/images\//g, '](/images/')
      // 少数文件里图片链接被软换行拆开，这里把断行接回去。
      .replace(/\]\(\s*\n\s*\/images\//g, '](/images/')
      .replace(/\.(jpe?g|png)\)\s*\n\s*\)/gi, '.$1)')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const summary = summaryFor(body, title, kind);
    const slug = `post-${String(order).padStart(2, '0')}`;

    const frontMatter = [
      '---',
      `title: ${quote(title)}`,
      `date: ${date ?? '2026-01-01'}T09:00:00+08:00`,
      `slug: ${quote(slugify(slug))}`,
      `summary: ${quote(summary)}`,
      `weight: ${order}`,
      'categories:',
      `  - ${quote(kind ?? '长文')}`,
      'tags:',
      `  - ${quote('鼻窦排涕法')}`,
      '---',
      '',
    ].join('\n');

    const outFile = path.join(OUT_DIR, `${slug}.md`);
    if (!dryRun) {
      await fs.writeFile(outFile, `${frontMatter}${body}\n`, 'utf8');
    }
    written += 1;
  }

  if (!dryRun) {
    await fs.mkdir(IMAGE_OUT, { recursive: true });
    const images = await walk(IMAGE_SRC);
    for (const src of images) {
      const rel = path.relative(IMAGE_SRC, src);
      const dest = path.join(IMAGE_OUT, rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
    }
    console.log(`图片已复制到 static/images：${images.length} 个文件`);
  }

  console.log(`${dryRun ? '[dry-run] 将' : '已'}生成 ${written} 篇文章 → content/posts`);
  for (const warning of warnings) console.warn(`! ${warning}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});