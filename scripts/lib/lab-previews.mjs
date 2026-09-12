import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';

const run = promisify(execFile);
const isVideo = src => /\.(mp4|webm|mov|m4v)$/i.test(src || '');

// Generate once per uploaded video, including existing uploads. No content JSON changes.
export async function prepareLabPreviews(studies, root = process.cwd()) {
  const previews = new Map();
  for (const study of studies) {
    study.lab_previews = {};
    for (const src of new Set([study.video, study.hero_image, study.thumbnail, ...study.gallery].filter(isVideo))) {
      if (/^https?:\/\//i.test(src)) continue;
      if (!previews.has(src)) {
        const relative = src.replace(/^\/3dowonWebpage\//, '').replace(/^\//, '');
        const input = path.resolve(root, relative);
        const withinRoot = path.relative(path.resolve(root), input);
        if (withinRoot.startsWith('..') || path.isAbsolute(withinRoot)) throw new Error('Lab video must be inside the site.');
        const output = `${input}.poster.jpg`;
        const source = await fs.stat(input);
        const existing = await fs.stat(output).catch(() => null);
        if (!existing?.size || existing.mtimeMs < source.mtimeMs) {
          await run(ffmpeg, ['-y', '-i', input, '-map', '0:v:0', '-frames:v', '1', '-vf',
            "scale=w='min(960,iw)':h='min(960,ih)':force_original_aspect_ratio=decrease", '-q:v', '4', output],
          { timeout: 60000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
        }
        const { width, height } = await sharp(output).metadata();
        // Animated image fallback does not depend on the browser's video autoplay permission.
        const loop = `${input}.loop.webp`;
        const cachedLoop = await fs.stat(loop).catch(() => null);
        if (!cachedLoop?.size || cachedLoop.mtimeMs < source.mtimeMs) {
          const temporaryLoop = `${input}.loop.tmp.webp`;
          try {
            await run(ffmpeg, ['-y', '-i', input, '-an', '-vf',
              "fps=12,scale=w='min(640,iw)':h='min(640,ih)':force_original_aspect_ratio=decrease",
              '-c:v', 'libwebp_anim', '-lossless', '0', '-quality', '65', '-compression_level', '4', '-loop', '0', temporaryLoop],
            { timeout: 300000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
            await fs.rename(temporaryLoop, loop);
          } finally {
            await fs.rm(temporaryLoop, { force: true });
          }
        }
        previews.set(src, { src: `${relative}.poster.jpg`, loop: `${relative}.loop.webp`, width, height });
      }
      study.lab_previews[src] = previews.get(src);
    }
  }
}
