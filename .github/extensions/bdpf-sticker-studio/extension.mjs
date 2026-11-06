import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, CanvasError, joinSession } from '@github/copilot-sdk/extension';
import {
  DesignError,
  assertDesignId,
  readDesign,
  resetDesign,
  writeDesign,
} from './lib/store.mjs';
import { renderSvg, THEMES, SHAPES } from './lib/render.mjs';
import { renderStudioHtml } from './assets/page.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAX_BODY = 16 * 1024;
const ID_PATTERN = '^[a-z0-9][a-z0-9._-]{0,63}$';

const STATIC = new Map([
  ['/client.js', { file: 'assets/client.js', type: 'text/javascript; charset=utf-8' }],
  ['/render.mjs', { file: 'lib/render.mjs', type: 'text/javascript; charset=utf-8' }],
]);

const instances = new Map();
let session;

function toCanvasError(err) {
  if (err instanceof CanvasError) return err;
  if (err instanceof DesignError) {
    const code = err.code === 'INVALID_ID' ? 'INVALID_INPUT' : err.code;
    return new CanvasError(code, err.message);
  }
  return new CanvasError('INTERNAL', err && err.message ? err.message : String(err));
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

function sendText(res, status, text, type) {
  res.writeHead(status, {
    'content-type': type,
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  });
  res.end(text);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new DesignError('TOO_LARGE', '请求内容过大。');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new DesignError('INVALID_INPUT', '请求内容不是合法的 JSON。');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new DesignError('INVALID_INPUT', '请求内容必须是 JSON 对象。');
  }
  return parsed;
}

async function handleApi(req, res, url, fallbackId) {
  const match = /^\/api\/design(?:\/([^/]+))?(?:\/(svg|reset))?$/.exec(url.pathname);
  if (!match) {
    sendJson(res, 404, { code: 'NOT_FOUND', message: '未知接口。' });
    return;
  }

  let id;
  try {
    id = assertDesignId(match[1] ? decodeURIComponent(match[1]) : fallbackId);
  } catch (err) {
    const wrapped = toCanvasError(err);
    sendJson(res, 400, { code: wrapped.code, message: wrapped.message });
    return;
  }

  const sub = match[2] || '';
  try {
    if (req.method === 'GET' && sub === '') {
      sendJson(res, 200, await readDesign(id));
      return;
    }
    if (req.method === 'GET' && sub === 'svg') {
      const state = await readDesign(id);
      sendText(res, 200, renderSvg(state.design), 'image/svg+xml; charset=utf-8');
      return;
    }
    if (req.method === 'POST' && sub === '') {
      const body = await readJsonBody(req);
      if (body.designId != null && assertDesignId(body.designId) !== id) {
        sendJson(res, 400, { code: 'INVALID_INPUT', message: '设计编号与请求路径不一致。' });
        return;
      }
      sendJson(res, 200, await writeDesign(id, body.design ?? body));
      return;
    }
    if (req.method === 'POST' && sub === 'reset') {
      sendJson(res, 200, await resetDesign(id));
      return;
    }
    sendJson(res, 405, { code: 'METHOD_NOT_ALLOWED', message: '方法不被支持。' });
  } catch (err) {
    const wrapped = toCanvasError(err);
    const clientFault = wrapped.code === 'INVALID_INPUT' || wrapped.code === 'TOO_LARGE';
    sendJson(res, clientFault ? 400 : 500, { code: wrapped.code, message: wrapped.message });
  }
}

async function serveStatic(pathname, res) {
  const entry = STATIC.get(pathname);
  if (!entry) {
    sendText(res, 404, 'Not found', 'text/plain; charset=utf-8');
    return;
  }
  const body = await fs.readFile(path.join(HERE, entry.file), 'utf8');
  sendText(res, 200, body, entry.type);
}

