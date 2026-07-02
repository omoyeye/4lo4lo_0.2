const fs = require('fs');
const files = [
  'server/storage.ts',
  'server/storage.db.ts',
  'server/routes.ts'
];
for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  // Replace @shared/schema" that is NOT already followed by .mysql
  const updated = content.replace(/@shared\/schema"(?!\.mysql)/g, '@shared/schema.mysql"');
  const count = (content.match(/@shared\/schema"(?!\.mysql)/g) || []).length;
  fs.writeFileSync(f, updated);
  console.log(`Fixed ${count} reference(s) in ${f}`);
}
console.log('Done.');
