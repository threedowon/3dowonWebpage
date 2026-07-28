import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function loadJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

export function loadWorks() {
  const dir = path.join(ROOT, 'content/works');
  const works = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => loadJson(`content/works/${name}`));

  const orderPath = path.join(ROOT, 'content/works-order.json');
  let order = [];
  if (fs.existsSync(orderPath)) {
    order = loadJson('content/works-order.json').order || [];
  }

  const slugSet = new Set(works.map((w) => w.slug));
  const syncedOrder = order.filter((slug) => slugSet.has(slug));
  for (const work of works) {
    if (!syncedOrder.includes(work.slug)) syncedOrder.push(work.slug);
  }

  const orderIndex = new Map(syncedOrder.map((slug, index) => [slug, index]));
  return works.sort(
    (a, b) =>
      (orderIndex.get(a.slug) ?? Number.MAX_SAFE_INTEGER) -
      (orderIndex.get(b.slug) ?? Number.MAX_SAFE_INTEGER)
  );
}

export function writeOutput(relPath, html) {
  const full = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html, 'utf8');
}

export function cleanOrphanWorkPages(slugs, workDirRel = 'work') {
  const workDir = path.join(ROOT, workDirRel);
  if (!fs.existsSync(workDir)) return;

  const keep = new Set(slugs.map((slug) => `${slug}.html`));
  for (const name of fs.readdirSync(workDir)) {
    if (!name.endsWith('.html') || keep.has(name)) continue;
    fs.unlinkSync(path.join(workDir, name));
  }
}

export function assertWorkPageHeaders(relPaths) {
  for (const relPath of relPaths) {
    const html = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
    const required = [
      'site-header--bar',
      'header-bar-col--back',
      'header-bar-col--works',
      'header-bar-col--nav',
    ];
    const missing = required.filter((token) => !html.includes(token));
    if (missing.length) {
      throw new Error(`Invalid header in ${relPath}: missing ${missing.join(', ')}`);
    }
    if (html.includes('header-bar-col--spacer')) {
      throw new Error(`Invalid header in ${relPath}: legacy spacer column found`);
    }
  }
}
