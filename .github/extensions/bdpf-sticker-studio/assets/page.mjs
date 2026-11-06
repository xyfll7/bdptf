import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, '..', '..', '..', '..', 'docs');

/**
 * Serves the shared GitHub Pages page, repointing its assets at this server and
 * injecting the saved design so the client boots without an extra round-trip.
 */
export async function renderStudioHtml(state) {
  const html = await fs.readFile(path.join(DOCS, 'index.html'), 'utf8');
  const boot = JSON.stringify({
    designId: state.designId,
    stored: state.stored,
    design: state.design,
  }).replace(/</g, '\\u003c');

  return html
    .replace('<link rel="stylesheet" href="./style.css"/>', '<link rel="stylesheet" href="/style.css"/>')
    .replace(
      '<script type="module" src="./lib/app.js"></script>',
      `<script id="boot" type="application/json">${boot}</script>\n<script type="module" src="/client.js"></script>`,
    );
}

/** Absolute paths of the shared site assets the extension serves directly. */
export function assetPaths() {
  return {
    index: path.join(DOCS, 'index.html'),
    style: path.join(DOCS, 'style.css'),
    studio: path.join(DOCS, 'lib', 'studio.js'),
    render: path.join(DOCS, 'lib', 'render.js'),
    design: path.join(DOCS, 'lib', 'design.js'),
  };
}

export function docsDir() {
  return DOCS;
}
