import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function writeJson(file, data) {
  const full = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function parseAttrs(attrString) {
  const attrs = {};
  for (const match of attrString.matchAll(/data-([a-z-]+)="([^"]*)"/g)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function extractGridPosts(html) {
  const posts = [];
  const re =
    /<a href="work\/([^"]+)" class="img-post[^"]*"\s*([^>]*)>[\s\S]*?background-image:url\(([^)]+)\)[\s\S]*?img-post-title">([^<]+)<[\s\S]*?img-post-type">([^<]+)<[\s\S]*?img-post-year">(\d{4})</g;
  for (const match of html.matchAll(re)) {
    const attrs = parseAttrs(match[2]);
    posts.push({
      slug: match[1].replace(/\.html$/, ''),
      title: match[4].trim(),
      year: Number(match[6]),
      type: attrs.type || '',
      tags: attrs.tags ? attrs.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      tech: attrs.tech ? attrs.tech.split(',').map((t) => t.trim()).filter(Boolean) : [],
      production: attrs.production || '개인',
      thumbnail: match[3].trim(),
      grid_type_label: match[5].trim(),
    });
  }
  return posts;
}

function extractIndexPosts(html) {
  const map = new Map();
  const re =
    /<a href="work\/([^"]+)" class="index-post[^"]*"\s*([^>]*)>[\s\S]*?index-post-title">([^<]+)<[\s\S]*?index-post-type">([^<]+)</g;
  for (const match of html.matchAll(re)) {
    const attrs = parseAttrs(match[2]);
    map.set(match[1].replace(/\.html$/, ''), {
      index_type_label: match[4].trim(),
      preview_bg: attrs['preview-bg'] || '',
    });
  }
  return map;
}

function extractWorkDetail(slug) {
  const html = read(`work/${slug}.html`);
  const hero =
    html.match(/<img\s+src="([^"]+)"[^>]*class="post-hero-image"/)?.[1] ||
    html.match(/class="post-hero-image"[^>]*src="([^"]+)"/)?.[1] ||
    '';
  const description = html.match(/<div class="post-detail-des[^"]*">\s*([\s\S]*?)\s*<\/div>/)?.[1]?.trim() || '';
  const meta = {};
  for (const match of html.matchAll(
    /<div class="post-des-list"><div class="post-q">([^<]+)<\/div><div class="post-a">([^<]+)<\/div><\/div>/g
  )) {
    meta[match[1].trim()] = match[2].trim();
  }
  const gallery = [
    ...html.matchAll(/<img\s+src="([^"]+)"[^>]*class="project-detail-image"/g),
    ...html.matchAll(/class="project-detail-image"[^>]*src="([^"]+)"/g),
  ].map((m) => m[1]);
  return {
    hero_image: hero,
    description,
    meta_year: meta['연도'] || '',
    meta_type: meta['유형'] || '',
    meta_medium: meta['매체'] || '',
    meta_tech: meta['기술'] || '',
    meta_production: meta['제작'] || '',
    gallery,
  };
}

function extractAbout() {
  const html = read('about.html');
  const image = html.match(/about-img" style="background-image:url\(([^)]+)\)/)?.[1] || '';
  const sectionMatch = html.match(/<div class="about-section2">\s*([\s\S]*?)\s*<\/div>/);
  const paragraphs = sectionMatch
    ? [...sectionMatch[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((p) => p[1].trim())
    : [];
  return {
    name: html.match(/class="about-name">([^<]+)</)?.[1]?.trim() || '삼도원',
    meta: html.match(/class="about-meta">\s*([\s\S]*?)\s*<\/div>/)?.[1]?.replace(/<br\s*\/?>/g, '\n').trim() || '',
    body: paragraphs.join('\n\n'),
    image,
  };
}

function extractCv() {
  const html = read('cv.html');
  const sections = [];
  for (const section of html.matchAll(
    /<section class="cv-section[^"]*">\s*<h3>([^<]+)<\/h3>\s*<div class="cv-entries">([\s\S]*?)<\/div>\s*<\/section>/g
  )) {
    const entries = [];
    for (const entry of section[2].matchAll(
      /<div class="cv-entry">\s*<div class="cv-year">([^<]*)<\/div>\s*<div class="cv-desc">([\s\S]*?)<\/div>\s*<\/div>/g
    )) {
      entries.push({ year: entry[1].trim(), description: entry[2].trim() });
    }
    sections.push({ title: section[1].trim(), entries });
  }
  return { sections };
}

function extractLab() {
  const html = read('lab.html');
  const items = [];
  for (const match of html.matchAll(
    /<div class="img-post lab-post[^"]*">[\s\S]*?background-image:url\(([^)]+)\)[\s\S]*?lab-post-caption">([^<]+)</g
  )) {
    items.push({ image: match[1].trim(), caption: match[2].trim() });
  }
  return { items };
}

function extractSite() {
  return {
    email: '3dowon@gmail.com',
    instagram: 'https://instagram.com/3dowon',
    vimeo: 'https://vimeo.com/3dowon',
    youtube: 'https://youtube.com/@3dowon',
  };
}

const indexHtml = read('index.html');
const gridPosts = extractGridPosts(indexHtml);
const indexMap = extractIndexPosts(indexHtml);

fs.mkdirSync(path.join(ROOT, 'content/works'), { recursive: true });

for (const post of gridPosts) {
  const indexData = indexMap.get(post.slug) || {};
  const detail = extractWorkDetail(post.slug);
  writeJson(`content/works/${post.slug}.json`, {
    ...post,
    index_type_label: indexData.index_type_label || post.grid_type_label,
    preview_bg: indexData.preview_bg || post.thumbnail,
    ...detail,
  });
}

writeJson('content/about.json', extractAbout());
writeJson('content/cv.json', extractCv());
writeJson('content/lab.json', extractLab());
writeJson('content/site.json', extractSite());

console.log(`Extracted ${gridPosts.length} works and site content into content/`);
