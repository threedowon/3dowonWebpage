import test from 'node:test';
import assert from 'node:assert/strict';
import {translateDescription, autoTranslateLab} from './translation.mjs';

test('DeepL request uses server authentication and Korean to English', async () => {
  const result = await translateDescription('내용', 'test:fx', async (url, options) => {
    assert.equal(url, 'https://api-free.deepl.com/v2/translate');
    assert.equal(options.headers.Authorization, 'DeepL-Auth-Key test:fx');
    assert.deepEqual(JSON.parse(options.body).text, ['내용']);
    assert.equal(JSON.parse(options.body).target_lang, 'EN-US');
    return {ok:true, json:async()=>({translations:[{text:'Description'}]})};
  });
  assert.equal(result, 'Description');
});
test('new Korean and changed Korean are translated; unchanged or manual English is retained', async () => {
  let calls = 0;
  const translate = async () => { calls++; return 'Translation'; };
  const fresh = {description:'한글', description_en:''};
  await autoTranslateLab(fresh, {}, translate);
  assert.equal(fresh.description_en, 'Translation');
  await autoTranslateLab({...fresh}, fresh, translate);
  assert.equal(calls,1);
  const updated = {...fresh, description:'수정된 한글'};
  await autoTranslateLab(updated, fresh, translate);
  assert.equal(calls,2);
  const manual = {...updated, description_en:'Edited by author'};
  await autoTranslateLab(manual, updated, translate);
  assert.equal(calls,2);
  assert.equal(manual.description_en,'Edited by author');
});
test('failure preserves both the Korean and existing English and returns actionable status', async () => {
  const item = {description:'새 내용',description_en:'Old text'};
  const warning = await autoTranslateLab(item,{description:'이전 내용',description_en:'Old text'},async()=>{throw Error('API 오류');});
  assert.equal(item.description,'새 내용');
  assert.equal(item.description_en,'Old text');
  assert.match(warning,/한글 내용은 저장/);
});
test('missing key, quota and empty result do not produce fake translations', async () => {
  await assert.rejects(translateDescription('내용',''),/API 키/);
  await assert.rejects(translateDescription('내용','test',async()=>({ok:false,status:456})),/사용량/);
  await assert.rejects(translateDescription('내용','test',async()=>({ok:true,json:async()=>({translations:[]})})),/비어/);
});
