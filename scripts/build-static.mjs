import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const dist = resolve(root, 'dist');

await mkdir(dist, { recursive: true });

const sourceHtml = await readFile(resolve(root, 'index.html'), 'utf8');
const builtHtml = sourceHtml.replace('./dist/main.js', './main.js');
if (builtHtml === sourceHtml) {
  throw new Error('index.html must reference ./dist/main.js');
}

await writeFile(resolve(dist, 'index.html'), builtHtml);
await copyFile(resolve(root, 'styles.css'), resolve(dist, 'styles.css'));
await copyFile(resolve(root, 'favicon.svg'), resolve(dist, 'favicon.svg'));
console.warn('Static files copied to dist/');
