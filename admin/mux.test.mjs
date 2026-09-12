import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import {createMuxClient,muxUploadSettings,installMuxRoutes} from './mux.mjs';

test('Mux credentials stay private and API failures never echo secret',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'mux-test-'));
 try {
  const client=createMuxClient({directory,request:async(url,options)=>{assert.match(options.headers.Authorization,/^Basic /);return {ok:true,json:async()=>({data:[]})};}});
  await client.save('test-id','test-secret');assert.deepEqual(client.status(),{configured:true});
  const bad=createMuxClient({directory,request:async()=>({ok:false,status:401,json:async()=>({error:'test-secret'})})});
  await assert.rejects(()=>bad.call('assets'),e=>!e.message.includes('test-secret'));
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('4K direct upload uses exact origin, no paid static renditions',()=>{
 const settings=muxUploadSettings('http://127.0.0.1:4848','Film');
 assert.equal(settings.cors_origin,'http://127.0.0.1:4848');assert.equal(settings.new_asset_settings.max_resolution_tier,'2160p');
 assert.equal(settings.new_asset_settings.video_quality,'basic');assert.equal(settings.new_asset_settings.static_renditions,undefined);
});
test('upload status, ready-only attach, stale target protection, master download and origin guard',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mux-routes-'));let ready=false,builds=0;
 fs.writeFileSync(path.join(dir,'photo.png'),'image-bytes');
 let work={gallery:['photo.png'],slug:'demo',title:'Demo',description:'Keep me',vimeo_url:'https://vimeo.com/123'};
 const app=express();app.use(express.json());
 installMuxRoutes(app,{root:dir,stateDirectory:dir,listWorkSlugs:()=>['demo'],loadWork:()=>structuredClone(work),loadJson:()=>({items:[]}),saveJson:(p,w)=>{work=w;},build:()=>builds++,client:{status:()=>({configured:true}),call:async(route,method)=>{
  if(route==='uploads')return {id:'upload1',url:'https://example.com/upload'};
  if(route==='uploads/upload1')return {asset_id:'asset1'};
  if(route==='assets/asset1')return {id:'asset1',status:ready?'ready':'preparing',playback_ids:[{id:'play1',policy:'public'}],master:{status:'ready',url:'https://mezzanine.mux.com/master.mp4?signature=x'}};
  throw Error('Unexpected route');
 }}});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api/mux/`;
 const req=(route,body)=>fetch(base+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 try{
  assert.equal((await fetch(base+'uploads',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);
  await req('uploads',{title:'Movie'});const targets=await (await req('targets')).json();const payload={target:'works:demo',version:targets[0].version};
  assert.equal((await req('uploads/upload1/attach',payload)).status,400);ready=true;
  assert.equal((await req('uploads/upload1/attach',{...payload,version:'stale'})).status,400);
  assert.equal((await req('uploads/upload1/attach',payload)).status,200);
  const saved=await req('local-download?target=works:demo&src=photo.png');assert.equal(saved.status,200);assert.match(saved.headers.get('content-disposition'),/attachment/);assert.equal(await saved.text(),'image-bytes');
  assert.equal((await req('local-download?target=works:demo&src=../secret.png')).status,400);
  assert.equal(work.mux.playback_id,'play1');assert.equal(work.description,'Keep me');assert.equal(work.vimeo_url,'https://vimeo.com/123');assert.equal(builds,1);
  const download=await (await req('uploads/upload1/download',{})).json();assert.match(download.url,/download=video.mp4/);
 }finally{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
});
