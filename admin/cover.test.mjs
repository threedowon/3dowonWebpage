import test from 'node:test';
import assert from 'node:assert/strict';
import { installContentRoutes } from './content-routes.mjs';
import { Router, snapshotServices } from './cloudflare/content.mjs';
import { greenArchivePage } from '../scripts/lib/green-archive.mjs';
import { workPage } from '../scripts/lib/portfolio.mjs';

const asset = name => `/3dowonWebpage/assets/uploads/${name}`;
const fixture = () => ({
  slug:'demo', title:'Demo', year:2024, thumbnail:asset('old.jpg'),
  hero_image:asset('old.jpg'), preview_bg:asset('old.jpg'),
  gallery:[asset('one.jpg'),asset('clip.mp4'),asset('two.png')],
  detail_rows:[[asset('one.jpg'),asset('clip.mp4')],[asset('two.png')]],
  description:'<p>Keep this description.</p>', meta_type:'Interactive',
  process:[{title:'Process', images:[asset('process.jpg')]}],
});
function setup(work = fixture()) {
  const services = snapshotServices({files:new Map([['content/works/demo.json',JSON.stringify(work)]])});
  const router = new Router(); installContentRoutes(router, services);
  const request = (method, route, body = {}, uploads = []) => router.dispatch(new Request(`https://admin.test/api/works/${route}`, {method}),body,uploads);
  return {services, request};
}

test('cover selection persists and leaves authored gallery order, hero and text unchanged', async () => {
  const before = fixture();
  const {services,request} = setup(before);
  const result = await request('PUT','demo/cover',{src:asset('two.png')});
  assert.equal(result.code,200);
  assert.deepEqual(services.loadWork('demo'), {...before,cover_image:asset('two.png')});
  // The regular work listing is the source of truth after reopening the admin.
  const list = new Router(); installContentRoutes(list,services);
  const works = await list.dispatch(new Request('https://admin.test/api/works'),{});
  assert.equal(works.value[0].cover_image,asset('two.png'));
});

test('only existing images from this work may be chosen, including process images', async () => {
  const {services,request} = setup();
  for (const src of ['',null,asset('clip.mp4'),asset('unrelated.jpg'),'https://outside.test/image.jpg']) {
    assert.equal((await request('PUT','demo/cover',{src})).code,400);
  }
  assert.equal(services.changes.size,0);
  assert.equal((await request('PUT','missing/cover',{src:asset('one.jpg')})).code,404);
  assert.equal((await request('PUT','demo/cover',{src:asset('process.jpg')})).code,200);
});

test('upload creates a separate cover without replacing gallery files or accepting video', async () => {
  const before = fixture();
  const {services,request} = setup(before);
  const upload = {fieldname:'image',mimetype:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10])};
  const result = await request('POST','demo/cover',{},[upload]);
  assert.equal(result.code,200);
  assert.match(result.value.cover_image,/\/assets\/uploads\/[a-f0-9-]+\.png$/);
  assert.deepEqual(services.loadWork('demo'),{...before,cover_image:result.value.cover_image});
  assert.equal((await request('POST','demo/cover',{},[{...upload,mimetype:'video/mp4'}])).code,400);
  assert.equal((await request('POST','missing/cover',{},[upload])).code,404);
});

test('archive and related cards use the cover in both languages, while detail media stay unchanged', () => {
  const original = fixture();
  const selected = {...original,cover_image:asset('two.png')};
  const other = {...original,slug:'other',title:'Other'};
  for (const lang of ['en','ko']) {
    assert.match(greenArchivePage([selected],{},lang),/class="work-image"><img src="(?:\.\.\/)?assets\/uploads\/two.png"/);
    assert.match(workPage(other,[other,selected],{},lang),/class="related-image"><img src="(?:\.\.\/)+assets\/uploads\/two.png"/);
    assert.equal(workPage(selected,[selected],{},lang),workPage(original,[original],{},lang));
    assert.match(greenArchivePage([original],{},lang),/class="work-image"><img src="(?:\.\.\/)?assets\/uploads\/old.jpg"/);
  }
});

test('removing a gallery entry retains its selected cover reference', async () => {
  const {services,request} = setup({...fixture(),cover_image:asset('one.jpg')});
  assert.equal((await request('DELETE','demo/gallery/0')).code,200);
  const work = services.loadWork('demo');
  assert.equal(work.cover_image,asset('one.jpg'));
  assert.ok(!work.gallery.includes(work.cover_image));
  assert.match(greenArchivePage([work],{},'en'),/class="work-image"><img src="assets\/uploads\/one.jpg"/);
});
