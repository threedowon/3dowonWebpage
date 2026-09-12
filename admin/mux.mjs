import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function createMuxClient({directory = path.join(os.homedir(), '.3dowon-admin'), request = fetch} = {}) {
  const file = path.join(directory, 'mux.json');
  function credentials() {
    if (process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET) return {id:process.env.MUX_TOKEN_ID, secret:process.env.MUX_TOKEN_SECRET};
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
  }
  async function call(route, method='GET', body, keys=credentials()) {
    if (!keys.id || !keys.secret) throw new Error('Videos 탭에서 Mux Token ID와 Token Secret을 등록해주세요.');
    let response;
    try { response = await request(`https://api.mux.com/video/v1/${route}`, {
      method, headers:{Authorization:`Basic ${Buffer.from(`${keys.id}:${keys.secret}`).toString('base64')}`, 'Content-Type':'application/json'},
      ...(body ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(30000),
    }); } catch { throw new Error('Mux 연결에 실패했어요. 잠시 후 다시 시도해주세요.'); }
    if (!response.ok) throw new Error(response.status===401 || response.status===403 ? 'Mux 키와 Video 읽기/쓰기 권한을 확인해주세요.' : `Mux 요청 실패 (${response.status}). 다시 시도해주세요.`);
    return (await response.json()).data;
  }
  return {
    call,
    status:()=>({configured:Boolean(credentials().id && credentials().secret)}),
    async save(id, secret) {
      if (typeof id!=='string' || typeof secret!=='string' || !id.trim() || !secret.trim()) throw new Error('Token ID와 Token Secret을 모두 입력해주세요.');
      const keys={id:id.trim(),secret:secret.trim()};
      await call('assets?limit=1','GET',null,keys);
      fs.mkdirSync(directory,{recursive:true}); fs.writeFileSync(file,JSON.stringify(keys),{mode:0o600});
    },
  };
}
export function muxUploadSettings(origin, title) {
  return {cors_origin:origin,timeout:86400,new_asset_settings:{playback_policies:['public'],video_quality:'basic',max_resolution_tier:'2160p',meta:{title:String(title).slice(0,512)}}};
}
export function installMuxRoutes(app, {loadJson,saveJson,listWorkSlugs,loadWork,build,root,client=createMuxClient(),stateDirectory=path.join(os.homedir(),'.3dowon-admin')}) {
  // Upload URLs and credentials never enter the public content directory.
  const jobFile=path.join(stateDirectory,`mux-uploads-${Buffer.from(root).toString('hex')}.json`);
  const jobs=()=>{try{return JSON.parse(fs.readFileSync(jobFile,'utf8'));}catch{return [];}};
  const saveJobs=rows=>{fs.mkdirSync(path.dirname(jobFile),{recursive:true});fs.writeFileSync(jobFile,JSON.stringify(rows));};
  const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(400).json({error:e.message});}};
  app.use('/api/mux',(req,res,next)=>{
    res.set('Cache-Control','no-store');
    const host=req.get('host');
    if (!/^(localhost|127\.0\.0\.1):\d+$/.test(host||'') || (req.get('origin') && req.get('origin')!==`http://${host}`)) return res.status(403).json({error:'로컬 Admin에서만 사용할 수 있어요.'});
    next();
  });
  app.get('/api/mux/settings',wrap(async(req,res)=>res.json(client.status())));
  app.put('/api/mux/settings',wrap(async(req,res)=>{await client.save(req.body.id,req.body.secret);res.json(client.status());}));
  const version=item=>createHash('sha256').update(JSON.stringify(item)).digest('hex');
  function targets() {
    return [...listWorkSlugs().map(slug=>({key:`works:${slug}`,item:loadWork(slug)})),...loadJson('content/lab.json').items.map((item,index)=>({key:`lab:${index}`,item}))];
  }
  app.get('/api/mux/targets',wrap(async(req,res)=>res.json(targets().map(({key,item})=>({key,version:version(item),title:item.title||item.caption||key,video:item.video||'',vimeo:item.vimeo_url||'',mux:item.mux||null})))));
  app.get('/api/mux/uploads',wrap(async(req,res)=>res.json(jobs())));
  app.post('/api/mux/uploads',wrap(async(req,res)=>{
    const title=String(req.body.title||'Video');
    const target=req.body.target;
    if (target && !targets().some(t=>t.key===target)) throw new Error('프로젝트를 찾지 못했어요.');
    const upload=await client.call('uploads','POST',muxUploadSettings(`http://${req.get('host')}`,title));
    saveJobs([{id:upload.id,title,target,created:new Date().toISOString()},...jobs()]);
    res.json({id:upload.id,url:upload.url});
  }));
  async function assetFor(id) {
    if (!jobs().some(job=>job.id===id)) throw new Error('업로드 기록을 찾지 못했어요.');
    const upload=await client.call(`uploads/${encodeURIComponent(id)}`);
    if (!upload.asset_id) return {status:upload.status};
    const asset=await client.call(`assets/${encodeURIComponent(upload.asset_id)}`);
    return {status:asset.status,asset_id:asset.id,playback_id:asset.playback_ids?.find(p=>p.policy==='public')?.id,aspect_ratio:asset.aspect_ratio,master:asset.master};
  }
  app.get('/api/mux/uploads/:id',wrap(async(req,res)=>{const {master,...asset}=await assetFor(req.params.id);res.json(asset);}));
  app.post('/api/mux/uploads/:id/attach',wrap(async(req,res)=>{
    const asset=await assetFor(req.params.id);
    if(asset.status!=='ready'||!asset.playback_id) throw new Error('영상 변환이 완료된 뒤 연결해주세요.');
    const target=targets().find(t=>t.key===req.body.target);
    if(!target) throw new Error('프로젝트를 찾지 못했어요. 목록을 새로고침해주세요.');
    if (version(target.item)!==req.body.version) throw new Error('프로젝트 내용이 바뀌었어요. 목록을 새로고침한 뒤 다시 연결해주세요.');
    const item=target.item;
    item.mux={upload_id:req.params.id,asset_id:asset.asset_id,playback_id:asset.playback_id,aspect_ratio:asset.aspect_ratio||'16:9'};
    if(target.key.startsWith('works:')) saveJson(`content/works/${target.key.slice(6)}.json`,item);
    else {const lab=loadJson('content/lab.json');lab.items[Number(target.key.slice(4))]=item;saveJson('content/lab.json',lab);}
    build();res.json({ok:true});
  }));
  app.post('/api/mux/uploads/:id/download',wrap(async(req,res)=>{
    let asset=await assetFor(req.params.id);
    if(asset.status!=='ready') throw new Error('영상 변환이 완료되지 않았어요.');
    if(!['ready','preparing'].includes(asset.master?.status)) {
      await client.call(`assets/${asset.asset_id}/master-access`,'PUT',{master_access:'temporary'});
      asset=await assetFor(req.params.id);
    }
    const url=asset.master?.status==='ready'?asset.master.url:null;
    res.json({status:asset.master?.status||'preparing',url:url?`${url}&download=video.mp4`:null});
  }));
  app.post('/api/mux/project-download',wrap(async(req,res)=>{
    const id=targets().find(t=>t.key===req.body.target)?.item?.mux?.asset_id;
    if(!id) throw new Error('연결된 Mux 영상이 없어요.');
    let asset=await client.call('assets/'+encodeURIComponent(id));
    if(!['ready','preparing'].includes(asset.master?.status)){
      await client.call('assets/'+encodeURIComponent(id)+'/master-access','PUT',{master_access:'temporary'});
      asset=await client.call('assets/'+encodeURIComponent(id));
    }
    const url=asset.master?.status==='ready'?asset.master.url:null;
    res.json({url:url?url+'&download=video.mp4':null});
  }));
  app.get('/api/mux/local-download',wrap(async(req,res)=>{
    const item=targets().find(t=>t.key===req.query.target)?.item;
    const allowed=[item?.video,item?.image,item?.thumbnail,...(item?.gallery||[])].filter(v=>typeof v==='string');
    const src=req.query.field==='thumbnail' ? item?.thumbnail : req.query.src || item?.video;
    if(!allowed.includes(src)) throw new Error('이 프로젝트에 속한 파일이 아니에요.');
    if(!src || /^https?:/i.test(src)) throw new Error('로컬 파일이 없어요. 외부 영상은 해당 서비스에서 다운로드해주세요.');
    const relative=src.replace(/^\/3dowonWebpage\//,'').replace(/^\//,'');
    const full=path.resolve(root,relative);
    if(!full.startsWith(path.resolve(root)+path.sep)||!/\.(mp4|webm|mov|m4v|jpg|jpeg|png|webp|gif|avif|svg)$/i.test(full)||!fs.existsSync(full)) throw new Error('저장된 파일을 찾지 못했어요.');
    res.download(full);
  }));
}
