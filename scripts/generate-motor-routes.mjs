import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'src', 'app');

const routes = [
  { role: 'admin', pages: [
    'dashboard', 'applications', 'my-applications', 'new-application',
    'commission-review', 'users', 'expiring-insurance', 'sms-tracking',
    'FAQ', 'profile', 'agents/analytics',
  ]},
  { role: 'agent', pages: ['dashboard', 'apply', 'applications', 'FAQ', 'profile'] },
  { role: 'super_admin', pages: [
    'dashboard', 'applications', 'users', 'expiring-insurance',
    'sms-tracking', 'FAQ', 'profile', 'agents/analytics',
  ]},
  { role: 'finance', pages: ['dashboard', 'payments', 'payment-initiated', 'history', 'profile'] },
];

for (const { role, pages } of routes) {
  for (const page of pages) {
    const targetDir = path.join(root, role, 'motor', page);
    const targetFile = path.join(targetDir, 'page.tsx');
    const depth = page.split('/').length;
    const back = '../'.repeat(depth + 1);
    const importPath = `${back}${page.split('/').pop() === page ? page : page}`;

    let relativeImport;
    if (page.includes('/')) {
      relativeImport = `${back}${page}`;
    } else {
      relativeImport = `${back}${page}`;
    }

    fs.mkdirSync(targetDir, { recursive: true });
    const content = `export { default } from '${relativeImport}/page';\n`;
    fs.writeFileSync(targetFile, content);
    console.log('Created', targetFile);
  }
}
