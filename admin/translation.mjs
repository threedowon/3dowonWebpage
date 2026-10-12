import * as core from './translation-core.mjs';
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
export const translateDescription = (text, key = readKey(), request = fetch) => core.translateDescription(text, key, request);
export const translateWorksTexts = (texts, key = readKey(), request = fetch) => core.translateWorksTexts(texts, key, request);
export const autoTranslateLab = (item, previous = {}, translate = translateDescription) => core.autoTranslateLab(item, previous, translate);
export const autoTranslateWorks = (work, previous = {}, translate = translateWorksTexts) => core.autoTranslateWorks(work, previous, translate);
