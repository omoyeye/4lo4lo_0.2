/**
 * fix-returning.cjs
 *
 * Replaces .returning() patterns in storage.db.ts with MySQL-compatible equivalents.
 *
 * PATTERN A — INSERT...returning() → INSERT then SELECT by insertId
 *   Before:  const [newX] = await db.insert(tbl).values(v).returning();
 *   After:   const result = await db.insert(tbl).values(v);
 *            const [newX] = await db.select().from(tbl).where(eq(tbl.id, result[0].insertId));
 *
 * PATTERN B — UPDATE...returning() → UPDATE then SELECT by id
 *   Before:  const [updatedX] = await db.update(tbl).set(s).where(w).returning();
 *   After:   await db.update(tbl).set(s).where(w);
 *            const [updatedX] = await db.select().from(tbl).where(w_reused);
 *
 * Because these patterns are complex and highly contextual, this script
 * simply flags the remaining occurrences so we can patch them manually.
 */

const fs = require('fs');
const content = fs.readFileSync('server/storage.db.ts', 'utf8');
const lines = content.split('\n');

let count = 0;
lines.forEach((line, i) => {
  if (line.includes('.returning()')) {
    count++;
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
console.log(`\nTotal .returning() calls: ${count}`);
