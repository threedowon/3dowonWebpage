import test from 'node:test';
import assert from 'node:assert/strict';
import { installContentRoutes } from './content-routes.mjs';
import { Router, snapshotServices } from './cloudflare/content.mjs';
import { selectRelatedWorks } from './public/related-works.mjs';
import { workPage } from '../scripts/lib/portfolio.mjs';

const works = ['main','first','second','third','fourth','fifth'].map((slug,index) => ({slug,title:slug,year:2024-index,meta_type:'Interactive',tags:[],gallery:[],cover_image:`assets/uploads/${slug}.jpg`,description:'Keep this content.'}));
function setup() {
  const services = snapshotServices({files:new Map(works.map(work => [`content/works/${work.slug}.json`,JSON.stringify(work)]))});
  const router = new Router(); installContentRoutes(router,services);
  const save = (related_projects, slug='main') => router.dispatch(new Request(`https://admin.test/api/works/${slug}/related`,{method:'PUT'}),{related_projects});
  return {services,router,save};
}

test('related selections persist in chosen order without changing other content, and reset to automatic',async()=>{
  const {services,router,save} = setup();
  assert.equal((await save(['fourth','second'])).code,200);
  assert.deepEqual(services.loadWork('main'),{...works[0],related_projects:['fourth','second']});
  const list = await router.dispatch(new Request('https://admin.test/api/works'),{});
  assert.deepEqual(list.value.find(work=>work.slug==='main').related_projects,['fourth','second']);
  assert.deepEqual(selectRelatedWorks(services.loadWork('main'),works).map(work=>work.slug),['fourth','second']);
  assert.equal((await save([])).code,200);
  assert.deepEqual(services.loadWork('main'),works[0]);
  assert.deepEqual(selectRelatedWorks(works[0],works).map(work=>work.slug),['first','second','third','fourth']);
});

test('invalid related selections cannot write content',async()=>{
  const {services,save} = setup();
  for (const selection of [undefined,null,'first',['main'],['missing'],['first','first'],['first','second','third','fourth','fifth'],[{}]]) {
    assert.equal((await save(selection)).code,400);
  }
  assert.equal((await save([], 'missing')).code,404);
  assert.equal(services.changes.size,0);
});

test('removed projects and self references are skipped, with automatic recommendations when none remain',()=>{
  assert.deepEqual(selectRelatedWorks({...works[0],related_projects:['missing','main','second','second']},works).map(work=>work.slug),['second']);
  assert.equal(selectRelatedWorks({...works[0],related_projects:['missing']},works).length,4);
  assert.deepEqual(selectRelatedWorks(works[0],[works[0]]),[]);
});

test('both languages render the selected works and their chosen covers in order',()=>{
  for (const lang of ['en','ko']) {
    const html = workPage({...works[0],related_projects:['fourth','second']},works,{},lang);
    const related = html.match(/<div class="related-grid">([\s\S]*?)<\/section>/)[1];
    assert.deepEqual([...related.matchAll(/class="related-card" href="([^"]+)"/g)].map(match=>match[1]),['fourth.html','second.html']);
    assert.match(related,/assets\/uploads\/fourth.jpg/);
    assert.match(html,lang==='ko' ? /이런 작업도 좋아하실 거예요/ : /You might also like/);
  }
});
