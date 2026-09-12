import { compareWorkDates } from './work-date.mjs';
export function pick(obj, field, lang) {
  if (lang === 'en' && obj[`${field}_en`] != null) return obj[`${field}_en`];
  return obj[field];
}

export function resolveMediaPath(src, assetPrefix) {
  const value = String(src || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/3dowonWebpage/')) return `${assetPrefix}${value.slice('/3dowonWebpage/'.length)}`;
  if (value.startsWith('/')) return `${assetPrefix}${value.slice(1)}`;
  if (value.startsWith('assets/')) return `${assetPrefix}${value}`;
  return value;
}

export function normalizeList(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object') {
        return value.tag || value.item || value.image || value.url || '';
      }
      return '';
    })
    .filter(Boolean);
}

export function normalizeWork(work) {
  return {
    ...work,
    tags: normalizeList(work.tags),
    tech: normalizeList(work.tech),
    gallery: normalizeList(work.gallery),
  };
}

export function normalizeLabItems(lab) {
  const fields = {
    space: ['공간', 'Space'],
    object: ['오브젝트', 'Object'],
    screen: ['스크린', 'Screen'],
  };
  return lab.items.map((item, index) => {
    const field = formKey(labFormY(item));
    return normalizeWork({
      ...item,
      slug: item.slug || `l${String(index + 1).padStart(2, '0')}`,
      title: item.title || item.caption,
      title_en: item.title_en || item.caption_en || item.title || item.caption,
      year: item.year || '',
      field,
      thumbnail: item.image || (item.mux?.playback_id ? `https://image.mux.com/${item.mux.playback_id}/thumbnail.jpg` : ''),
      hero_image: item.image,
      meta_type: '실험',
      meta_type_en: 'Study',
      meta_medium: fields[field][0],
      meta_medium_en: fields[field][1],
    });
  }).filter((item) => item.thumbnail || item.video || item.mux?.playback_id).sort(compareWorkDates);
}

export function workFormY(work) {
  const terms = `${(work.tags || []).join(' ')} ${work.type || ''} ${work.meta_type || ''} ${
    work.meta_type_en || ''
  } ${work.meta_medium || ''} ${work.meta_medium_en || ''}`.toLowerCase();
  const tech = `${(work.tech || []).join(' ')} ${work.meta_tech || ''} ${
    work.meta_tech_en || ''
  }`.toLowerCase();
  const isSpace = /설치|전시|installation|exhibition|projection|spatial|performance/.test(terms);
  const isObject = /arduino|esp32|sensor|센서|physical|kinect|servo|motor|circuit|robot/.test(tech);
  const isScreen =
    /영상|video|moving image|screen|digital/.test(terms) ||
    /unreal|touchdesigner|unity|max\/msp|shader/.test(tech);
  if (isSpace && isObject) return 39;
  if (isObject && isScreen && !isSpace) return 61;
  if (isSpace) return 27;
  if (isObject) return 50;
  return isScreen ? 73 : 71;
}

export function labFormY(item) {
  const caption = `${item.caption || ''} ${item.caption_en || ''}`.toLowerCase();
  const isSpace = /installation|on-site|projection|mapping|water|light|현장|설치|프로젝션|맵핑|물|조명/.test(caption);
  const isObject = /physical|sensor|plant|servo|motor|circuit|touch|피지컬|센서|식물|서보|모터|회로|터치/.test(caption);
  const isScreen = /unreal|shader|audio|display|archive|언리얼|셰이더|오디오|디스플레이|아카이브/.test(caption);
  if (isSpace && isObject) return 39;
  if (isObject && isScreen) return 61;
  if (isSpace) return 27;
  if (isObject) return 50;
  return isScreen ? 73 : 71;
}

export function formKey(y) {
  return y < 43 ? 'space' : y < 68 ? 'object' : 'screen';
}
