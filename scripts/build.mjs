import { assertWorkPageHeaders, cleanOrphanWorkPages, loadJson, loadWorks, writeOutput } from './lib/content.mjs';
import { normalizeWork, normalizeLabItems } from './lib/catalog.mjs';
import { catalogPage, labPage, aboutPage, portfolioPage, cvPage, workPage } from './lib/portfolio.mjs';

const site = loadJson('content/site.json');
const about = loadJson('content/about.json');
const cv = loadJson('content/cv.json');
const lab = loadJson('content/lab.json');
const studies = normalizeLabItems(lab);
const works = loadWorks().map(normalizeWork);
const workPaths = [];

for (const lang of ['en', 'ko']) {
  const prefix = lang === 'ko' ? 'ko/' : '';
  for (const page of ['index.html', 'works.html', 'works-img.html', 'list.html']) {
    // Keep legacy entry URLs opening the same image archive.
    writeOutput(`${prefix}${page}`, catalogPage(works, site, lang, page));
  }
  writeOutput(`${prefix}lab.html`, labPage(studies, site, lang));
  writeOutput(`${prefix}about.html`, aboutPage(about, site, lang));
  writeOutput(`${prefix}portfolio.html`, portfolioPage(site, lang));
  writeOutput(`${prefix}cv.html`, cvPage(cv, site, lang));
  for (const work of works) {
    const page = `${prefix}work/${work.slug}.html`;
    writeOutput(page, workPage(work, works, site, lang));
    workPaths.push(page);
  }
  cleanOrphanWorkPages(works.map((work) => work.slug), `${prefix}work`);
  for (const study of studies) {
    const page = `${prefix}lab/${study.slug}.html`;
    writeOutput(page, workPage(study, studies, site, lang, 'lab'));
    workPaths.push(page);
  }
  cleanOrphanWorkPages(studies.map((study) => study.slug), `${prefix}lab`);
}
assertWorkPageHeaders(workPaths);
console.log(`Built ${works.length} works and ${studies.length} studies × 2 languages and all public pages with the shared portfolio layout.`);
