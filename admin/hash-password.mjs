import readline from 'node:readline/promises';
import { Writable } from 'node:stream';
import { hashPassword } from './auth.mjs';

if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal.');
const silent = new Writable({ write(chunk, encoding, callback) { callback(); } });
const input = readline.createInterface({ input: process.stdin, output: silent, terminal: true });
try {
  process.stdout.write('Password (12+ characters, hidden): ');
  const first = await input.question('');
  process.stdout.write('\nConfirm password (hidden): ');
  const second = await input.question('');
  process.stdout.write('\n');
  if (first !== second) throw new Error('Passwords do not match.');
  console.log(`ADMIN_PASSWORD_HASH=${await hashPassword(first)}`);
} finally { input.close(); }
