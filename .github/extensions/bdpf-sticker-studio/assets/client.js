import { THEMES, SHAPES, renderSvg } from '/render.mjs';

const boot = JSON.parse(document.getElementById('boot').textContent);

const els = {
  themes: document.getElementById('themes'),
  shapes: document.getElementById('shapes'),
  title: document.getElementById('title'),
  subtitle: document.getElementById('subtitle'),
  cutline: document.getElementById('cutline'),
  preview: document.getElementById('preview'),
  meta: document.getElementById('meta'),
  status: document.getElementById('status'),
  save: document.getElementById('save'),
  download: document.getElementById('download'),
  png: document.getElementById('png'),
  reset: document.getElementById('reset'),
};

let design = { ...boot.design };
let savedSnapshot = boot.stored ? JSON.stringify(design) : null;
let saveTimer = null;
let busy = false;

function setStatus(message, tone) {
  els.status.textContent = message;
  if (tone) els.status.dataset.tone = tone;
  else delete els.status.dataset.tone;
}

function buildThemeButtons() {
  els.themes.replaceChildren();
  for (const [key, theme] of Object.entries(THEMES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme';
    btn.dataset.theme = key;
    btn.setAttribute('aria-pressed', 'false');
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.style.background = `linear-gradient(135deg,${theme.bg} 0%,${theme.bg} 58%,${theme.accent} 58%,${theme.accent} 100%)`;
    chip.style.borderColor = theme.ring;
    const label = document.createElement('span');
    label.textContent = theme.name;
    btn.append(chip, label);
    btn.addEventListener('click', () => {
      design = { ...design, theme: key };
      render();
      scheduleSave();
    });
    els.themes.append(btn);
  }
}

function buildShapeButtons() {
  els.shapes.replaceChildren();
  let index = 0;
  for (const [key, shape] of Object.entries(SHAPES)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shape';
    btn.dataset.shape = key;
    btn.setAttribute('aria-pressed', 'false');
    const icon = document.createElement('i');
    icon.className = ['r', 'b', 'c', 'p'][index++] || 'c';
    const label = document.createElement('span');
    label.textContent = shape.name;
    btn.append(icon, label);
    btn.addEventListener('click', () => {
      design = { ...design, shape: key };
      render();
      scheduleSave();
    });
    els.shapes.append(btn);
  }
}

function syncPressStates() {
  for (const btn of els.themes.querySelectorAll('.theme')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.theme === design.theme));
  }
  for (const btn of els.shapes.querySelectorAll('.shape')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.shape === design.shape));
  }
}

function render() {
  syncPressStates();
  if (els.title.value !== design.title) els.title.value = design.title;
  if (els.subtitle.value !== design.subtitle) els.subtitle.value = design.subtitle;
  els.cutline.checked = design.cutline;

  els.preview.setAttribute('aria-busy', 'true');
  els.preview.innerHTML = renderSvg(design);
  const box = SHAPES[design.shape];
  els.preview.style.maxWidth = design.shape === 'banner' ? 'min(92%,860px)' : 'min(76vmin,720px)';
  els.meta.textContent = `${box.name} · ${box.w}×${box.h}px · ${THEMES[design.theme].name}`;
  els.preview.setAttribute('aria-busy', 'false');

  const dirty = JSON.stringify(design) !== savedSnapshot;
  els.save.textContent = dirty ? '保存设计 ●' : '已保存';
  els.save.classList.toggle('primary', dirty);
  if (dirty) setStatus('有未保存的修改', null);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    save().catch(() => {});
  }, 900);
}

async function save() {
  if (busy) return;
  if (JSON.stringify(design) === savedSnapshot) {
    setStatus('已是最新，无需保存', 'ok');
    return;
  }
  busy = true;
  els.save.disabled = true;
  try {
    const res = await fetch('/api/design', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ designId: boot.designId, design }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.message || `保存失败（HTTP ${res.status}）`);
    design = { ...payload.design };
    savedSnapshot = JSON.stringify(design);
    boot.updatedAt = payload.updatedAt;
    render();
    setStatus(`已保存 · ${new Date(payload.updatedAt).toLocaleTimeString('zh-CN')}`, 'ok');
  } catch (err) {
    setStatus(err && err.message ? err.message : '保存失败', 'err');
  } finally {
    busy = false;
    els.save.disabled = false;
  }
}

function slug() {
  return `${design.shape}-${design.theme}`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
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
    const box = SHAPES[design.shape];
    const scale = Math.min(3, 2400 / Math.max(box.w, box.h));
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('预览渲染失败'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(box.w * scale);
    canvas.height = Math.round(box.h * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('导出 PNG 失败');
    triggerDownload(blob, `${base}.png`);
    setStatus(`已导出 PNG（${canvas.width}×${canvas.height}）`, 'ok');
  } catch (err) {
    setStatus(err && err.message ? err.message : '下载失败', 'err');
  }
}

async function reset() {
  try {
    const res = await fetch(`/api/design/${encodeURIComponent(boot.designId)}/reset`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ designId: boot.designId }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.message || `重置失败（HTTP ${res.status}）`);
    clearTimeout(saveTimer);
    design = { ...payload.design };
    savedSnapshot = JSON.stringify(design);
    render();
    setStatus('已恢复默认设计', 'ok');
  } catch (err) {
    setStatus(err && err.message ? err.message : '重置失败', 'err');
  }
}

els.title.addEventListener('input', () => {
  design = { ...design, title: els.title.value };
  render();
  scheduleSave();
});
els.subtitle.addEventListener('input', () => {
  design = { ...design, subtitle: els.subtitle.value };
  render();
  scheduleSave();
});
els.cutline.addEventListener('change', () => {
  design = { ...design, cutline: els.cutline.checked };
  render();
  scheduleSave();
});
els.save.addEventListener('click', () => {
  clearTimeout(saveTimer);
  save();
});
els.download.addEventListener('click', () => download('svg'));
els.png.addEventListener('click', () => download('png'));
els.reset.addEventListener('click', reset);

buildThemeButtons();
buildShapeButtons();
render();
if (boot.stored && boot.updatedAt) {
  setStatus(`已载入 ${new Date(boot.updatedAt).toLocaleTimeString('zh-CN')} 保存的设计`, 'ok');
} else {
  setStatus('尚未保存，调整后可点「保存设计」', null);
}