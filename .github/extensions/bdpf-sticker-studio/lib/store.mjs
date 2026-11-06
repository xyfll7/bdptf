import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {
  DEFAULT_DESIGN,
  DesignError,
  FORMAT,
  VERSION,
  assertDesignId,
  buildRecord,
  normalizeDesign,
  pickDesignFields,
  validateRecord,
} from '../../../../docs/lib/design.js';
import { THEMES, SHAPES } from '../../../../docs/lib/render.js';

export { DEFAULT_DESIGN, DesignError, FORMAT, VERSION, assertDesignId };

const ALLOWED = { themes: Object.keys(THEMES), shapes: Object.keys(SHAPES) };

export function resolveCopilotHome() {
  const fromEnv = process.env.COPILOT_HOME;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv;
  return path.join(os.homedir(), '.copilot');
}

export function designDir() {
  return path.join(resolveCopilotHome(), 'extension-data', 'bdpf-sticker-studio', 'designs');
}

export { normalizeDesign };

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
  return validateRecord(parsed, file);
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
    design: normalizeDesign(record.design, DEFAULT_DESIGN, ALLOWED),
    stored: true,
  };
}

/**
 * Serializes writes per design id. Saving is a read-modify-write (partial updates
 * merge with stored values), so concurrent requests for the same id would
 * otherwise interleave and resurrect stale fields.
 */
const locks = new Map();

function withLock(id, task) {
  const previous = locks.get(id) || Promise.resolve();
  const run = previous.then(task, task);
  // Keep the chain alive regardless of outcome, and drop it once settled.
  locks.set(
    id,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

export function writeDesign(idInput, designInput) {
  const id = assertDesignId(idInput);
  return withLock(id, () => persistDesign(id, designInput));
}

async function persistDesign(id, designInput) {
  const existing = await readDesign(id);
  const design = normalizeDesign(
    { ...existing.design, ...pickDesignFields(designInput) },
    existing.design,
    ALLOWED,
  );
  const dir = designDir();
  await fs.mkdir(dir, { recursive: true });

  const record = buildRecord(id, design);
  const target = path.join(dir, `${id}.json`);
  const tmp = path.join(dir, `.${id}.${crypto.randomBytes(6).toString('hex')}.tmp`);

  try {
    await fs.writeFile(tmp, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    await fs.rename(tmp, target);
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw new DesignError('WRITE_FAILED', `保存设计失败：${err && err.message ? err.message : String(err)}`);
  }
  return { designId: id, updatedAt: record.updatedAt, design };
}

export async function resetDesign(idInput) {
  return writeDesign(idInput, DEFAULT_DESIGN);
}
