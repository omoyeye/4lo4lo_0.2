import * as Sentry from "@sentry/nextjs";
import { sentryEnabled, sharedSentryOptions, scrubEvent } from "@/lib/sentry-shared";

/*
 * Edge runtime. Covers proxy.ts (the admin gate) and /api/og, which are the
 * two things that run here. A failure in the gate is exactly the kind of
 * problem that is invisible otherwise: it does not throw a page, it just
 * redirects, which is how the admin login bounce went unnoticed.
 */
if (sentryEnabled) {
  Sentry.init({
    ...sharedSentryOptions,
    beforeSend(event) {
      return scrubEvent(event);
    },
  });
}
