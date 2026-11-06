import { mountStudio } from '/lib/studio.js';

const el = document.getElementById('boot');
const boot = el ? JSON.parse(el.textContent) : { designId: 'default', design: null };

mountStudio(document, {
  initialDesign: boot.design,
  storage: {
    load: () => (boot.stored ? { format: 'bdpf-sticker-studio/design', version: 1, design: boot.design } : null),
    save: async (design) => {
      const res = await fetch('/api/design', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ designId: boot.designId, design }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || `保存失败（HTTP ${res.status}）`);
      boot.design = payload.design;
      boot.stored = true;
      return { updatedAt: payload.updatedAt };
    },
  },
});
