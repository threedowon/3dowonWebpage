import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateResponsibilities } from './responsibilities.mjs';
import { autoTranslateWorks } from './translation-core.mjs';
import { installContentRoutes } from './content-routes.mjs';
import { Router, snapshotServices } from './cloudflare/content.mjs';
import { workPage } from '../scripts/lib/portfolio.mjs';
import { normalizeWork } from '../scripts/lib/catalog.mjs';
const item = (id, title = '업무 제목') => ({ id, title, title_en: '', description: '업무 내용', description_en: '' });

test('responsibility validation preserves blank rows and rejects invalid/duplicate entries', () => {
  assert.equal(validateResponsibilities([item('a'), item('b')]).length, 2);
  assert.deepEqual(validateResponsibilities([]), []);
  assert.throws(() => validateResponsibilities([item('a'), item('a')]));
  assert.throws(() => validateResponsibilities([{ id: 'a' }]));
});
test('editing API round trips title/body rows without erasing legacy text and supports deleting all', async () => {
  const services = snapshotServices({ files: new Map([['content/works/demo.json', JSON.stringify({slug:'demo', title:'Demo', responsibilities:'<p>기존 업무</p>', gallery:[]})]]) });
  services.autoTranslateWorks = async () => null;
  const router = new Router(); installContentRoutes(router, services);
  const put = body => router.dispatch(new Request('https://admin.test/api/works/demo', {method:'PUT'}), body);
  const saved = await put({ responsibility_items:[item('a'),item('b')] });
  assert.equal(saved.code,200); assert.equal(saved.value.responsibility_items[1].title,'업무 제목');
  assert.equal(services.loadWork('demo').responsibilities,'<p>기존 업무</p>');
  await put({responsibility_items:[]});
  assert.deepEqual(services.loadWork('demo').responsibility_items,[]);
});
test('translation follows stable IDs after reordering and retains manually edited English', async () => {
  const previous = {responsibility_items:[{...item('a'),title_en:'First',description_en:'Body'},{...item('b'),title_en:'Second',description_en:'Body'}]};
  const work = structuredClone(previous); work.responsibility_items.reverse();
  work.responsibility_items[0].title='새 제목'; work.responsibility_items[1].description_en='My own English';
  let texts;
  await autoTranslateWorks(work,previous,async values => {texts=values;return ['New title'];});
  assert.deepEqual(texts,['새 제목']);
  assert.equal(work.responsibility_items[0].title_en,'New title');
  assert.equal(work.responsibility_items[1].description_en,'My own English');
});
test('public page separates and escapes headings/body, preserves legacy and hides removed items', () => {
  const file=fs.readdirSync('content/works').find(name=>name.endsWith('.json'));
  const work=normalizeWork(JSON.parse(fs.readFileSync('content/works/'+file,'utf8')));
  work.responsibilities='<p>Legacy duty</p>';
  const render=()=>workPage(work,[work],{},'ko');
  assert.match(render(),/Legacy duty/);
  work.responsibility_items=[{...item('a','<script>title</script>'),description:'Line one\nLine two'}];
  const html=render();
  assert.match(html,/<h4>&lt;script&gt;title&lt;\/script&gt;<\/h4>/);
  assert.match(html,/<p>Line one<\/p><p>Line two<\/p>/);
  assert.doesNotMatch(html,/Legacy duty/);
  work.responsibility_items=[];
  assert.doesNotMatch(render(),/Legacy duty|detail-responsibility/);
});
