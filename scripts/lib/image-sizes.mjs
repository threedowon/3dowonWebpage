import path from 'node:path';
import sharp from 'sharp';
import { workImageCandidates } from '../../admin/public/work-images.mjs';

// Read dimensions at build time so lazy images do not resize the gallery as they load.
export async function prepareWorkImageSizes(works, root = process.cwd()) {
  const sizes = new Map();
  for (const work of works) {
    work.image_sizes = {};
    for (const src of workImageCandidates(work)) {
      if (/^(?:https?:)?\/\//i.test(src)) continue;
      if (!sizes.has(src)) {
        const relative = src.replace(/^\/3dowonWebpage\//, '').replace(/^\//, '').split(/[?#]/)[0];
        const input = path.resolve(root, relative);
        const withinRoot = path.relative(path.resolve(root), input);
        if (withinRoot.startsWith('..') || path.isAbsolute(withinRoot)) continue;
        const metadata = await sharp(input).metadata().catch(() => null);
        const rotated = metadata?.orientation >= 5;
        const width = rotated ? metadata?.height : metadata?.width;
        const height = rotated ? metadata?.width : metadata?.height;
        sizes.set(src, width && height ? { width, height } : null);
      }
      if (sizes.get(src)) work.image_sizes[src] = sizes.get(src);
    }
  }
}
