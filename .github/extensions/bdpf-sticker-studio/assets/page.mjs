import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** 车贴前端已从 docs/ 迁到 static/sticker/，与 Hugo 站点共用同一份源码。 */
const STICKER = path.join(HERE, '..', '..', '..', '..', 'static', 'sticker');

/**
 * Serves the shared sticker page, repointing its assets at this server and
 * injecting the saved design so the client boots without an extra round-trip.
 */
export async function renderStudioHtml(state) {
  const html = await fs.readFile(path.join(STICKER, 'studio.html'), 'utf8');
  const boot = JSON.stringify({
    designId: state.designId,
    stored: state.stored,
    design: state.design,
  }).replace(/</g, '\\u003c');

  return html
    .replace('<link rel="stylesheet" href="./sticker.css"/>', '<link rel="stylesheet" href="/sticker.css"/>')
    .replace(
      '<script type="module" src="./lib/app.js"></script>',
      `<script id="boot" type="application/json">${boot}</script>\n<script type="module" src="/client.js"></script>`,
    );
}

/** Absolute paths of the shared site assets the extension serves directly. */
export function assetPaths() {
  return {
    index: path.join(STICKER, 'studio.html'),
    style: path.join(STICKER, 'sticker.css'),
    studio: path.join(STICKER, 'lib', 'studio.js'),
    render: path.join(STICKER, 'lib', 'render.js'),
    design: path.join(STICKER, 'lib', 'design.js'),
  };
}

export function docsDir() {
  return STICKER;
}
