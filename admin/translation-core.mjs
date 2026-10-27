import { Buffer } from 'node:buffer';
export async function translateDescription(text, key = '', request = fetch) {
  if (!key) throw new Error('자동 번역을 사용하려면 Lab 상단에 DeepL API 키를 등록해주세요.');
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  let response;
  try {
    response = await request(`https://${host}/v2/translate`, {
      method:'POST', headers:{'Authorization':`DeepL-Auth-Key ${key}`, 'Content-Type':'application/json'},
      body:JSON.stringify({text:[text], source_lang:'KO', target_lang:'EN-US', preserve_formatting:true}),
      signal:AbortSignal.timeout(20000),
    });
  } catch { throw new Error('번역 서비스에 연결하지 못했어요. 잠시 후 다시 저장해주세요.'); }
  if (!response.ok) throw new Error(response.status === 403 ? 'DeepL API 키를 확인해주세요.' : response.status === 456 ? 'DeepL 번역 사용량을 초과했어요.' : '번역 요청에 실패했어요. 잠시 후 다시 저장해주세요.');
  const result = await response.json();
  const translation = result.translations?.[0]?.text;
  if (typeof translation !== 'string' || !translation.trim()) throw new Error('번역 결과가 비어 있어요.');
  return translation;
}

export async function autoTranslateLab(item, previous = {}, translate = translateDescription) {
  const text = item.description || '';
  const manuallyEdited = Boolean(item.description_en) && item.description_en !== (previous.description_en || '');
  if (!/[가-힣]/.test(text) || manuallyEdited || (text === previous.description && item.description_en)) return null;
  try { item.description_en = await translate(text); return null; }
  catch (error) { return `한글 내용은 저장되었습니다. ${error.message}`; }
}

// Translate Works fields in batches while retaining authored HTML paragraphs.
export async function translateWorksTexts(texts, key = '', request = fetch) {
  if(!key) throw new Error('Lab 상단에 DeepL API 키를 등록해주세요. Works에서도 같은 키를 사용합니다.');
  const host=key.endsWith(':fx')?'api-free.deepl.com':'api.deepl.com';
  const result=[];
  for(let index=0;index<texts.length;){
    const batch=[];let bytes=0;
    while(index<texts.length && batch.length<40){
      const size=Buffer.byteLength(JSON.stringify(texts[index]),'utf8');
      if(batch.length && bytes+size>100000)break;
      if(size>100000)throw new Error('번역할 내용이 너무 길어요. 과정을 나누어 작성해주세요.');
      bytes+=size;batch.push(texts[index++]);
    }
    let response;
    try{response=await request(`https://${host}/v2/translate`,{method:'POST',headers:{Authorization:`DeepL-Auth-Key ${key}`,'Content-Type':'application/json'},body:JSON.stringify({text:batch,source_lang:'KO',target_lang:'EN-US',tag_handling:'html',preserve_formatting:true}),signal:AbortSignal.timeout(20000)});}
    catch{throw new Error('번역 서비스에 연결하지 못했어요. 잠시 후 다시 저장해주세요.');}
    if(!response.ok)throw new Error(response.status===403?'DeepL API 키를 확인해주세요.':response.status===456?'DeepL 번역 사용량을 초과했어요.':'번역 요청에 실패했어요.');
    const data=await response.json();
    if(data.translations?.length!==batch.length || data.translations.some(item=>typeof item.text!=='string'||!item.text.trim()))throw new Error('번역 결과를 받지 못했어요.');
    result.push(...data.translations.map(item=>item.text));
  }
  return result;
}
export async function autoTranslateWorks(work, previous = {}, translate = translateWorksTexts) {
  const fields=[];
  const add=(target,before,key)=>{
    const text=target[key]||'',english=target[key+'_en']||'';
    const manual=Boolean(english) && english!==(before?.[key+'_en']||'');
    if(/[가-힣]/.test(text)&&!manual&&(text!==before?.[key]||!english||previous.works_translation_pending))fields.push({target,key,text});
  };
  add(work,previous,'description');
  add(work,previous,'lessons');
  if (!Array.isArray(work.responsibility_items)) add(work,previous,'responsibilities');
  (work.responsibility_items || []).forEach(entry => {
    const before = (previous.responsibility_items || []).find(old => old.id === entry.id) || {};
    for (const key of ['title','description']) add(entry,before,key);
  });
  (work.process||[]).forEach((entry,i)=>{
    const before=(previous.process||[]).find(old=>old.title===entry.title&&old.description===entry.description)||previous.process?.[i]||{};
    for(const key of ['title','description'])add(entry,before,key);
  });
  if(!fields.length){work.works_translation_pending=false;return null;}
  try{const translated=await translate(fields.map(field=>field.text));fields.forEach((field,i)=>field.target[field.key+'_en']=translated[i]);work.works_translation_pending=false;return null;}
  catch(error){work.works_translation_pending=true;return `한글 내용은 저장되었습니다. ${error.message}`;}
}
