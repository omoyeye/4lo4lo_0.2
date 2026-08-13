import * as Sentry from "@sentry/nextjs";
import { sentryEnabled, sharedSentryOptions, scrubEvent } from "@/lib/sentry-shared";

// Server runtime (Node). Loaded from instrumentation.ts.
// Guarded so the SDK stays completely inert until a DSN exists.
if (sentryEnabled) {
  Sentry.init({
    ...sharedSentryOptions,
    beforeSend(event) {
      return scrubEvent(event);
    },
  });
}
