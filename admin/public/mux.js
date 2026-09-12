(() => {
 const request=async(route,body,method=body?'POST':'GET')=>{const res=await fetch('/api/mux/'+route,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await res.json();if(!res.ok)throw Error(data.error||'요청 실패');return data;};
 const el=(tag,value)=>{const node=document.createElement(tag);node.textContent=value;return node;};
 let active=0;
 window.addEventListener('beforeunload',e=>{if(active){e.preventDefault();e.returnValue='';}});
 const form=document.getElementById('muxSettings'),connection=document.getElementById('muxConnection');
 form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await request('settings',{id:form.elements.id.value,secret:form.elements.secret.value},'PUT');form.reset();connection.textContent='Mux 연결 완료';}catch(err){connection.textContent=err.message;}finally{button.disabled=false;}};
 request('settings').then(s=>connection.textContent=s.configured?'Mux 연결됨':'Token ID와 Secret을 등록해주세요.').catch(e=>connection.textContent=e.message);
 function mount(box){
  box.dataset.mounted='true';const target=box.dataset.videoTarget;
  const title=el('h4','동영상 · Mux'),file=el('input','');file.type='file';file.accept='video/*,.mp4,.mov,.webm,.m4v';file.setAttribute('aria-label','프로젝트 영상 선택');
  const upload=el('button','영상 업로드'),refresh=el('button','영상 상태 새로고침'),status=el('p',''),history=el('div',''),progress=el('progress','');
  progress.max=100;progress.value=0;progress.style.width='100%';status.setAttribute('role','status');upload.type=refresh.type='button';upload.className='primary';
  box.append(title,file,upload,progress,refresh,status,history,el('small','최대 4K · 변환 후 이 프로젝트에 자동 연결됩니다. 업로드 파일은 Git에 저장되지 않습니다. 키 설정은 Site에 있어요.'));
  const targetInfo=async()=>{const t=(await request('targets')).find(t=>t.key===target);if(!t)throw Error('프로젝트를 찾지 못했어요.');return t;};
  async function connect(job){
   const info=await targetInfo();await request(`uploads/${job.id}/attach`,{target,version:info.version});status.textContent='영상이 이 프로젝트에 연결됐어요. 배포하면 실제 사이트에도 반영됩니다.';
  }
  async function list(){
   const [info,jobs]=await Promise.all([targetInfo(),request('uploads')]);history.replaceChildren();
   if(info.mux){const button=el('button','현재 영상 다운로드 (마스터 MP4)');button.type='button';button.onclick=async()=>{button.disabled=true;try{const d=await request('project-download',{target});if(d.url){const link=el('a','MP4 다운로드');link.href=d.url;status.replaceChildren(link);}else status.textContent='마스터 파일 준비 중이에요. 잠시 후 다시 눌러주세요.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}};history.append(button);}
   if(info.video&&!/^https?:/i.test(info.video)){const a=el('a','기존 영상 파일 다운로드');a.href='/api/mux/local-download?target='+encodeURIComponent(target);history.append(a);}
   for(const job of jobs.filter(j=>j.target===target)){
    const row=el('p',job.title+' '),check=el('button','상태 확인 / 연결'),download=el('button','다운로드');check.type=download.type='button';
    check.onclick=async()=>{check.disabled=true;try{const asset=await request(`uploads/${job.id}`);if(asset.status==='ready'){await connect(job);await list();}else status.textContent=asset.status==='preparing'?'Mux에서 영상 변환 중이에요.':`업로드 상태: ${asset.status}`;}catch(e){status.textContent=e.message;}finally{check.disabled=false;}};
    download.onclick=async()=>{download.disabled=true;try{const d=await request(`uploads/${job.id}/download`,{});if(d.url){const a=el('a','MP4 다운로드');a.href=d.url;status.replaceChildren(a);}else status.textContent='마스터 파일 준비 중입니다. 잠시 후 다시 눌러주세요.';}catch(e){status.textContent=e.message;}finally{download.disabled=false;}};
    row.append(check,download);history.append(row);
   }
  }
  refresh.onclick=()=>list().catch(e=>status.textContent=e.message);
  upload.onclick=async()=>{
   const chosen=file.files[0];if(!chosen){status.textContent='영상 파일을 선택해주세요.';return;}
   active++;upload.disabled=file.disabled=true;progress.value=0;
   try{
    const before=await targetInfo();const job=await request('uploads',{target,title:chosen.name});status.textContent='Mux로 업로드 중…';
    await new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',job.url);xhr.setRequestHeader('Content-Type',chosen.type||'application/octet-stream');xhr.upload.onprogress=e=>{if(e.lengthComputable){progress.value=e.loaded/e.total*100;status.textContent=`업로드 ${Math.round(progress.value)}%`;}};xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(Error('업로드 실패. 다시 시도해주세요.'));xhr.onerror=()=>reject(Error('연결이 끊겼어요. 다시 업로드해주세요.'));xhr.send(chosen);});
    file.value='';status.textContent='업로드 완료. Mux에서 변환 중…';await list();
    for(let i=0;i<60;i++){
     await new Promise(r=>setTimeout(r,5000));const asset=await request(`uploads/${job.id}`);
     if(asset.status==='ready'){
      const current=await targetInfo();
      if(JSON.stringify(current.mux)!==JSON.stringify(before.mux)){status.textContent='다른 영상이 연결되어 자동 교체하지 않았어요. 아래 상태 확인 / 연결 버튼으로 연결할 수 있습니다.';return;}
      await connect(job);await list();return;
     }
     if(['errored','cancelled','timed_out'].includes(asset.status))throw Error('영상 처리에 실패했어요. 다시 업로드해주세요.');
    }
    status.textContent='변환이 계속되고 있어요. 잠시 후 아래 상태 확인 / 연결을 눌러주세요.';
   }catch(e){status.textContent=e.message;}finally{active--;upload.disabled=file.disabled=false;}
  };
  // Load project history only when its card is visible, avoiding requests per closed Work.
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();list().catch(e=>status.textContent=e.message);}});observer.observe(box);
 }
 function scan(){document.querySelectorAll('.project-video-tools:not([data-mounted])').forEach(mount);}
 new MutationObserver(scan).observe(document.querySelector('main'),{subtree:true,childList:true});scan();
})();
