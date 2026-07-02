const fs = require('fs');
const files = [
  'server/storage.ts',
  'server/storage.db.ts',
  'server/routes.ts',
  'server/auth.ts',
  'server/db.ts',
  'server/notification-service.ts',
  'server/task-allocator.ts',
  'server/websocket.ts',
  'server/services/analytics.ts',
  'server/services/batch-allocation.ts',
];
let allOk = true;
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  // Check for @shared/schema" NOT followed by .mysql
  const oldPattern = /@shared\/schema"(?!\.mysql)/;
  if (oldPattern.test(c)) {
    const count = (c.match(new RegExp('@shared/schema"(?!\\.mysql)', 'g')) || []).length;
    console.log('STILL HAS OLD REFS: ' + f + ' (' + count + ')');
    allOk = false;
  } else {
    console.log('OK: ' + f);
  }
}
if (allOk) console.log('\nAll schema imports are clean!');
else console.log('\nSome files need attention.');
