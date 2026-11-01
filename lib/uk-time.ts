/**
 * The site's day runs on UK time: daily check-ins, "done today" and daily
 * task allocations roll over at UK midnight, which is 23:00 UTC during
 * British Summer Time. Stored timestamps stay in UTC (see lib/db.ts);
 * browsers show them in the viewer's own time zone.
 */
export const UK_TZ = "Europe/London";

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: UK_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: UK_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** The UK calendar date, YYYY-MM-DD. */
export function ukDate(at: Date = new Date()): string {
  return dateFmt.format(at);
}

/** Minutes the UK is ahead of UTC at a moment: 0 in winter, 60 in summer. */
function ukOffsetMinutes(at: Date): number {
  const p = Object.fromEntries(partsFmt.formatToParts(at).map((x) => [x.type, x.value]));
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((wall - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
}

/** The moment today's UK day began. */
export function ukMidnight(at: Date = new Date()): Date {
  const midnightAsUtc = new Date(`${ukDate(at)}T00:00:00Z`);
  return new Date(midnightAsUtc.getTime() - ukOffsetMinutes(midnightAsUtc) * 60_000);
}
