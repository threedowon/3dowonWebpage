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
  return works.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title, 'ko'));
}

export function writeOutput(relPath, html) {
  const full = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html, 'utf8');
}
