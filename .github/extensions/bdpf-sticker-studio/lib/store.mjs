import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { THEMES as THEME_KEYS, SHAPES as SHAPE_DEFS } from './render.mjs';

export const FORMAT = 'bdpf-sticker-studio/design';
export const VERSION = 1;

export const THEMES = Object.keys(THEME_KEYS);
export const SHAPES = Object.keys(SHAPE_DEFS);
export const DEFAULT_DESIGN_ID = 'default';
export const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export const DEFAULT_DESIGN = Object.freeze({
  theme: 'vermilion',
  shape: 'round',
  title: '鼻窦排涕法，万岁！',
  subtitle: '排涕，养鼻，把鼻涕洗干净，让鼻子休息好！',
  cutline: true,
});

export class DesignError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DesignError';
    this.code = code;
  }
}

export function resolveCopilotHome() {
  const fromEnv = process.env.COPILOT_HOME;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv;
  return path.join(os.homedir(), '.copilot');
}

export function designDir() {
  return path.join(resolveCopilotHome(), 'extension-data', 'bdpf-sticker-studio', 'designs');
}

export function assertDesignId(value) {
  const id = value == null || value === '' ? DEFAULT_DESIGN_ID : String(value);
  if (!ID_RE.test(id)) {
    throw new DesignError('INVALID_ID', '设计编号只能包含小写字母、数字、点、下划线和连字符。');
  }
  return id;
}

function cleanText(value, fallback, max) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed === '') return fallback;
  return [...trimmed].slice(0, max).join('');
}

/**
 * Validates arbitrary input into a renderable design record.
 * Missing or out-of-range fields fall back to `fallback`.
 */
export function normalizeDesign(input, fallback = DEFAULT_DESIGN) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  return {
    theme: THEMES.includes(source.theme) ? source.theme : fallback.theme,
    shape: SHAPES.includes(source.shape) ? source.shape : fallback.shape,
    title: cleanText(source.title, fallback.title, 40),
    subtitle: cleanText(source.subtitle, fallback.subtitle, 80),
    cutline: typeof source.cutline === 'boolean' ? source.cutline : fallback.cutline,
  };
}

async function readRecordFile(file) {
  let raw;
  try {
    raw = await fs.readFile(file, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw new DesignError('READ_FAILED', `读取设计数据失败：${err && err.message ? err.message : String(err)}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DesignError('CORRUPT', `设计数据无法解析，已保留原文件：${file}`);
  }
  if (!parsed || typeof parsed !== 'object' || parsed.format !== FORMAT) {
    throw new DesignError('UNRECOGNIZED', `无法识别的设计数据格式，未做改动：${file}`);
  }
  if (parsed.version !== VERSION) {
    throw new DesignError('UNSUPPORTED_VERSION', `设计数据版本 ${parsed.version} 不受支持（需要 ${VERSION}）：${file}`);
  }
  if (!parsed.design || typeof parsed.design !== 'object') {
    throw new DesignError('CORRUPT', `设计数据结构不完整，未做改动：${file}`);
  }
  return parsed;
}

export async function readDesign(idInput) {
  const id = assertDesignId(idInput);
  const file = path.join(designDir(), `${id}.json`);
  const record = await readRecordFile(file);
  if (!record) {
    return { designId: id, updatedAt: null, design: { ...DEFAULT_DESIGN }, stored: false };
  }
  return {
    designId: id,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : null,
    design: normalizeDesign(record.design),
    stored: true,
  };
}

function pickDefined(value) {
  const out = {};
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['theme', 'shape', 'title', 'subtitle', 'cutline']) {
      if (value[key] !== undefined) out[key] = value[key];
    }
  }
  return out;
}

export async function writeDesign(idInput, designInput) {
  const id = assertDesignId(idInput);
  const existing = await readDesign(id);
  const patch = pickDefined(designInput);
  const design = normalizeDesign({ ...existing.design, ...patch }, existing.design);
  const dir = designDir();
  await fs.mkdir(dir, { recursive: true });

  const updatedAt = new Date().toISOString();
  const record = { format: FORMAT, version: VERSION, designId: id, updatedAt, design };
  const target = path.join(dir, `${id}.json`);
  const tmp = path.join(dir, `.${id}.${crypto.randomBytes(6).toString('hex')}.tmp`);

  try {
    await fs.writeFile(tmp, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    await fs.rename(tmp, target);
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw new DesignError('WRITE_FAILED', `保存设计失败：${err && err.message ? err.message : String(err)}`);
  }
  return { designId: id, updatedAt, design };
}

export async function resetDesign(idInput) {
  return writeDesign(idInput, DEFAULT_DESIGN);
}