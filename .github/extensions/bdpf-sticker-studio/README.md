# 鼻窦排涕法 · 车贴设计台

工作区级 Copilot Canvas 扩展：设计、预览并导出「鼻窦排涕法」车贴。

## 结构

```
.github/extensions/bdpf-sticker-studio/
├── extension.mjs      # Canvas 声明（open / actions / onClose）与本地 HTTP 服务
├── lib/
│   ├── render.mjs     # 纯 SVG 渲染器（无副作用，可单测）
│   └── store.mjs      # 设计读写：原子写入 + 格式/版本校验
└── assets/
    ├── page.mjs       # 设计台页面 HTML
    └── client.js      # 前端交互（切换、自动保存、导出）
```

## Canvas 接口

- Canvas ID：`bdpf-sticker-studio`
- 打开输入：`{ "designId"?: string }`（默认 `default`）
- Actions：
  - `getDesign` — 读取已保存设计
  - `setDesign` — 保存设计（可只传部分字段，其余沿用已存值）
  - `resetDesign` — 恢复默认文案与样式
  - `exportSvg` — 返回 SVG 源码与尺寸

## 可选项

| 字段 | 取值 |
| --- | --- |
| `theme` | `vermilion` 朱红金 / `mono` 极简黑白 / `pop` 国潮撞色 |
| `shape` | `round` 圆形贴 1200² / `banner` 横幅贴 1600×460 / `card` 圆角贴 1120×780 / `portrait` 竖版贴 760×1320 |
| `title` | 主标语（放大），≤ 40 字 |
| `subtitle` | 副标语，≤ 80 字，按逗号自动断行 |
| `cutline` | 是否显示刻字/裁切线 |

## 数据位置

设计保存在仓库外的私有目录，避免把个人方案提交进版本库：

```
~/.copilot/extension-data/bdpf-sticker-studio/designs/<designId>.json
```

文件带 `format` 与 `version` 标记；无法识别或损坏的数据会报错而不是被覆盖。

## 验证

```bash
node --check extension.mjs
node --check lib/render.mjs
node --check lib/store.mjs
node --check assets/page.mjs
node --check assets/client.js
```