// Writes static HTML for public content pages, plus sitemap.xml and robots.txt, into dist/.
// Runs after `vite build` (the app) and `vite build --ssr src/entry-prerender.tsx` (the renderer).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrDir = join(root, 'dist-ssr')
const siteUrl = (process.env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/$/, '')
const appEnv = process.env.VITE_APP_ENV || 'local'

const { pages, render } = await import(pathToFileURL(join(ssrDir, 'entry-prerender.js')).href)
const template = readFileSync(join(dist, 'index.html'), 'utf8')

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

for (const page of pages()) {
  const app = await render(page.path)
  const html = template
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace('</head>', `  <link rel="canonical" href="${siteUrl}${page.path}" />\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${app}</div>`)
  // "/itineraries/kerala" → itineraries/kerala.html: Cloudflare serves it at that exact address,
  // with no redirect to a trailing slash (which a folder/index.html would cause).
  const file = page.path === '/' ? join(dist, 'index.html') : join(dist, `${page.path.slice(1)}.html`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...pages().map((p) => `  <url><loc>${siteUrl}${p.path}</loc></url>`),
  '</urlset>',
  '',
].join('\n')
writeFileSync(join(dist, 'sitemap.xml'), sitemap)

// Only production is indexed; test sites tell search engines to stay away.
const robots =
  appEnv === 'production'
    ? `User-agent: *\nDisallow: /trips\nDisallow: /agent\nDisallow: /admin\nSitemap: ${siteUrl}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n'
writeFileSync(join(dist, 'robots.txt'), robots)

rmSync(ssrDir, { recursive: true, force: true })
console.log(`Pre-rendered ${pages().length} pages for ${siteUrl} (${appEnv}).`)
