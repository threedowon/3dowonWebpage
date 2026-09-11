import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
const run = promisify(execFile);

export async function saveLabVideo(buffer, directory) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), '3dowon-lab-video-'));
  const input = path.join(temp, 'source');
  const filename = `lab-${randomUUID()}.mp4`;
  const output = path.join(directory, filename);
  try {
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(input, buffer);
    await run(ffmpeg, ['-y','-i',input,'-map','0:v:0','-an','-vf',"scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",'-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',output], {timeout:300000,windowsHide:true,maxBuffer:2*1024*1024});
    return filename;
  } catch (error) {
    await fs.rm(output, {force:true});
    throw new Error('영상을 MP4로 변환하지 못했어요. 파일 형식과 길이를 확인해주세요.');
  } finally {
    await fs.rm(input, {force:true});
    await fs.rmdir(temp);
  }
}
