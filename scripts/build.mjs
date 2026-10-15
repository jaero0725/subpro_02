import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'public/originals'), { recursive: true });
for (const file of ['index.html', 'src', 'public/assets']) {
  await cp(path.join(root, file), path.join(dist, file), { recursive: true });
}
for (const name of await readdir(path.join(root, 'docs'))) {
  const number = /^THEMAN QR-(\d{2})\.png$/.exec(name)?.[1];
  if (number && !['01', '11'].includes(number)) {
    await cp(path.join(root, 'docs', name), path.join(dist, 'public/originals', `result-${number}.png`));
  }
}
console.log('Built dist/ — static site, original PNG downloads included.');
