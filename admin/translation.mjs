import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const configFile = path.join(os.homedir(), '.3dowon-admin', 'translation.json');
function readKey() {
  if (process.env.DEEPL_API_KEY) return process.env.DEEPL_API_KEY;
  try { return JSON.parse(fs.readFileSync(configFile, 'utf8')).key || ''; }
  catch { return ''; }
}
export function translationStatus() { return { configured: Boolean(readKey()) }; }
export function saveTranslationKey(key) {
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify({key}), {mode:0o600});
}
export async function translateDescription(text, key = readKey(), request = fetch) {
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
