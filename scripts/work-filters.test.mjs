import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWorkFilters,workFilterTypes} from './lib/work-filters.mjs';
import {siteNavigation} from './lib/navigation.mjs';

test('work filters combine types and tags, deduplicate, and keep VR/AR together',()=>{
  assert.deepEqual(workFilterTypes({type:'VR',meta_type:'VR/AR, 인터랙티브',tags:['인터랙티브','웹']}),['VR/AR','인터랙티브','웹']);
  assert.deepEqual(workFilterTypes({}),[]);
});
test('available filters follow actual works and preserve custom bilingual types',()=>{
  const filters=buildWorkFilters([
    {type:'설치',meta_type:'설치, 키네틱',meta_type_en:'Installation, Kinetic',year:2024},
    {type:'영상',year:2026}, {type:'설치',year:2024},
  ]);
  assert.deepEqual(filters.years,['2026','2024']);
  assert.deepEqual(filters.types.map(type=>type.value),['피지컬 컴퓨팅','영상','키네틱']);
  assert.equal(filters.types.at(-1).en,'Kinetic');
});
test('submenu routes work from detail pages in either language',()=>{
  const site={work_filters:buildWorkFilters([{type:'VR/AR',year:2026}])};
  for(const lang of ['en','ko']){
    const html=siteNavigation({site,home:'../',lang,active:'works',languageHref:'../../works.html'});
    assert.match(html,/href="\.\.\/works.html\?menu=all">All/);
    assert.match(html,/<a class="works-trigger is-current" href="\.\.\/works.html"[^>]*>Works<\/a>/);
    assert.match(html,/href="\.\.\/works.html\?type=VR%2FAR"/);
    assert.match(html,/aria-controls="works-submenu"/);
    assert.doesNotMatch(html,/<img|identity-note|mailto:|works-filter-details|<form/);
  }
});

test('new category remains available while retired filters stay out of the menu',()=>{
  const types=buildWorkFilters([{type:'퍼포먼스',tags:['설치','웹','인터랙티브','영상','전시','VR']}]).types;
  assert.deepEqual(types.map(t=>t.en),['Interactive','Physical Computing','Web','Video','Exhibition','VR/AR']);
  assert(workFilterTypes({type:'피지컬 컴퓨팅'}).includes('피지컬 컴퓨팅'));
});
