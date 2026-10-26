import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
app.use((req,res,next) => { res.setHeader('Cache-Control','no-store'); next(); });
// Serve only the public portfolio, including its GitHub Pages base path.
app.use((req, res, next) => {
  const pathname = req.path.replace(/^\/3dowonWebpage(?=\/)/, '');
  if (!/^\/(?:$|[^/]+\.html$|(?:ko|work|lab|assets|Video)\/|(?:styles\.css|selected\.css|script\.js|pdf-reader\.mjs)$)/.test(pathname)) {
    return res.sendStatus(404);
  }
  next();
});
app.use('/3dowonWebpage', express.static(root));
app.use(express.static(root));
const host = process.env.PREVIEW_HOST || '127.0.0.1';
app.listen(4173, host, () => console.log(`Portfolio preview: http://${host}:4173`));
