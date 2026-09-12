import { spawn } from 'node:child_process';
import { glob } from 'node:fs/promises';

const files = [];
for await (const file of glob('{electron,src,workers}/**/*.test.ts')) {
  if (file.includes('.emulator.')) continue;
  files.push(file.replaceAll('\\', '/'));
}
files.sort();
if (files.length === 0) {
  console.error('Nenhum teste unitário encontrado.');
  process.exit(1);
}
const child = spawn(
  process.execPath,
  ['--experimental-transform-types', '--test', ...files],
  { stdio: 'inherit' },
);
child.on('exit', code => process.exit(code ?? 1));
