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
  assert.deepEqual(filters.types.map(type=>type.value),['설치','영상','키네틱']);
  assert.equal(filters.types.at(-1).en,'Kinetic');
});
test('submenu routes work from detail pages in either language without brand imagery or social links',()=>{
  const site={work_filters:buildWorkFilters([{type:'VR/AR',year:2026}])};
  for(const lang of ['en','ko']){
    const html=siteNavigation({site,home:'../',lang,active:'works',languageHref:'../../works.html'});
    assert.match(html,/href="\.\.\/works.html">All/);
    assert.match(html,/<a class="works-trigger is-current" href="\.\.\/works.html"[^>]*>Works<\/a>/);
    assert.match(html,/href="\.\.\/works.html\?type=VR%2FAR"/);
    assert.match(html,/aria-controls="works-submenu"/);
    assert.doesNotMatch(html,/<img|identity-note|menu-socials|mailto:|works-filter-details|<form/);
  }
});