function startServer(designId) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const isApi = url.pathname.startsWith('/api/');
    const isPage = url.pathname === '/' || url.pathname === '/index.html';
    if (!isApi && !isPage && !STATIC.has(url.pathname)) {
      sendText(res, 404, 'Not found', 'text/plain; charset=utf-8');
      return;
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.writeHead(405, { allow: 'GET, POST' });
      res.end();
      return;
    }

    const task = isApi
      ? handleApi(req, res, url, designId)
      : isPage
        ? readDesign(designId).then((state) =>
            sendText(res, 200, renderStudioHtml(state), 'text/html; charset=utf-8'),
          )
        : serveStatic(url.pathname, res);

    task.catch((err) => {
      const wrapped = toCanvasError(err);
      if (!res.headersSent) sendText(res, 500, wrapped.message, 'text/plain; charset=utf-8');
      else res.end();
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new CanvasError('LISTEN_FAILED', '无法分配本地端口。'));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}

const canvas = createCanvas({
  id: 'bdpf-sticker-studio',
  displayName: '鼻窦排涕法 · 车贴设计台',
  description: '设计、预览并导出「鼻窦排涕法」车贴，可切换配色与版型并保存方案。',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      designId: { type: 'string', description: '设计编号，默认 default。', pattern: ID_PATTERN },
    },
  },
  actions: [
    {
      name: 'getDesign',
      description: '读取已保存的车贴设计（无记录时返回默认设计）。',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: { designId: { type: 'string', pattern: ID_PATTERN } },
      },
      handler: (ctx) => readDesign(ctx.input?.designId),
    },
    {
      name: 'setDesign',
      description:
        '保存车贴设计。theme 取 vermilion|mono|pop，shape 取 round|banner|card|portrait，title 为主标语（放大），subtitle 为副标语。',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          designId: { type: 'string', pattern: ID_PATTERN },
          theme: { type: 'string', enum: Object.keys(THEMES) },
          shape: { type: 'string', enum: Object.keys(SHAPES) },
          title: { type: 'string', maxLength: 40 },
          subtitle: { type: 'string', maxLength: 80 },
          cutline: { type: 'boolean' },
        },
      },
      handler: (ctx) => {
        const { designId, ...design } = ctx.input || {};
        return writeDesign(designId, design);
      },
    },
    {
      name: 'resetDesign',
      description: '把车贴设计恢复为默认文案与样式。',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: { designId: { type: 'string', pattern: ID_PATTERN } },
      },
      handler: (ctx) => resetDesign(ctx.input?.designId),
    },
    {
      name: 'exportSvg',
      description: '返回当前设计的 SVG 源码与尺寸，可直接送印。',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: { designId: { type: 'string', pattern: ID_PATTERN } },
      },
      handler: async (ctx) => {
        const state = await readDesign(ctx.input?.designId);
        return {
          designId: state.designId,
          size: SHAPES[state.design.shape],
          svg: renderSvg(state.design),
        };
      },
    },
  ],
  async open(ctx) {
    let designId;
    try {
      designId = assertDesignId(ctx.input?.designId);
    } catch (err) {
      throw toCanvasError(err);
    }

    const existing = instances.get(ctx.instanceId);
    if (existing) {
      existing.designId = designId;
      return { url: `${existing.origin}/`, title: '鼻窦排涕法 · 车贴设计台' };
    }

    try {
      const { server, port } = await startServer(designId);
      const instance = { server, designId, origin: `http://127.0.0.1:${port}` };
      instances.set(ctx.instanceId, instance);
      Promise.resolve(session.log(`bdpf-sticker-studio: ${instance.origin} (design ${designId})`)).catch(
        () => {},
      );
      return { url: `${instance.origin}/`, title: '鼻窦排涕法 · 车贴设计台' };
    } catch (err) {
      throw toCanvasError(err);
    }
  },
  onClose(ctx) {
    const instance = instances.get(ctx.instanceId);
    if (!instance) return;
    instances.delete(ctx.instanceId);
    instance.server.close();
  },
});

session = await joinSession({ canvases: [canvas] });

export { canvas };