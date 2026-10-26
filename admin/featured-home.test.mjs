import test from 'node:test';
import assert from 'node:assert/strict';
import {installContentRoutes} from './content-routes.mjs';
import {Router,snapshotServices} from './cloudflare/content.mjs';
import {featuredMedia,selectFeaturedWorks} from './public/featured-projects.mjs';
import {featuredHomePage} from '../scripts/lib/featured-home.mjs';

const works = [
  {slug:'first',title:'First <project>',title_en:'First EN',year:2024,mux:{playback_id:'abc123'},gallery:[],thumbnail:'/3dowonWebpage/assets/uploads/one.jpg'},
  {slug:'second',title:'Second',year:2025,video:'/3dowonWebpage/assets/uploads/two.mp4',gallery:[]},
  {slug:'photo',title:'Photo',year:2026,gallery:[],thumbnail:'/3dowonWebpage/assets/uploads/photo.jpg'},
];
function setup() {
  const services = snapshotServices({files:new Map(works.map(work => [`content/works/${work.slug}.json`,JSON.stringify(work)]))});
  const router = new Router(); installContentRoutes(router,services);
  const save = projects => router.dispatch(new Request('https://admin.test/api/featured-projects',{method:'PUT'}),{projects});
  return {services,router,save};
}
test('featured configuration persists order independently from work and archive data',async()=>{
  const {services,router,save} = setup();
  assert.equal((await save(['second','first','photo'])).code,200);
  assert.deepEqual(services.loadJson('content/featured-projects.json'),{projects:['second','first','photo']});
  assert.deepEqual([...services.changes.keys()],['content/featured-projects.json']);
  assert.deepEqual((await router.dispatch(new Request('https://admin.test/api/featured-projects'),{})).value.projects,['second','first','photo']);
  assert.deepEqual(services.loadWork('first'),works[0]);
});
test('invalid or duplicated project choices do not write anything',async()=>{
  const {services,save} = setup();
  for (const value of [undefined,null,[],['missing'],['first','first'],'first',[{}],Array(11).fill('first')]) assert.equal((await save(value)).code,400);
  assert.equal(services.changes.size,0);
});
test('missing projects are skipped; fallback selects only projects with video',()=>{
  assert.deepEqual(selectFeaturedWorks(works,['removed','second','second']).map(w=>w.slug),['second']);
  assert.deepEqual(selectFeaturedWorks(works,[]).map(w=>w.slug),['first','second']);
  assert.equal(featuredMedia(works[0]).kind,'mux');
  assert.equal(featuredMedia(works[1]).kind,'video');
  assert.equal(featuredMedia(works[2]),null);
});
test('home renders selected projects, language routes and lazy video sources without changing Works destination',()=>{
  for (const lang of ['ko','en']) {
    const html = featuredHomePage(works,{},lang,{projects:['second','first']});
    assert.deepEqual([...html.matchAll(/data-slug="([^"]+)"/g)].map(match=>match[1]),['second','first']);
    assert.match(html,/href="works.html"[^>]*>Works/);
    assert.match(html,/href="work\/first.html"/);
    assert.match(html,/data-media-kind="mux" data-media-src="abc123"/);
    assert.doesNotMatch(html,/<mux-player|<iframe|<video/);
    assert.match(html,lang==='ko' ? /First &lt;project&gt;/ : /First EN/);
    assert.match(html,lang==='ko' ? /href="\.\.\/index.html"/ : /href="ko\/index.html"/);
  }
});
