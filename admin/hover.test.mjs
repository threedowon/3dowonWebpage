import test from 'node:test';
import assert from 'node:assert/strict';
import { installContentRoutes } from './content-routes.mjs';
import { Router, snapshotServices } from './cloudflare/content.mjs';
import { workHoverImage } from './public/work-images.mjs';
import { greenArchivePage } from '../scripts/lib/green-archive.mjs';
import { workPage } from '../scripts/lib/portfolio.mjs';

const asset = name => `/3dowonWebpage/assets/uploads/${name}`;
const fixture = () => ({
  slug:'demo', title:'Demo', year:2024, thumbnail:asset('cover.jpg'),
  hero_image:asset('cover.jpg'), gallery:[asset('movie.mp4'),asset('one.jpg'),asset('two.png')],
  detail_rows:[[asset('one.jpg'),asset('two.png')]],
  description:'<p>Keep this description.</p>', meta_type:'Interactive',
  process:[{title:'Process',images:[asset('process.jpg')]}],
});
function setup(work = fixture()) {
  const services = snapshotServices({files:new Map([['content/works/demo.json',JSON.stringify(work)]])});
  const router = new Router(); installContentRoutes(router,services);
  const request = (method, route, body = {}, uploads = []) => router.dispatch(new Request(`https://admin.test/api/works/${route}`,{method}),body,uploads);
  return {services,request,router};
}

test('hover selection persists across reopening and automatic mode restores the original work',async()=>{
  const before = fixture();
  const {services,request,router} = setup(before);
  assert.equal((await request('PUT','demo/hover',{src:asset('two.png')})).code,200);
  assert.deepEqual(services.loadWork('demo'),{...before,hover_image:asset('two.png')});
  const list = await router.dispatch(new Request('https://admin.test/api/works'),{});
  assert.equal(list.value[0].hover_image,asset('two.png'));
  const reset = await request('PUT','demo/hover',{src:''});
  assert.equal(reset.code,200);
  assert.equal(reset.value.hover_image,'');
  assert.deepEqual(services.loadWork('demo'),before);
});

test('selection rejects unrelated media, videos, PDFs, and the current cover',async()=>{
  const before = {...fixture(),gallery:[...fixture().gallery,asset('notes.pdf')]};
  const {services,request} = setup(before);
  for (const src of [undefined,null,42,{},asset('movie.mp4'),asset('notes.pdf'),asset('cover.jpg'),asset('missing.jpg'),'https://outside.test/image.jpg']) {
    assert.equal((await request('PUT','demo/hover',{src})).code,400);
  }
  assert.equal(services.changes.size,0);
  assert.equal((await request('PUT','missing/hover',{src:''})).code,404);
  assert.equal((await request('PUT','demo/hover',{src:asset('process.jpg')})).code,200);
});

test('a separate hover upload does not change the cover, gallery, or descriptions',async()=>{
  const before = fixture();
  const {services,request} = setup(before);
  const upload = {fieldname:'image',mimetype:'image/png',buffer:Buffer.from([137,80,78,71,13,10,26,10])};
  const result = await request('POST','demo/hover',{},[upload]);
  assert.equal(result.code,200);
  assert.match(result.value.hover_image,/\/assets\/uploads\/[a-f0-9-]+\.png$/);
  assert.deepEqual(services.loadWork('demo'),{...before,hover_image:result.value.hover_image});
  assert.equal((await request('POST','demo/hover',{},[{...upload,mimetype:'video/mp4'}])).code,400);
});

test('automatic selection is stable, skips duplicate covers and non-images, and handles no alternate',()=>{
  assert.equal(workHoverImage(fixture()),asset('one.jpg'));
  const duplicate = {...fixture(),gallery:['assets/uploads/cover.jpg',asset('movie.mp4'),asset('one.jpg')]};
  assert.equal(workHoverImage(duplicate),asset('one.jpg'));
  assert.equal(workHoverImage({...fixture(),hover_image:asset('two.png')}),asset('two.png'));
  assert.equal(workHoverImage({...fixture(),hover_image:asset('cover.jpg')}),asset('one.jpg'));
  assert.equal(workHoverImage({thumbnail:asset('only.jpg'),gallery:[asset('only.jpg'),asset('movie.mp4')]}),'');
  assert.equal(workHoverImage({gallery:[]}),'');
});

test('both language archives render the chosen alternate decoratively without changing detail media',()=>{
  const before = fixture(), selected = {...before,hover_image:asset('two.png')};
  for (const lang of ['en','ko']) {
    const html = greenArchivePage([selected],{},lang);
    assert.match(html,/class="work-image"><img src="(?:\.\.\/)?assets\/uploads\/cover.jpg"/);
    assert.match(html,/class="work-hover-image" src="(?:\.\.\/)?assets\/uploads\/two.png" alt="" aria-hidden="true"/);
    assert.match(greenArchivePage([before],{},lang),/class="work-hover-image" src="(?:\.\.\/)?assets\/uploads\/one.jpg"/);
    assert.equal(workPage(selected,[selected],{},lang),workPage(before,[before],{},lang));
    assert.doesNotMatch(greenArchivePage([{...before,gallery:[],process:[]}],{},lang),/class="work-hover-image"/);
  }
});

test('a chosen sub image is retained independently after removing its gallery entry',async()=>{
  const {services,request} = setup({...fixture(),hover_image:asset('one.jpg')});
  assert.equal((await request('DELETE','demo/gallery/1')).code,200);
  const work = services.loadWork('demo');
  assert.ok(!work.gallery.includes(asset('one.jpg')));
  assert.equal(workHoverImage(work),asset('one.jpg'));
  assert.equal((await request('PUT','demo/cover',{src:asset('one.jpg')})).code,200);
  assert.notEqual(workHoverImage(services.loadWork('demo')),asset('one.jpg'));
});
