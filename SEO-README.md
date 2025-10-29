# SEO 优化说明

本项目已完成基础 SEO 优化，以下是已实施的改动。

## 已完成的优化项

### 1. HTML Meta 标签优化 ✅

在 `index.html` 中添加了完整的 SEO 元数据：

- **基础 Meta 标签**
  - title, description, keywords
  - author, theme-color
  - canonical URL
  
- **Open Graph 标签**（社交媒体分享优化）
  - og:type, og:url, og:title
  - og:description, og:image, og:site_name
  
- **Twitter Card 标签**
  - twitter:card, twitter:title
  - twitter:description, twitter:image

- **结构化数据**（JSON-LD）
  - Schema.org WebSite 类型标记
  - 提升搜索引擎理解能力

### 2. SEO 配置文件 ✅

- **`public/robots.txt`** - 搜索引擎爬虫规则
  - 允许所有爬虫访问
  - 指定 sitemap 位置
  
- **`public/sitemap.xml`** - 站点地图（自动生成）
  - 包含所有工具页面 URL
  - 设置更新频率和优先级
  - 通过 `scripts/generate-sitemap.ts` 自动生成
  
- **`public/manifest.json`** - PWA 配置
  - 支持渐进式 Web 应用
  - 改善移动端体验

### 3. 构建流程优化 ✅

- **`package.json`**
  - 构建时自动生成 sitemap
  - 添加 tsx 依赖用于运行生成脚本

## 文件清单

### 新增文件
```
public/
├── robots.txt              # 爬虫规则
├── sitemap.xml            # 站点地图（自动生成）
└── manifest.json          # PWA 配置

scripts/
└── generate-sitemap.ts    # Sitemap 生成脚本
```

### 修改文件
```
index.html                 # 添加 SEO meta 标签和结构化数据
package.json               # 添加 sitemap 生成命令
```

## 使用说明

### 开发
```bash
pnpm install               # 安装依赖
pnpm dev                   # 启动开发服务器
```

### 构建
```bash
pnpm run build             # 构建项目（自动生成 sitemap）
pnpm run generate:sitemap  # 单独生成 sitemap
```

### 部署前检查

⚠️ **重要：部署前必须更新配置文件中的域名！**

需要将以下文件中的 `https://litek.typist.cc` 替换为你的实际域名：

1. **`index.html`**
   - canonical URL
   - Open Graph URL 和 image
   - Twitter Card image
   - Structured Data URL

2. **`public/robots.txt`**
   - Sitemap URL

3. **`scripts/generate-sitemap.ts`**
   - BASE_URL 常量

更新后重新构建：
```bash
pnpm run build
```

## SEO 验证

### 部署后验证

1. **提交 sitemap 到 Google Search Console**
   - 访问 https://search.google.com/search-console
   - 添加网站资源
   - 提交 sitemap: `https://你的域名/sitemap.xml`

2. **测试结构化数据**
   - 访问 https://validator.schema.org/
   - 输入网站 URL
   - 检查是否有错误

3. **测试 Open Graph 预览**
   - Facebook: https://developers.facebook.com/tools/debug/
   - Twitter: https://cards-dev.twitter.com/validator

4. **性能测试**
   - Google PageSpeed Insights: https://pagespeed.web.dev/
   - 目标分数: SEO > 95

## 可访问的 URL

部署后，以下 URL 应该可以正常访问：

- `https://你的域名/` - 主页
- `https://你的域名/robots.txt` - 爬虫规则
- `https://你的域名/sitemap.xml` - 站点地图
- `https://你的域名/manifest.json` - PWA 配置
- `https://你的域名/tool/uuid` - UUID 工具
- `https://你的域名/tool/json` - JSON 工具
- `https://你的域名/tool/base64` - Base64 工具
- `https://你的域名/tool/network/dns` - DNS 工具
- ... 其他工具页面

## 添加新工具时更新 SEO

当添加新工具时，需要更新 `scripts/generate-sitemap.ts`：

```typescript
const tools = [
  // 现有工具...
  { path: '/tool/你的新工具', priority: '0.9' },
];
```

然后重新构建项目。

## SEO 效果预期

- **1-2 周**：搜索引擎开始索引页面
- **1-2 月**：主要关键词开始有排名
- **3-6 月**：稳定的搜索排名和自然流量增长

## 技术栈

- React 19 + TypeScript
- Vite (Rolldown)
- React Router v7
- Radix UI + Tailwind CSS 4
- Nginx

## 联系方式

需要更多工具或有建议？联系：litek@mail.typist.cc

