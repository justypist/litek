import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

const BASE_URL = 'https://litek.typist.cc';
const currentDate = new Date().toISOString().split('T')[0];

const tools = [
  { path: '/tool/uuid', priority: '0.9' },
  { path: '/tool/json', priority: '0.9' },
  { path: '/tool/base64', priority: '0.9' },
  { path: '/tool/currency', priority: '0.9' },
  { path: '/tool/image', priority: '0.9' },
  { path: '/tool/network/dns', priority: '0.8' },
  { path: '/tool/network/ping', priority: '0.8' },
  { path: '/tool/network/tcping', priority: '0.8' },
  { path: '/tool/network/speedtest', priority: '0.8' },
  { path: '/tool/network/ipquery', priority: '0.8' },
];

const urls: SitemapUrl[] = [
  {
    loc: BASE_URL,
    lastmod: currentDate,
    changefreq: 'weekly',
    priority: '1.0',
  },
  {
    loc: `${BASE_URL}/tool`,
    lastmod: currentDate,
    changefreq: 'weekly',
    priority: '0.9',
  },
];

// Add all tool pages
tools.forEach((tool) => {
  urls.push({
    loc: `${BASE_URL}${tool.path}`,
    lastmod: currentDate,
    changefreq: 'monthly',
    priority: tool.priority,
  });
});

function generateSitemap(): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  urls.forEach((url) => {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';
  return xml;
}

// Generate and write sitemap
const sitemap = generateSitemap();
const publicDir = path.resolve(__dirname, '../public');
const sitemapPath = path.join(publicDir, 'sitemap.xml');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
console.log(`✅ Sitemap generated successfully at ${sitemapPath}`);

