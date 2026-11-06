import { createLocalStorageAdapter, mountStudio } from './studio.js';

mountStudio(document, {
  storage: createLocalStorageAdapter(),
  initialDesign: readDesignFromUrl(),
});

/** Lets links like `?theme=pop&shape=banner&title=…` preselect a design. */
function readDesignFromUrl() {
  const params = new URLSearchParams(globalThis.location?.search || '');
  const design = {};
  for (const key of ['theme', 'shape', 'title', 'subtitle']) {
    const value = params.get(key);
    if (value) design[key] = value;
  }
  if (params.has('cutline')) design.cutline = params.get('cutline') !== '0';
  return Object.keys(design).length ? design : null;
}
