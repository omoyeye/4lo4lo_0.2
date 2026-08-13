import * as Sentry from "@sentry/nextjs";
import { sentryEnabled, sharedSentryOptions, scrubEvent } from "@/lib/sentry-shared";

/*
 * Browser runtime.
 *
 * Session Replay is deliberately NOT enabled. It records the DOM, and this app
 * renders payout amounts, payment details and personal profile data. Turning it
 * on would need a considered decision about masking and about what your privacy
 * policy says, so it is left off rather than switched on by default.
 */
if (sentryEnabled) {
  Sentry.init({
    ...sharedSentryOptions,
    beforeSend(event) {
      return scrubEvent(event);
    },
  });
}

/** Reports slow or failed client-side route transitions. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
