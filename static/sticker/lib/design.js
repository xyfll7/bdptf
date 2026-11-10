/**
 * Shared design model for the 鼻窦排涕法 car-sticker studio.
 * Used by the GitHub Pages site (localStorage) and the Canvas extension (file storage).
 * Keep this file free of Node and DOM APIs so both hosts can import it.
 */

export const FORMAT = 'bdpf-sticker-studio/design';
export const VERSION = 1;
export const DEFAULT_DESIGN_ID = 'default';
export const ID_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export const DEFAULT_DESIGN = Object.freeze({
  theme: 'vermilion',
  shape: 'round',
  title: '鼻窦排涕法，万岁！',
  subtitle: '排涕，养鼻，把鼻涕洗干净，让鼻子休息好！',
  cutline: true,
});

export const LIMITS = Object.freeze({ title: 40, subtitle: 80 });

export class DesignError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DesignError';
    this.code = code;
  }
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
export function normalizeDesign(input, fallback = DEFAULT_DESIGN, allowed = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const themes = allowed.themes || [fallback.theme];
  const shapes = allowed.shapes || [fallback.shape];
  return {
    theme: themes.includes(source.theme) ? source.theme : fallback.theme,
    shape: shapes.includes(source.shape) ? source.shape : fallback.shape,
    title: cleanText(source.title, fallback.title, LIMITS.title),
    subtitle: cleanText(source.subtitle, fallback.subtitle, LIMITS.subtitle),
    cutline: typeof source.cutline === 'boolean' ? source.cutline : fallback.cutline,
  };
}

/** Keeps only the fields a caller explicitly supplied, for partial updates. */
export function pickDesignFields(value) {
  const out = {};
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['theme', 'shape', 'title', 'subtitle', 'cutline']) {
      if (value[key] !== undefined) out[key] = value[key];
    }
  }
  return out;
}

/** Validates a stored record envelope; returns the raw record or null when absent. */
export function validateRecord(parsed, sourceLabel) {
  if (!parsed || typeof parsed !== 'object' || parsed.format !== FORMAT) {
    throw new DesignError('UNRECOGNIZED', `无法识别的设计数据格式，未做改动：${sourceLabel}`);
  }
  if (parsed.version !== VERSION) {
    throw new DesignError(
      'UNSUPPORTED_VERSION',
      `设计数据版本 ${parsed.version} 不受支持（需要 ${VERSION}）：${sourceLabel}`,
    );
  }
  if (!parsed.design || typeof parsed.design !== 'object') {
    throw new DesignError('CORRUPT', `设计数据结构不完整，未做改动：${sourceLabel}`);
  }
  return parsed;
}

export function buildRecord(designId, design, updatedAt = new Date().toISOString()) {
  return { format: FORMAT, version: VERSION, designId, updatedAt, design };
}