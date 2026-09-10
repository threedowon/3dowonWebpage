// Appends a few paragraphs of placeholder prose to every work's description
// (KO + EN) so the admin and site layouts can be judged with realistic text
// volume. Deterministic per slug, so `--remove` can strip exactly what was
// added and leave the original descriptions byte-for-byte intact.
//
//   node scripts/fill-placeholder-text.mjs           # append placeholder text
//   node scripts/fill-placeholder-text.mjs --remove  # strip it again
//
// Matches the admin tool's storage format (admin/server.js
// plainTextToDescriptionHtml): one <p> per paragraph, joined by "\n" + 12
// spaces, so descriptions round-trip cleanly through the editor.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKS_DIR = path.join(ROOT, 'content/works');
const JOIN = '\n            ';
const REMOVE = process.argv.includes('--remove');

// Placeholder copy avoids & < > " so it survives the admin's HTML escape /
// unescape round-trip unchanged, which is what lets --remove still match after
// a work has been re-saved in the editor.
const KO = {
  open: [
    (t) => `${t}은(는) 익숙한 사물에 작은 변화를 더해 사람들이 공간을 경험하는 방식을 다시 바라보게 하는 작업이다.`,
    (t) => `${t}에서는 일상에서 쉽게 마주치는 것들을 출발점으로 삼아, 관객이 익숙한 풍경을 새로운 감각으로 다시 만나도록 이끈다.`,
    (t) => `${t}은(는) 빛과 공간, 그리고 관객의 움직임이 서로 반응하며 하나의 장면을 만들어 가는 과정을 다룬다.`,
  ],
  middle: [
    '실시간 그래픽과 센서 기술을 통해 디지털 미디어와 물리적 공간을 연결하고, 그 과정에서 현실과 가상의 경계는 자연스럽게 흐려진다. 센서는 조용히 뒤에서 작동하며 관객이 기술보다 경험 자체에 몰입하도록 돕는다.',
    '관객이 걸음을 늦추고 눈앞의 장면을 오래 바라볼 때, 공간은 서서히 그들의 기억 일부가 된다. 기술은 보여주기 위한 대상이 아니라 경험을 위한 재료로 자리한다.',
    '작업은 화려한 장치보다 여백과 리듬에 기대어 구성되며, 관객이 머무는 시간에 따라 조금씩 다른 표정을 드러낸다. 같은 장면도 보는 사람과 순간에 따라 다르게 남는다.',
  ],
  close: [
    '이 텍스트는 레이아웃 확인을 위한 임시 문장이며, 실제 작업 설명으로 교체될 예정이다.',
    '위 내용은 화면 구성을 살펴보기 위한 임시 설명으로, 추후 실제 작업 노트로 대체된다.',
  ],
};

const EN = {
  open: [
    (t) => `${t} adds small changes to familiar objects so that people are led to look again at how they experience space.`,
    (t) => `${t} starts from things easily encountered in everyday life and invites the audience to meet a familiar scene through fresh senses.`,
    (t) => `${t} follows the process by which light, space, and the movement of the audience respond to one another and form a single scene.`,
  ],
  middle: [
    'Real-time graphics and sensor technology connect digital media with physical space, and along the way the boundary between the real and the virtual quietly blurs. The sensors work silently in the background so the audience can settle into the experience rather than the technology.',
    'When people slow down and stay with a scene a little longer, the space gradually becomes part of their memory. Technology here is not something to be shown off but a material for experience.',
    'The work leans on space and rhythm rather than elaborate devices, and it reveals a slightly different expression depending on how long a visitor lingers. The same scene settles differently for each person and each moment.',
  ],
  close: [
    'This paragraph is placeholder text for checking the layout and will be replaced with the actual project description.',
    'The text above is a temporary description used to review the page composition and will be swapped for real project notes later.',
  ],
};

function hashSlug(slug) {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function placeholderParagraphs(lang, work) {
  const pool = lang === 'ko' ? KO : EN;
  const title = lang === 'ko' ? work.title : work.title_en || work.title;
  const h = hashSlug(work.slug);
  // Unsigned shifts: a signed `>>` on a hash with the top bit set goes
  // negative, `%` keeps the sign, and `pool[-1]` is undefined.
  return [
    pool.open[h % pool.open.length](title),
    pool.middle[(h >>> 3) % pool.middle.length],
    pool.close[(h >>> 6) % pool.close.length],
  ].map((text) => `<p>${text}</p>`);
}

function apply(current, paragraphs) {
  const block = paragraphs.join(JOIN);
  if (current.includes(block)) return current; // already applied — idempotent
  return current ? `${current}${JOIN}${block}` : block;
}

function remove(current, paragraphs) {
  const block = paragraphs.join(JOIN);
  if (!current.includes(block)) return current;
  const stripped = current.replace(block, '');
  // Drop the separator that joined the original text to the placeholder.
  return stripped.replace(new RegExp(`${JOIN}$`), '').replace(new RegExp(`^${JOIN}`), '');
}

let changed = 0;
for (const name of fs.readdirSync(WORKS_DIR).filter((f) => f.endsWith('.json')).sort()) {
  const file = path.join(WORKS_DIR, name);
  const work = JSON.parse(fs.readFileSync(file, 'utf8'));
  const before = JSON.stringify(work);

  for (const [field, lang] of [['description', 'ko'], ['description_en', 'en']]) {
    const paragraphs = placeholderParagraphs(lang, work);
    const current = String(work[field] || '');
    work[field] = REMOVE ? remove(current, paragraphs) : apply(current, paragraphs);
  }

  if (JSON.stringify(work) !== before) {
    fs.writeFileSync(file, JSON.stringify(work, null, 2) + '\n', 'utf8');
    changed += 1;
  }
}

console.log(`${REMOVE ? 'Removed placeholder text from' : 'Added placeholder text to'} ${changed} work(s).`);
