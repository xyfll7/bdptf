# 车贴设计台（在线版）

纯静态站点，无框架、无依赖、无构建步骤。3 种配色 × 4 种版型，实时预览，支持导出 SVG / PNG，并可一键打包全部 12 款。

## 本地运行

浏览器的同源策略会阻止在 `file://` 下加载 ES 模块，所以请起一个本地服务器：

```bash
# 任选其一，在仓库根目录执行
python3 -m http.server 8000 --directory docs
npx serve docs
```

然后打开 <http://127.0.0.1:8000/>。

> 在 VS Code 内置浏览器里直接双击 `docs/index.html` 也能用，但主流浏览器（Chrome/Edge/Safari）会因 CORS 拦截模块加载而白屏。

## 部署到 GitHub Pages

仓库已包含 [`.github/workflows/pages.yml`](../.github/workflows/pages.yml)，推送到 `main` 且改动涉及 `docs/**` 时自动发布。

首次启用需要在仓库设置里选一次数据源：

1. 打开 **Settings → Pages**
2. **Build and deployment → Source** 选择 **GitHub Actions**
3. 推送到 `main`，或在 **Actions** 里手动运行 `Deploy stickers site to GitHub Pages`

发布地址为 `https://<用户名>.github.io/<仓库名>/`。

## 文件结构

```
docs/
├── index.html      # 页面结构
├── style.css       # 样式（窄屏时预览置顶、控件下移）
└── lib/
    ├── app.js      # 入口：localStorage 存储 + URL 参数
    ├── studio.js   # 界面与交互（存储以适配器注入）
    ├── design.js   # 设计数据模型、校验与默认值
    └── render.js   # 纯 SVG 渲染器（无依赖）
```

`lib/` 下的 `package.json` 只有 `{"type":"module"}`，用于让 Node 按 ES 模块解析 `.js` 文件；浏览器不需要它。

## 渲染器是共享的

`lib/render.js`、`design.js`、`studio.js` 同时被仓库内的 Canvas 扩展
（[`.github/extensions/bdpf-sticker-studio`](../.github/extensions/bdpf-sticker-studio)）复用，
两边是同一份渲染与交互代码，只有存储适配器不同：

| 宿主 | 存储 |
| --- | --- |
| GitHub Pages 站点 | 浏览器 `localStorage` |
| Canvas 扩展 | `~/.copilot/extension-data/bdpf-sticker-studio/designs/<designId>.json` |

修改渲染逻辑只需改 `docs/lib/render.js`，两边同时生效。

## URL 参数

可以用链接直接指定一套设计，例如：

```
index.html?theme=pop&shape=banner&title=鼻窦排涕法，万岁！&cutline=0
```

支持的参数：`theme`（`vermilion` / `mono` / `pop`）、`shape`（`round` / `banner` / `card` / `portrait`）、
`title`、`subtitle`、`cutline`（`0` 表示关闭裁切线）。

## 数据校验

设计数据带 `format` 与 `version` 标记。浏览器本地存储里的数据损坏、格式不符或版本不兼容时，
页面会提示具体原因并回退到默认设计，而不是静默覆盖。

## 检查

```bash
node --check docs/lib/app.js
node --check docs/lib/studio.js
node --check docs/lib/design.js
node --check docs/lib/render.js
```