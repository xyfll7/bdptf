/**
 * Pure SVG renderer for the 鼻窦排涕法 car-sticker studio.
 * No host APIs: callable from the HTTP layer and from tests.
 */

export const THEMES = {
  vermilion: {
    name: '朱红金',
    bg: '#B01F24',
    bgEdge: '#8C1519',
    ink: '#FFF6E3',
    accent: '#F2C14E',
    sub: '#FFE0BD',
    ring: '#F2C14E',
    sealBg: '#FFF6E3',
    sealInk: '#B01F24',
    gradient: true,
    dots: true,
  },
  mono: {
    name: '极简黑白',
    bg: '#FFFFFF',
    bgEdge: '#FFFFFF',
    ink: '#111111',
    accent: '#111111',
    sub: '#3D3D3D',
    ring: '#111111',
    sealBg: '#111111',
    sealInk: '#FFFFFF',
    gradient: false,
    dots: false,
  },
  pop: {
    name: '国潮撞色',
    bg: '#FFD400',
    bgEdge: '#F5C400',
    ink: '#161310',
    accent: '#E23A28',
    sub: '#241F1A',
    ring: '#161310',
    sealBg: '#E23A28',
    sealInk: '#FFD400',
    gradient: false,
    dots: true,
  },
};

export const SHAPES = {
  round: { name: '圆形贴', w: 1200, h: 1200 },
  banner: { name: '横幅贴', w: 1600, h: 460 },
  card: { name: '圆角贴', w: 1120, h: 780 },
  portrait: { name: '竖版贴', w: 760, h: 1320 },
};

const FONT =
  '"PingFang SC","Hiragino Sans GB","Noto Sans SC","Source Han Sans SC","Microsoft YaHei",sans-serif';

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unitWidth(ch) {
  if (/[\u2E80-\u9FFF\u3000-\u303F\uFF00-\uFFEF]/.test(ch)) return 1;
  if (ch === ' ') return 0.32;
  if (/[A-Z]/.test(ch)) return 0.67;
  if (/[a-z0-9]/.test(ch)) return 0.56;
  return 0.42;
}

export function textWidth(text, size) {
  let units = 0;
  for (const ch of String(text)) units += unitWidth(ch);
  return units * size;
}

function fit(text, maxWidth, preferred, min = 22) {
  const units = Math.max(0.001, (() => {
    let n = 0;
    for (const ch of String(text)) n += unitWidth(ch);
    return n;
  })());
  return Math.max(min, Math.min(preferred, maxWidth / units));
}

