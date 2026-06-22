import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'src');

const replacements = [
  ['/admin/dashboard', '/admin/motor/dashboard'],
  ['/admin/applications', '/admin/motor/applications'],
  ['/admin/my-applications', '/admin/motor/my-applications'],
  ['/admin/new-application', '/admin/motor/new-application'],
  ['/admin/commission-review', '/admin/motor/commission-review'],
  ['/admin/users', '/admin/motor/users'],
  ['/admin/expiring-insurance', '/admin/motor/expiring-insurance'],
  ['/admin/sms-tracking', '/admin/motor/sms-tracking'],
  ['/admin/FAQ', '/admin/motor/FAQ'],
  ['/admin/profile', '/admin/motor/profile'],
  ['/agent/dashboard', '/agent/motor/dashboard'],
  ['/agent/apply', '/agent/motor/apply'],
  ['/agent/applications', '/agent/motor/applications'],
  ['/agent/FAQ', '/agent/motor/FAQ'],
  ['/agent/profile', '/agent/motor/profile'],
  ['/super_admin/dashboard', '/super_admin/motor/dashboard'],
  ['/super_admin/applications', '/super_admin/motor/applications'],
  ['/super_admin/users', '/super_admin/motor/users'],
  ['/super_admin/expiring-insurance', '/super_admin/motor/expiring-insurance'],
  ['/super_admin/sms-tracking', '/super_admin/motor/sms-tracking'],
  ['/super_admin/FAQ', '/super_admin/motor/FAQ'],
  ['/super_admin/profile', '/super_admin/motor/profile'],
  ['/finance/dashboard', '/finance/motor/dashboard'],
  ['/finance/payments', '/finance/motor/payments'],
  ['/finance/payment-initiated', '/finance/motor/payment-initiated'],
  ['/finance/history', '/finance/motor/history'],
  ['/finance/profile', '/finance/motor/profile'],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

let updated = 0;

const skipFiles = new Set([
  path.join(root, 'shared', 'routing', 'motor-paths.ts'),
]);

for (const file of walk(root)) {
  if (skipFiles.has(file)) continue;

  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  for (const [from, to] of replacements) {
    if (from === to) continue;
    if (content.includes(to)) continue;
    content = content.split(from).join(to);
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    updated += 1;
    console.log('Updated', path.relative(process.cwd(), file));
  }
}

console.log(`Done. ${updated} file(s) updated.`);
