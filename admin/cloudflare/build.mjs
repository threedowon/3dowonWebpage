import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(here, 'dist');
fs.mkdirSync(output, { recursive: true });
// Copy only known UI assets. No content, server code, tokens or env files enter assets.
for (const file of fs.readdirSync(path.join(here, '../public'))) {
  if (!/\.(js|mjs|css|html)$/.test(file) || /^login\.(html|js)$/.test(file)) continue;
  let data = fs.readFileSync(path.join(here, '../public', file));
  if (file === 'index.html') data = Buffer.from(data.toString().replace('<head>', '<head>\n<script src="/online.js"></script>'));
  fs.writeFileSync(path.join(output, file), data);
}
fs.copyFileSync(path.join(here, 'online.js'), path.join(output, 'online.js'));
console.log('Cloudflare admin UI built. Local admin files unchanged.');
