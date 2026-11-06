const STYLE = `
:root{
  --bg:#0e0d0c; --panel:#171513; --line:#2b2724; --ink:#f3ece1; --dim:#a79c8d;
  --hot:#e0473a; --gold:#f2c14e; --ok:#5ec26a;
}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{
  background:radial-gradient(1200px 700px at 12% -10%, #241a15 0%, transparent 62%), var(--bg);
  color:var(--ink);
  font:14px/1.6 "PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;
  display:grid; grid-template-columns:336px 1fr; gap:0; min-height:100vh;
}
@media (max-width:900px){ body{grid-template-columns:1fr} .stage{align-content:start} }
.panel{
  border-right:1px solid var(--line); padding:22px 20px 20px;
  display:flex; flex-direction:column; gap:18px; background:rgba(18,16,15,.72);
  overflow-y:auto; max-height:100vh;
}
.brand{display:flex; align-items:baseline; gap:10px; flex-wrap:wrap}
.brand h1{margin:0; font-size:19px; letter-spacing:.5px}
.brand small{color:var(--dim); font-size:12px; letter-spacing:.14em}
fieldset{border:0; margin:0; padding:0; display:flex; flex-direction:column; gap:9px}
legend{padding:0; color:var(--dim); font-size:12px; letter-spacing:.16em; margin-bottom:2px}
.themes{display:grid; grid-template-columns:repeat(3,1fr); gap:8px}
.theme{
  position:relative; display:flex; flex-direction:column; align-items:center; gap:6px;
  padding:9px 6px; border-radius:12px; border:1px solid var(--line);
  background:#141110; color:var(--dim); cursor:pointer; font-size:12px;
}
.theme:hover{border-color:#453c35}
.theme[aria-pressed="true"]{border-color:var(--gold); color:var(--ink); box-shadow:0 0 0 1px var(--gold) inset}
.theme .chip{width:100%; height:22px; border-radius:7px; border:1px solid rgba(255,255,255,.14)}
.shapes{display:grid; grid-template-columns:repeat(4,1fr); gap:8px}
.shape{
  display:flex; flex-direction:column; align-items:center; gap:7px; padding:9px 2px;
  border-radius:12px; border:1px solid var(--line); background:#141110;
  color:var(--dim); cursor:pointer; font-size:11px;
}
.shape:hover{border-color:#453c35}
.shape[aria-pressed="true"]{border-color:var(--gold); color:var(--ink); box-shadow:0 0 0 1px var(--gold) inset}
.shape i{display:block; border:2px solid currentColor; opacity:.85}
.shape i.r{border-radius:50%}
.shape i.b{width:26px;height:12px;border-radius:4px}
.shape i.c{width:20px;height:16px;border-radius:6px}
.shape i.p{width:14px;height:20px;border-radius:4px}
label.field{display:flex; flex-direction:column; gap:6px; font-size:12px; color:var(--dim)}
input[type=text],textarea{
  width:100%; padding:9px 11px; border-radius:10px; border:1px solid var(--line);
  background:#100e0d; color:var(--ink); font:inherit; font-size:13px; resize:vertical;
}
input[type=text]:focus,textarea:focus,button:focus-visible,.theme:focus-visible,.shape:focus-visible{
  outline:2px solid var(--gold); outline-offset:2px
}
.toggle{display:flex; align-items:center; gap:9px; font-size:13px; color:var(--ink); cursor:pointer}
.toggle input{width:16px; height:16px; accent-color:var(--gold)}
.actions{display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:auto}
button{
  font:inherit; font-size:13px; padding:9px 12px; border-radius:10px; cursor:pointer;
  border:1px solid var(--line); background:#1d1917; color:var(--ink); white-space:nowrap;
}
button:hover{border-color:#4a413a}
button.primary{background:linear-gradient(180deg,#e0473a,#c1352a); border-color:#e0473a; font-weight:600}
button.primary:hover{filter:brightness(1.07)}
button.ghost{background:transparent}
.hint{color:var(--dim); font-size:11.5px; margin:0}
.stage{display:grid; grid-template-rows:auto 1fr auto; align-items:center; padding:26px 32px 20px; gap:16px}
.stage-head{display:flex; justify-content:space-between; align-items:baseline; gap:14px; flex-wrap:wrap}
.stage-head h2{margin:0; font-size:15px; font-weight:600; letter-spacing:.04em}
.stage-head span{color:var(--dim); font-size:12px}
.viewport{display:grid; place-items:center; min-height:0}
.mount{
  width:100%; max-width:min(76vmin,720px); display:grid; place-items:center;
  padding:18px; border-radius:20px;
  background:repeating-conic-gradient(#100f0e 0% 25%, #161413 0% 50%) 50%/26px 26px;
  border:1px solid var(--line);
}
.mount svg{width:100%; height:auto; display:block; filter:drop-shadow(0 14px 30px rgba(0,0,0,.55))}
.stage-foot{display:flex; justify-content:space-between; gap:14px; flex-wrap:wrap; color:var(--dim); font-size:12px}
#status{min-height:1.6em}
#status[data-tone=ok]{color:var(--ok)}
#status[data-tone=err]{color:var(--hot)}
`;

export function renderStudioHtml({ designId, updatedAt, stored, design }) {
  const boot = JSON.stringify({ designId, updatedAt, stored, design }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>鼻窦排涕法 · 车贴设计台</title>
<style>${STYLE}</style>
</head>
<body>
<aside class="panel">
  <div class="brand">
    <h1>鼻窦排涕法 · 车贴设计台</h1>
    <small>CAR&nbsp;STICKER</small>
  </div>

  <fieldset>
    <legend>配色</legend>
    <div class="themes" id="themes" role="group" aria-label="配色方案"></div>
  </fieldset>

  <fieldset>
    <legend>版型</legend>
    <div class="shapes" id="shapes" role="group" aria-label="版型"></div>
  </fieldset>

  <fieldset>
    <legend>文案</legend>
    <label class="field">主标语（放大）
      <input type="text" id="title" maxlength="40" autocomplete="off"/>
    </label>
    <label class="field">副标语
      <textarea id="subtitle" rows="2" maxlength="80"></textarea>
    </label>
    <label class="toggle"><input type="checkbox" id="cutline"/>显示刻字/裁切线</label>
  </fieldset>

  <p class="hint">主标语建议 6–9 字，副标语 12–30 字，上车前放大会更醒目。</p>

  <div class="actions">
    <button class="primary" id="save">保存设计</button>
    <button id="download">下载 SVG</button>
    <button id="png">下载 PNG</button>
    <button class="ghost" id="reset">恢复默认</button>
  </div>
</aside>

<main class="stage">
  <div class="stage-head">
    <h2>预览</h2>
    <span id="meta"></span>
  </div>
  <div class="viewport">
    <div class="mount" id="preview" aria-live="polite" aria-busy="false"></div>
  </div>
  <footer class="stage-foot">
    <span id="status" role="status" aria-live="polite"></span>
    <span>设计编号 <code>${designId}</code></span>
  </footer>
</main>

<script id="boot" type="application/json">${boot}</script>
<script src="/client.js" type="module"></script>
</body>
</html>`;
}