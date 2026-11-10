# 鼻窦排涕法

一个用 [Hugo](https://gohugo.io/) + [PaperMod](https://github.com/adityatelange/hugo-PaperMod)
搭的中文博客，收录 **42** 篇关于鼻炎、鼻窦炎、洗鼻子与排涕的实践笔记，
外加一台在线**车贴设计台**。

- 线上站点：<https://xyfll7.github.io/bdptf/>
- 车贴设计台：<https://xyfll7.github.io/bdptf/sticker/>

## 技术栈

| 项目 | 说明 |
| --- | --- |
| 静态站点生成器 | Hugo Extended 0.169.0（≥ 0.158.0） |
| 主题 | PaperMod 14k★，支持暗色模式、内置搜索、归档 |
| 搜索 | PaperMod 自带 Fuse.js 客户端搜索（`/search/`） |
| 车贴设计台 | 纯 SVG 渲染 + Canvas 导出，无框架、无构建步骤 |
| 部署 | GitHub Actions → GitHub Pages |

## 目录结构

```
hugo.yaml                 站点配置（菜单、搜索、分页、taxonomy）
content/
  posts/post-01.md …      42 篇文章（front matter + Markdown）
  search.md               搜索页（layout: search）
  archives.md             归档页（layout: archives）
  sticker.md              车贴设计台页面（layout: sticker）
layouts/
  sticker.html            /sticker/ 页模板，嵌入 static/sticker 的设计台
  _markup/render-image.html  图片渲染覆盖，让 /images/... 带上 baseURL 前缀
static/
  images/                 文章配图（原 images/ 的同构拷贝）
  sticker/
    sticker.css           设计台样式（全部选择器限定在 .studio 内）
    studio.html           独立全屏宿主页（Canvas 扩展用）
    lib/                  app.js / studio.js / design.js / render.js
articles/                 原始 Markdown 归档（迁移来源，保留不动）
images/                   原始配图（迁移来源，保留不动）
scripts/import-articles.mjs   articles/ → content/posts/ 的可重跑迁移脚本
themes/PaperMod/          主题（vendor 进仓库，不走 submodule）
.github/workflows/pages.yml  构建 + 部署到 Pages
```

## 本地开发

Hugo 需为 **extended ≥ 0.158.0**（PaperMod 要求）。

```bash
# 启动带热重载的本地服务
hugo server -D

# 只构建
hugo --minify --gc --destination ./public
```

打开 <http://127.0.0.1:1313/>，车贴设计台在 <http://127.0.0.1:1313/sticker/>。

> Windows 上若 `hugo` 不在 PATH，用 WinGet 安装的绝对路径调用：
> `C:\Users\<你>\AppData\Local\Microsoft\WinGet\Packages\Hugo.Hugo.Extended_*\hugo.exe`

## 部署

推送到 `main` 即触发 `.github/workflows/pages.yml`：

1. `peaceiris/actions-hugo` 安装 Hugo 0.169.0；
2. `node --check` 校验 `static/sticker/lib/*.js` 语法；
3. `hugo --minify --gc --baseURL "${{ steps.pages.outputs.base_url }}/"`；
4. 产物通过 `actions/deploy-pages` 发布。

站点部署在子路径 `/bdptf/`，因此所有资源都用 `relURL`，
文章配图由 `layouts/_markup/render-image.html` 自动补前缀。

## 车贴设计台

三种配色（朱红金 / 极简黑白 / 国潮撞色）× 四种版型（圆形贴 / 横幅贴 / 圆角贴 / 竖版贴）
= 12 款，实时预览，导出 SVG（矢量、可直接送印）或 PNG，也可一键打包 12 款。

支持 URL 参数直接指定设计，便于分享：

```
/sticker/?theme=pop&shape=banner&title=鼻窦排涕法，万岁！&subtitle=排涕，养鼻&cutline=0
```

| 参数 | 取值 | 默认 |
| --- | --- | --- |
| `theme` | `vermilion` / `mono` / `pop` | `vermilion` |
| `shape` | `round` / `banner` / `card` / `portrait` | `round` |
| `title` | 主标语，≤ 40 字 | `鼻窦排涕法，万岁！` |
| `subtitle` | 副标语，≤ 80 字 | `排涕，养鼻，把鼻涕洗干净，让鼻子休息好！` |
| `cutline` | `1` / `0` | `1` |

设计改动保存在浏览器 `localStorage`。同一套 `static/sticker/lib` 模块也被
`.github/extensions/bdpf-sticker-studio` 复用，仅存储适配器不同
（浏览器 `localStorage` vs Canvas 的 `~/.copilot/extension-data/...`）。

## 文章清单

共 **42** 篇，按抖音发布顺序排列；线上路径为 `/posts/post-NN/`。
`articles/` 下的原始文件保留作为迁移来源。

<table>
  <thead>
    <tr>
      <th align="right" width="56">&nbsp;#&nbsp;</th>
      <th align="center" width="116" nowrap>日期</th>
      <th align="center" width="72" nowrap>类型</th>
      <th align="left">标题</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="right">1</td>
      <td align="center" nowrap>2026.10.25</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-01/">你多久没吃过小时候吃过的那种鼻涕了？</a></td>
    </tr>
    <tr>
      <td align="right">2</td>
      <td align="center" nowrap>2026.10.13</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-02/">揭开“免疫力”的“骗局”</a></td>
    </tr>
    <tr>
      <td align="right">3</td>
      <td align="center" nowrap>2026.09.22</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-03/">鼻窦排涕法，心路历程</a></td>
    </tr>
    <tr>
      <td align="right">4</td>
      <td align="center" nowrap>2026.11.04</td>
      <td align="center" nowrap>图文</td>
      <td align="left"><a href="/posts/post-04/">鼻窦排涕法</a></td>
    </tr>
    <tr>
      <td align="right">5</td>
      <td align="center" nowrap>2026.11.03</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-05/">如何对付非常黏腻，粘附性极强的鼻涕？</a></td>
    </tr>
    <tr>
      <td align="right">6</td>
      <td align="center" nowrap>2026.11.02</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-06/">中医是怎么看待发烧的？</a></td>
    </tr>
    <tr>
      <td align="right">7</td>
      <td align="center" nowrap>2026.11.02</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-07/">再聊鼻窦排涕法</a></td>
    </tr>
    <tr>
      <td align="right">8</td>
      <td align="center" nowrap>2026.11.01</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-08/">一定不要低估了洗鼻子的威力</a></td>
    </tr>
    <tr>
      <td align="right">9</td>
      <td align="center" nowrap>2026.11.01</td>
      <td align="center" nowrap>图文</td>
      <td align="left"><a href="/posts/post-09/">鼻窦排涕法</a></td>
    </tr>
    <tr>
      <td align="right">10</td>
      <td align="center" nowrap>2026.11.01</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-10/">我是怎么得上过敏性鼻炎，鼻窦炎的？</a></td>
    </tr>
    <tr>
      <td align="right">11</td>
      <td align="center" nowrap>2026.10.30</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-11/">药，只是治病的一环</a></td>
    </tr>
    <tr>
      <td align="right">12</td>
      <td align="center" nowrap>2026.10.27</td>
      <td align="center" nowrap>图文</td>
      <td align="left"><a href="/posts/post-12/">洗鼻子，没那么简单。洗鼻子，要用对方法，有思路，正确认识，心态放好！</a></td>
    </tr>
    <tr>
      <td align="right">13</td>
      <td align="center" nowrap>2026.10.26</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-13/">为什么“发汗”可以有效止咳？</a></td>
    </tr>
    <tr>
      <td align="right">14</td>
      <td align="center" nowrap>2026.10.23</td>
      <td align="center" nowrap>图文</td>
      <td align="left"><a href="/posts/post-14/">啥都做了，就是没洗鼻子</a></td>
    </tr>
    <tr>
      <td align="right">15</td>
      <td align="center" nowrap>2026.10.22</td>
      <td align="center" nowrap>图文</td>
      <td align="left"><a href="/posts/post-15/">鼻涕水怎么还成了保护鼻粘膜的“保护毯”？</a></td>
    </tr>
    <tr>
      <td align="right">16</td>
      <td align="center" nowrap>2026.10.21</td>
      <td align="center" nowrap>图文</td>
      <td align="left"><a href="/posts/post-16/">清洗鼻腔推荐用什么工具？</a></td>
    </tr>
    <tr>
      <td align="right">17</td>
      <td align="center" nowrap>2026.10.20</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-17/">病才是病，证不是病，别把症状当病治</a></td>
    </tr>
    <tr>
      <td align="right">18</td>
      <td align="center" nowrap>2026.10.17</td>
      <td align="center" nowrap>图文</td>
      <td align="left"><a href="/posts/post-18/">1 岁宝宝怎么排涕</a></td>
    </tr>
    <tr>
      <td align="right">19</td>
      <td align="center" nowrap>2026.10.15</td>
      <td align="center" nowrap>视频</td>
      <td align="left"><a href="/posts/post-19/">科学排涕(洗鼻子)，鼻窦排涕法，万岁！</a></td>
    </tr>
    <tr>
      <td align="right">20</td>
      <td align="center" nowrap>2026.10.13</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-20/">万物皆为树</a></td>
    </tr>
    <tr>
      <td align="right">21</td>
      <td align="center" nowrap>2026.10.10</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-21/">科学洗鼻子</a></td>
    </tr>
    <tr>
      <td align="right">22</td>
      <td align="center" nowrap>2026.10.10</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-22/">错误的洗鼻子方式危害大</a></td>
    </tr>
    <tr>
      <td align="right">23</td>
      <td align="center" nowrap>2026.10.08</td>
      <td align="center" nowrap>视频</td>
      <td align="left"><a href="/posts/post-23/">病从鼻入：千万别等鼻炎犯了，才想起洗鼻子</a></td>
    </tr>
    <tr>
      <td align="right">24</td>
      <td align="center" nowrap>2026.10.08</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-24/">中医到底是什么？</a></td>
    </tr>
    <tr>
      <td align="right">25</td>
      <td align="center" nowrap>2026.10.08</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-25/">小朋友怎么喷洗鼻腔？</a></td>
    </tr>
    <tr>
      <td align="right">26</td>
      <td align="center" nowrap>2026.10.06</td>
      <td align="center" nowrap>图文</td>
      <td align="left"><a href="/posts/post-26/">病从鼻入。为什么给孩子做雾化？做了好久都不管用？</a></td>
    </tr>
    <tr>
      <td align="right">27</td>
      <td align="center" nowrap>2026.10.05</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-27/">重度鼻炎患者，是如何躲过秋季感冒的？</a></td>
    </tr>
    <tr>
      <td align="right">28</td>
      <td align="center" nowrap>2026.10.01</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-28/">鼻窦排涕做了十几天了，怎么鼻涕反而变多了？</a></td>
    </tr>
    <tr>
      <td align="right">29</td>
      <td align="center" nowrap>2026.09.30</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-29/">用小喷瓶洗鼻子的优势是什么？</a></td>
    </tr>
    <tr>
      <td align="right">30</td>
      <td align="center" nowrap>2026.09.30</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-30/">鼻炎为什么会在春秋两季发作？</a></td>
    </tr>
    <tr>
      <td align="right">31</td>
      <td align="center" nowrap>2026.09.30</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-31/">西医的核心是对抗杀菌，中医的核心是疏通排瘀</a></td>
    </tr>
    <tr>
      <td align="right">32</td>
      <td align="center" nowrap>2026.09.29</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-32/">鼻窦排涕核心原理</a></td>
    </tr>
    <tr>
      <td align="right">33</td>
      <td align="center" nowrap>2026.09.27</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-33/">你的鼻腔体，就像一块布满病菌的海绵盖在泉眼上</a></td>
    </tr>
    <tr>
      <td align="right">34</td>
      <td align="center" nowrap>2026.09.27</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-34/">“过敏性鼻炎”命名误导了治疗方向</a></td>
    </tr>
    <tr>
      <td align="right">35</td>
      <td align="center" nowrap>2026.09.26</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-35/">为什么清洗鼻腔是一个漫长的过程？</a></td>
    </tr>
    <tr>
      <td align="right">36</td>
      <td align="center" nowrap>2026.09.26</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-36/">人们对鼻炎的认识从根上就错了</a></td>
    </tr>
    <tr>
      <td align="right">37</td>
      <td align="center" nowrap>2026.09.25</td>
      <td align="center" nowrap>图文</td>
      <td align="left"><a href="/posts/post-37/">病从鼻入。千万不要用力擤鼻涕。会把鼻涕冲进中耳。反冲回鼻窦。哪种后果你都承受不了</a></td>
    </tr>
    <tr>
      <td align="right">38</td>
      <td align="center" nowrap>2026.09.24</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-38/">感冒是不是好了？千万别得意</a></td>
    </tr>
    <tr>
      <td align="right">39</td>
      <td align="center" nowrap>2026.09.20</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-39/">鼻炎真正的罪魁祸首</a></td>
    </tr>
    <tr>
      <td align="right">40</td>
      <td align="center" nowrap>2026.09.19</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-40/">鼻窦排涕法</a></td>
    </tr>
    <tr>
      <td align="right">41</td>
      <td align="center" nowrap>2026.09.04</td>
      <td align="center" nowrap>长文</td>
      <td align="left"><a href="/posts/post-41/">病从鼻入</a></td>
    </tr>
    <tr>
      <td align="right">42</td>
      <td align="center" nowrap>2026.05.18</td>
      <td align="center" nowrap>图文</td>
      <td align="left"><a href="/posts/post-42/">逻辑学，就像显微镜切片观察法，辩证法，就像解剖观察法，阴阳论，就像生长过程观察法</a></td>
    </tr>
  </tbody>
</table>
