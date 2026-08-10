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

        NOTE: this is the technical half only. Nothing on the site currently
        asks for consent or calls gtag('consent','update',...), so in its
        present state the container stays in the denied state for everyone.
        Wire a consent banner to that call to complete it.
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
