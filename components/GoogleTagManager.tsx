import Script from "next/script";

/**
 * Google Tag Manager.
 *
 * A standard GTM install is two parts and the snippet Google shows you first
 * is only the first one:
 *
 *   1. the loader script, which belongs as early as possible;
 *   2. a <noscript> iframe immediately after <body>, which is what records a
 *      visit from a client with JavaScript disabled.
 *
 * Both are here. GtmScript goes in the layout body (Next injects it into the
 * document correctly from there), GtmNoScript goes first inside <body>.
 *
 * next/script with strategy="afterInteractive" rather than a raw inline tag:
 * that is the strategy Google recommends for GTM, and it means the tag cannot
 * block first paint. Dropping a synchronous third-party script into <head>
 * would put an uncached external request on the critical path of every page,
 * which is exactly the kind of thing that undoes the work done on this site's
 * load performance.
 */

/** Container id. Override per environment with NEXT_PUBLIC_GTM_ID. */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-NCTTLTKR";

/**
 * Only load in production builds.
 *
 * Without this, every local `npm run dev` session and every test click sends
 * events into the same container as real traffic, which quietly corrupts the
 * numbers you are trying to read. Preview deployments still count as
 * production; set NEXT_PUBLIC_GTM_ID to an empty string in the Vercel preview
 * environment if you want them excluded too.
 */
const enabled = process.env.NODE_ENV === "production" && GTM_ID.length > 0;

/**
 * Google Analytics 4 measurement id, loaded directly with gtag.js alongside
 * the GTM container. Override with NEXT_PUBLIC_GA_ID (empty string disables).
 * If the GTM container also fires a GA4 tag for this same id, remove one of
 * the two or every page view is counted twice.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-TCPC9S587Z";

export function GtmScript() {
  if (!enabled) return null;

  return (
    <>
      {/*
        Consent Mode defaults, set BEFORE the container loads. Order matters:
        defaults declared after GTM initialises are ignored, and the tag will
        already have written cookies.

        This denies advertising and analytics storage until consent is granted,
        which is what UK and EU visitors require. Google still receives
        cookieless pings, so you keep modelled conversions rather than losing
        the data entirely.

        components/CookieConsent.tsx is the other half: it calls
        gtag('consent','update',...) when a visitor allows analytics, and
        sets it back to denied (and clears the _ga cookies) when they
        withdraw.
      */}
      <Script
        id="gtm-consent-defaults"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  analytics_storage:'denied',
  functionality_storage:'granted',
  security_storage:'granted',
  wait_for_update:500
});
gtag('set','ads_data_redaction',true);`,
        }}
      />

      {/*
        GA4 via gtag.js. It reuses the gtag() defined above, so the consent
        defaults (analytics denied until the visitor allows it in the cookie
        banner) apply: no _ga cookies are written before consent.
      */}
      {GA_ID && (
        <>
          <Script id="ga4-loader" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
          <Script
            id="ga4-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `gtag('js',new Date());gtag('config','${GA_ID}');`,
            }}
          />
        </>
      )}

      <Script
        id="gtm-init"
        strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
        }}
      />
    </>
  );
}

export function GtmNoScript() {
  if (!enabled) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
