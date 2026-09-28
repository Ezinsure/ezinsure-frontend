import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'src');

const includeDirs = [
  'app/admin',
  'app/agent',
  'app/super_admin',
  'app/finance',
  'components/ui/finance',
];

const lineRe =
  /^[ \t]*<div className="absolute top-0 left-0 w-full h-\[(?:10|11)vh\][^\n]*bg-gradient-to-br from-\[#0A2540\] to-\[#126BB3\][^\n]*\/?>\s*$/gm;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else if (name.endsWith('.tsx')) files.push(full);
  }
  return files;
}

let changed = 0;

for (const rel of includeDirs) {
  const dir = path.join(root, rel);
  for (const file of walk(dir)) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    content = content.replace(lineRe, '');
    // Collapse extra blank lines (max 2 consecutive)
    content = content.replace(/\n{3,}/g, '\n\n');

    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log('Removed gradient:', path.relative(process.cwd(), file));
      changed++;
    }
  }
}

console.log(`Done. Updated ${changed} file(s).`);
