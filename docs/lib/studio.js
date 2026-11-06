import { THEMES, SHAPES, renderSvg } from './render.js';
import { DEFAULT_DESIGN, buildRecord, normalizeDesign, validateRecord } from './design.js';

const THEME_KEYS = Object.keys(THEMES);
const SHAPE_KEYS = Object.keys(SHAPES);
const ZIP_NAME = '鼻窦排涕法车贴-全部12款.zip';

/**
 * Mounts the sticker studio into an existing page.
 *
 * `storage` supplies persistence and is the only host-specific piece:
 *   - load(): { design } | null   (may throw DesignError)
 *   - save(design): { updatedAt } (may throw DesignError)
 */
export function mountStudio(doc, { storage, initialDesign } = {}) {
  const els = {
    themes: doc.getElementById('themes'),
    shapes: doc.getElementById('shapes'),
    title: doc.getElementById('title'),
    subtitle: doc.getElementById('subtitle'),
    cutline: doc.getElementById('cutline'),
    preview: doc.getElementById('preview'),
    meta: doc.getElementById('meta'),
    status: doc.getElementById('status'),
    download: doc.getElementById('download'),
    png: doc.getElementById('png'),
    downloadAll: doc.getElementById('download-all'),
    reset: doc.getElementById('reset'),
  };

  for (const [name, el] of Object.entries(els)) {
    if (!el) throw new Error(`车贴设计台缺少页面元素：#${name}`);
  }

  let bootError = '';
  let saveSeq = 0;
  let design = initialDesign ? sanitize(initialDesign) : loadInitial();
  let savedSnapshot = JSON.stringify(design);

  function sanitize(value) {
    return normalizeDesign(value, DEFAULT_DESIGN, { themes: THEME_KEYS, shapes: SHAPE_KEYS });
  }

  function setStatus(message, tone) {
    els.status.textContent = message;
    if (tone) els.status.dataset.tone = tone;
    else delete els.status.dataset.tone;
  }

  function loadInitial() {
    try {
      const record = storage?.load?.();
      if (!record) return { ...DEFAULT_DESIGN };
      return sanitize(validateRecord(record, '已保存的设计').design);
    } catch (err) {
      bootError = err && err.message ? err.message : '读取已保存的设计失败';
      return { ...DEFAULT_DESIGN };
    }
  }

  async function commit(message) {
    render();
    const snapshot = JSON.stringify(design);
    const seq = ++saveSeq;
    try {
      const result = await storage?.save?.(design);
      // A newer edit may have started saving while this one was in flight.
      if (seq !== saveSeq) return;
      savedSnapshot = snapshot;
      const stamp = result?.updatedAt ? new Date(result.updatedAt) : new Date();
      setStatus(message || `已保存 · ${stamp.toLocaleTimeString('zh-CN')}`, 'ok');
    } catch (err) {
      if (seq !== saveSeq) return;
      setStatus(err && err.message ? err.message : '保存失败', 'err');
    }
  }

  function buildThemeButtons() {
    els.themes.replaceChildren();
    for (const [key, theme] of Object.entries(THEMES)) {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'theme';
      btn.dataset.theme = key;
      btn.setAttribute('aria-pressed', 'false');
      const chip = doc.createElement('span');
      chip.className = 'chip';
      chip.style.background = `linear-gradient(135deg,${theme.bg} 0%,${theme.bg} 58%,${theme.accent} 58%,${theme.accent} 100%)`;
      chip.style.borderColor = theme.ring;
      const label = doc.createElement('span');
      label.textContent = theme.name;
      btn.append(chip, label);
      btn.addEventListener('click', () => {
        design = { ...design, theme: key };
        commit();
      });
      els.themes.append(btn);
    }
  }

  function buildShapeButtons() {
    els.shapes.replaceChildren();
    const icons = ['r', 'b', 'c', 'p'];
    let index = 0;
    for (const [key, shape] of Object.entries(SHAPES)) {
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'shape';
      btn.dataset.shape = key;
      btn.setAttribute('aria-pressed', 'false');
      const icon = doc.createElement('i');
      icon.className = icons[index++] || 'c';
      const label = doc.createElement('span');
      label.textContent = shape.name;
      btn.append(icon, label);
      btn.addEventListener('click', () => {
        design = { ...design, shape: key };
        commit();
      });
      els.shapes.append(btn);
    }
  }

  function render() {
    for (const btn of els.themes.querySelectorAll('.theme')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.theme === design.theme));
    }
    for (const btn of els.shapes.querySelectorAll('.shape')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.shape === design.shape));
    }
    if (els.title.value !== design.title) els.title.value = design.title;
    if (els.subtitle.value !== design.subtitle) els.subtitle.value = design.subtitle;
    els.cutline.checked = design.cutline;

    const box = SHAPES[design.shape];
    els.preview.style.maxWidth = design.shape === 'banner' ? 'min(92%,860px)' : 'min(76vmin,720px)';
    els.preview.innerHTML = renderSvg(design);
    els.meta.textContent = `${box.name} · ${box.w}×${box.h}px · ${THEMES[design.theme].name}`;
    doc.title = `${design.title} · 车贴设计台`;
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    doc.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function slug() {
    return `${design.shape}-${design.theme}`;
  }

  async function renderPngBlob(source, box, maxEdge = 2400) {
    const scale = Math.min(3, maxEdge / Math.max(box.w, box.h));
    const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('导出图片失败：浏览器无法绘制该 SVG'));
        img.src = url;
      });
      const canvas = doc.createElement('canvas');
      canvas.width = Math.round(box.w * scale);
      canvas.height = Math.round(box.h * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('导出 PNG 失败');
      return { blob, width: canvas.width, height: canvas.height };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function download(kind) {
    const svgText = renderSvg(design);
    const base = `鼻窦排涕法车贴-${slug()}`;
    try {
      if (kind === 'svg') {
        triggerDownload(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }), `${base}.svg`);
        setStatus('已导出 SVG（矢量，可直接送印）', 'ok');
        return;
      }
      const { blob, width, height } = await renderPngBlob(svgText, SHAPES[design.shape]);
      triggerDownload(blob, `${base}.png`);
      setStatus(`已导出 PNG（${width}×${height}）`, 'ok');
    } catch (err) {
      setStatus(err && err.message ? err.message : '下载失败', 'err');
    }
  }

  async function downloadAll() {
    els.downloadAll.disabled = true;
    try {
      const themeName = Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, v.name]));
      const shapeName = Object.fromEntries(Object.entries(SHAPES).map(([k, v]) => [k, v.name]));
      const files = [];
      for (const theme of THEME_KEYS) {
        for (const shape of SHAPE_KEYS) {
          const sample = { ...design, theme, shape };
          const { blob } = await renderPngBlob(renderSvg(sample), SHAPES[shape]);
          files.push({
            name: `${themeName[theme]}-${shapeName[shape]}.png`,
            data: new Uint8Array(await blob.arrayBuffer()),
          });
          setStatus(`正在打包 ${files.length}/${THEME_KEYS.length * SHAPE_KEYS.length} …`, null);
        }
      }
      triggerDownload(await makeZip(files), ZIP_NAME);
      setStatus(`已打包 ${files.length} 款 PNG（每款最长边 2400px）`, 'ok');
    } catch (err) {
      setStatus(err && err.message ? err.message : '打包失败', 'err');
    } finally {
      els.downloadAll.disabled = false;
    }
  }

  els.title.addEventListener('input', () => {
    design = { ...design, title: els.title.value };
    commit();
  });
  els.subtitle.addEventListener('input', () => {
    design = { ...design, subtitle: els.subtitle.value };
    commit();
  });
  els.cutline.addEventListener('change', () => {
    design = { ...design, cutline: els.cutline.checked };
    commit();
  });
  els.download.addEventListener('click', () => download('svg'));
  els.png.addEventListener('click', () => download('png'));
  els.downloadAll.addEventListener('click', downloadAll);
  els.reset.addEventListener('click', () => {
    design = { ...DEFAULT_DESIGN };
    commit('已恢复默认设计');
  });

  buildThemeButtons();
  buildShapeButtons();
  render();

  if (bootError) setStatus(`${bootError}，已载入默认设计`, 'err');
  else setStatus('改动会自动保存', 'ok');

  return {
    getDesign: () => ({ ...design }),
    async setDesign(nextDesign) {
      design = sanitize({ ...design, ...nextDesign });
      await commit();
      return { ...design };
    },
  };
}

/** localStorage adapter used by the standalone GitHub Pages site. */
export function createLocalStorageAdapter(key = 'bdpf-sticker-studio:design', store = globalThis.localStorage) {
  return {
    load() {
      let raw;
      try {
        raw = store.getItem(key);
      } catch {
        throw new Error('浏览器禁用了本地存储');
      }
      if (!raw) return null;
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error('本地保存的设计数据已损坏');
      }
      return parsed;
    },
    save(design) {
      const record = buildRecord('local', design);
      try {
        store.setItem(key, JSON.stringify(record));
      } catch {
        throw new Error('保存失败：本地存储不可用或已满');
      }
      return { updatedAt: record.updatedAt };
    },
  };
}

/* Minimal ZIP writer (stored, no compression) so the page stays dependency-free. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

async function makeZip(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, nameBytes.length, true);

    chunks.push(new Uint8Array(local.buffer), nameBytes, file.data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, size, true);
    entry.setUint32(24, size, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), nameBytes);

    offset += 30 + nameBytes.length + size;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}