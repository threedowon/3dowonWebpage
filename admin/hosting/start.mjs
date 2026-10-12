import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { authConfig } from '../auth.mjs';

authConfig(); // Validate login settings before accessing the content repository.
const root = process.env.ADMIN_REPO_DIR;
const repository = process.env.GITHUB_REPOSITORY;
const branch = process.env.GITHUB_BRANCH || 'main';
if (!root || !/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !process.env.GITHUB_TOKEN) throw new Error('Set ADMIN_REPO_DIR, GITHUB_REPOSITORY and GITHUB_TOKEN.');
function git(args, cwd = root) { return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
git(['check-ref-format', '--branch', branch], '/app');
if (!fs.existsSync(path.join(root, '.git'))) {
  fs.mkdirSync(root, { recursive: true });
  git(['clone', '--branch', branch, '--single-branch', `https://github.com/${repository}.git`, root], '/app');
} else {
  if (git(['remote', 'get-url', 'origin']) !== `https://github.com/${repository}.git` || git(['branch', '--show-current']) !== branch) throw new Error('Persistent repository does not match the configured repository/branch.');
  git(['fetch', 'origin', branch]);
  if (!git(['status', '--porcelain'])) git(['merge', '--ff-only', `origin/${branch}`]);
  else console.log('Saved drafts retained. Remote updates will be checked at deployment.');
}
git(['config', 'user.name', process.env.GIT_AUTHOR_NAME || '3Dowon Admin']);
git(['config', 'user.email', process.env.GIT_AUTHOR_EMAIL || 'admin@users.noreply.github.com']);
const dependencies = path.join(root, 'node_modules');
if (!fs.existsSync(dependencies)) fs.symlinkSync('/app/node_modules', dependencies, 'dir');
await import('../server.js');
