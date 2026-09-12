export function uniqueWorkSlug(title, existing=[]) {
 const lead=['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
 const vowel=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
 const tail=['','k','k','ks','n','nj','nh','t','l','lk','lm','lb','ls','lt','lp','lh','m','p','ps','t','t','ng','t','t','k','t','p','h'];
 const roman=String(title).normalize('NFC').replace(/[가-힣]/g,c=>{const n=c.charCodeAt(0)-44032;return lead[Math.floor(n/588)]+vowel[Math.floor(n%588/28)]+tail[n%28];});
 let base=roman.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80).replace(/-$/,'')||'work';
 if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(base))base='work-'+base;
 const used=new Set(existing);let slug=base,n=2;while(used.has(slug))slug=`${base}-${n++}`;return slug;
}
