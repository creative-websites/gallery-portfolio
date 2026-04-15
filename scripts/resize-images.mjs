import sharp from 'sharp';
import { readdir, rename } from 'fs/promises';
import { join } from 'path';

const dir = 'public/images';
const files = (await readdir(dir)).filter(f => f.endsWith('.jpg'));

await Promise.all(files.map(async (file) => {
  const path = join(dir, file);
  const img = sharp(path);
  const { width, height } = await img.metadata();
  const longest = Math.max(width, height);

  if (longest <= 800) {
    console.log(`skip  ${file} (${longest}px)`);
    return;
  }

  await img
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(path + '.tmp');

  await rename(path + '.tmp', path);
  console.log(`done  ${file} (${longest}px → 800px)`);
}));

console.log('\nAll done. Run: du -sh public/images/');