/** Splits the slogan into the headline and the shout. */
export function splitTitle(title) {
  const parts = String(title)
    .split(/[，,]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { main: '鼻窦排涕法', punch: '' };
  return { main: parts[0], punch: parts.slice(1).join('，') };
}

export function splitSlogan(subtitle) {
  const clauses = String(subtitle)
    .split(/[，,、]/)
    .map((p) => p.replace(/[。.!！\s]+$/g, '').trim())
    .filter(Boolean);
  return clauses.length ? clauses : ['排涕', '养鼻'];
}

function packLines(clauses, maxChars) {
  const lines = [];
  let current = '';
  for (const clause of clauses) {
    if (current === '') {
      current = clause;
      continue;
    }
    if ([...current, ...clause].length + 1 <= maxChars) {
      current += `，${clause}`;
    } else {
      lines.push(current);
      current = clause;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function text(x, y, size, content, opts = {}) {
  const {
    fill = '#000',
    weight = 700,
    anchor = 'middle',
    spacing = 0,
    opacity,
    transform,
  } = opts;
  const attrs = [
    `x="${round(x)}"`,
    `y="${round(y)}"`,
    `font-size="${round(size)}"`,
    `font-weight="${weight}"`,
    `fill="${fill}"`,
    `text-anchor="${anchor}"`,
    `font-family='${FONT}'`,
  ];
  if (spacing) attrs.push(`letter-spacing="${round(spacing)}"`);
  if (opacity != null) attrs.push(`opacity="${opacity}"`);
  if (transform) attrs.push(`transform="${transform}"`);
  return `<text ${attrs.join(' ')}>${escapeXml(content)}</text>`;
}

function round(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

function seal(cx, cy, size, theme, char = '鼻') {
  const half = size / 2;
  const r = size * 0.16;
  return [
    `<rect x="${round(cx - half)}" y="${round(cy - half)}" width="${size}" height="${size}" rx="${round(r)}" fill="${theme.sealBg}"/>`,
    text(cx, cy + size * 0.055, size * 0.62, char, {
      fill: theme.sealInk,
      weight: 800,
      anchor: 'middle',
    }),
  ].join('');
}

function rule(cx, y, half, theme) {
  const gap = 16;
  return [
    `<line x1="${round(cx - half)}" y1="${y}" x2="${round(cx - gap)}" y2="${y}" stroke="${theme.ring}" stroke-width="3" stroke-linecap="round"/>`,
    `<line x1="${round(cx + gap)}" y1="${y}" x2="${round(cx + half)}" y2="${y}" stroke="${theme.ring}" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M ${cx} ${y - 7} L ${cx + 7} ${y} L ${cx} ${y + 7} L ${cx - 7} ${y} Z" fill="${theme.accent}"/>`,
  ].join('');
}

function defs(theme, id) {
  if (!theme.gradient) return '';
  return `<defs><linearGradient id="bg-${id}" x1="0" y1="0" x2="0.35" y2="1">
    <stop offset="0" stop-color="${theme.bg}"/>
    <stop offset="1" stop-color="${theme.bgEdge}"/>
  </linearGradient></defs>`;
}

function ringDots(cx, cy, r, theme) {
  if (!theme.dots) return '';
  const dots = [45, 135, 225, 315]
    .map((deg) => {
      const rad = (deg * Math.PI) / 180;
      return `<circle cx="${round(cx + r * Math.cos(rad))}" cy="${round(cy + r * Math.sin(rad))}" r="7" fill="${theme.accent}"/>`;
    })
    .join('');
  return dots;
}

function cutlineShape(shape, box, theme) {
  const stroke = `stroke="${theme.accent}" stroke-opacity="0.55" stroke-width="2" stroke-dasharray="14 12" fill="none"`;
  if (shape === 'round') {
    return `<circle cx="${box.w / 2}" cy="${box.h / 2}" r="${box.w / 2 - 10}" ${stroke}/>`;
  }
  return `<rect x="${box.x + 10}" y="${box.y + 10}" width="${box.w - 20}" height="${box.h - 20}" rx="${box.r}" ${stroke}/>`;
}

function roundBadge(theme, design) {
  const w = SHAPES.round.w;
  const cx = w / 2;
  const cy = w / 2;
  const { main, punch } = splitTitle(design.title);
  const lines = packLines(splitSlogan(design.subtitle), 8);
  const inner = 540;
  const out = [];

  out.push(defs(theme, 'round'));
  out.push(`<circle cx="${cx}" cy="${cy}" r="${w / 2}" fill="${theme.gradient ? 'url(#bg-round)' : theme.bg}"/>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${round(w / 2 - 24)}" fill="none" stroke="${theme.ring}" stroke-width="5"/>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${round(w / 2 - 46)}" fill="none" stroke="${theme.ring}" stroke-width="1.5" stroke-opacity="0.65"/>`);
  out.push(ringDots(cx, cy, w / 2 - 46, theme));

  const titleSize = fit(main, inner * 1.8, 172, 60);
  out.push(text(cx, 460, titleSize, main, { fill: theme.ink, weight: 800, spacing: 4 }));

  if (punch) {
    const punchSize = fit(punch, inner * 1.7, 220, 90);
    out.push(text(cx, 700, punchSize, punch, { fill: theme.accent, weight: 800, spacing: 6 }));
  }

  out.push(rule(cx, 766, 168, theme));

  let y = punch ? 846 : 726;
  for (const line of lines) {
    const size = fit(line, inner * 1.75, 56, 30);
    out.push(text(cx, y, size, line, { fill: theme.sub, weight: 500, spacing: 2 }));
    y += 68;
  }

  out.push(seal(cx, punch ? 1058 : 980, 88, theme));
  if (design.cutline) out.push(cutlineShape('round', { w, h: w }, theme));
  return wrapSvg(w, w, out.join(''));
}

function banner(theme, design) {
  const { w, h } = SHAPES.banner;
  const padX = 56;
  const box = { x: padX, y: padX, w: w - padX * 2, h: h - padX * 2, r: 26 };
  const { main, punch } = splitTitle(design.title);
  const line = punch ? `${main}，${punch}` : main;
  const slogan = splitSlogan(design.subtitle).join(' · ');
  const out = [];

  out.push(defs(theme, 'banner'));
  out.push(`<rect width="${w}" height="${h}" rx="40" fill="${theme.gradient ? 'url(#bg-banner)' : theme.bg}"/>`);
  out.push(`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${box.r}" fill="none" stroke="${theme.ring}" stroke-width="4"/>`);

  const titleSize = fit(line, box.w - 60, 116, 48);
  out.push(text(w / 2, 190, titleSize, line, { fill: theme.ink, weight: 800, spacing: 5 }));
  out.push(rule(w / 2, 252, Math.min(box.w / 2 - 60, 280), theme));
  const sloganSize = fit(slogan, box.w - 80, 52, 26);
  out.push(text(w / 2, 336, sloganSize, slogan, { fill: theme.sub, weight: 500, spacing: 1 }));

  if (design.cutline) out.push(cutlineShape('banner', box, theme));
  return wrapSvg(w, h, out.join(''));
}

function card(theme, design) {
  const { w, h } = SHAPES.card;
  const box = { x: 26, y: 26, w: w - 52, h: h - 52, r: 52 };
  const { main, punch } = splitTitle(design.title);
  const lines = packLines(splitSlogan(design.subtitle), 7);
  const out = [];

  out.push(defs(theme, 'card'));
  out.push(`<rect width="${w}" height="${h}" rx="64" fill="${theme.gradient ? 'url(#bg-card)' : theme.bg}"/>`);
  out.push(`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${box.r}" fill="none" stroke="${theme.ring}" stroke-width="4"/>`);

  const titleSize = fit(main, box.w - 120, 128, 48);
  out.push(text(w / 2, 250, titleSize, main, { fill: theme.ink, weight: 800, spacing: 5 }));

  if (punch) {
    const punchSize = fit(punch, box.w - 160, 156, 70);
    out.push(text(w / 2, 432, punchSize, punch, { fill: theme.accent, weight: 800, spacing: 8 }));
  }

  out.push(rule(w / 2, 496, 190, theme));

  let y = punch ? 578 : 452;
  for (const line of lines) {
    const size = fit(line, box.w - 120, 52, 28);
    out.push(text(w / 2, y, size, line, { fill: theme.sub, weight: 500, spacing: 2 }));
    y += 64;
  }

  out.push(seal(box.w - 46, h - 78, 78, theme));
  if (design.cutline) out.push(cutlineShape('card', box, theme));
  return wrapSvg(w, h, out.join(''));
}

function portrait(theme, design) {
  const { w, h } = SHAPES.portrait;
  const box = { x: 22, y: 22, w: w - 44, h: h - 44, r: 34 };
  const { main, punch } = splitTitle(design.title);
  const chars = [...main];
  const punchChars = [...punch.replace(/[，,\s]/g, '')];
  const lines = packLines(splitSlogan(design.subtitle), 6);
  const out = [];

  out.push(defs(theme, 'portrait'));
  out.push(`<rect width="${w}" height="${h}" rx="44" fill="${theme.gradient ? 'url(#bg-portrait)' : theme.bg}"/>`);
  out.push(`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${box.r}" fill="none" stroke="${theme.ring}" stroke-width="4"/>`);

  const top = 120;
  const columnHeight = h * 0.46;
  const rows = Math.max(chars.length, punchChars.length);
  const mainSize = Math.min(118, columnHeight / (rows * 1.14));
  const step = mainSize * 1.14;
  const punchSize = Math.min(134, mainSize * 1.12);
  const gapX = Math.max(mainSize * 1.15, 130);
  const mainX = w / 2 + gapX / 2;
  const punchX = w / 2 - gapX / 2;
  const firstBaseline = top + mainSize * 0.84;

  chars.forEach((ch, i) => {
    out.push(text(mainX, firstBaseline + i * step, mainSize, ch, { fill: theme.ink, weight: 800 }));
  });

  const mainSpan = Math.max(0, chars.length - 1) * step;
  const punchSpan = Math.max(0, punchChars.length - 1) * punchSize * 1.14;
  const punchTop = firstBaseline + (mainSpan - punchSpan) / 2;
  punchChars.forEach((ch, i) => {
    out.push(
      text(punchX, punchTop + i * punchSize * 1.14, punchSize, ch, { fill: theme.accent, weight: 800 }),
    );
  });

  const bottomOfBlock = Math.max(
    firstBaseline + (chars.length - 1) * step,
    punchTop + Math.max(0, punchChars.length - 1) * punchSize * 1.14,
  );
  const subTop = bottomOfBlock + mainSize * 0.55;
  out.push(
    `<line x1="${box.x + 80}" y1="${round(subTop)}" x2="${box.x + box.w - 80}" y2="${round(subTop)}" stroke="${theme.ring}" stroke-width="2.5" stroke-opacity="0.7"/>`,
  );

  const sloganSize = 50;
  let y = subTop + 78;
  for (const line of lines) {
    const size = fit(line, box.w - 140, sloganSize, 26);
    out.push(text(w / 2, y, size, line, { fill: theme.sub, weight: 500, spacing: 3 }));
    y += 68;
  }

  out.push(seal(w / 2, h - 104, 82, theme));
  if (design.cutline) out.push(cutlineShape('portrait', box, theme));
  return wrapSvg(w, h, out.join(''));
}

function wrapSvg(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">${body}</svg>`;
}

export function renderSvg(design) {
  const theme = THEMES[design.theme] || THEMES.vermilion;
  switch (design.shape) {
    case 'banner':
      return banner(theme, design);
    case 'card':
      return card(theme, design);
    case 'portrait':
      return portrait(theme, design);
    case 'round':
    default:
      return roundBadge(theme, design);
  }
}

export function renderDataUri(design) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSvg(design))}`;
}