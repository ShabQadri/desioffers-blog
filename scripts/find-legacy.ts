import fs from 'fs';
import path from 'path';

function scan(dir: string) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      scan(p);
    } else if (f.endsWith('.astro') || f.endsWith('.ts') || f.endsWith('.json') || f.endsWith('.mdx')) {
      const c = fs.readFileSync(p, 'utf-8');
      if (c.includes('PickWise') || c.includes('pickwise')) {
        console.log('FOUND MATCH:', p);
      }
    }
  }
}

scan(path.join(process.cwd(), 'src'));
