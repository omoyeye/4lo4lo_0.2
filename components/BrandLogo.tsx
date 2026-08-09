import Image from "next/image";
import Link from "next/link";

/**
 * The brand logo, in one place.
 *
 * The tool and learn headers previously rendered a placeholder: the character
 * "4" inside a gradient square. That is not the brand mark, so those sections
 * of the site were unbranded.
 *
 * Serves logo-64.webp rather than 4lo4lo-logo.png. The original is 774x784 and
 * 1.2MB, which is an absurd payload for a 32px header mark and would have been
 * downloaded on every page. The resized WebP is 1.8KB.
 */
export function BrandLogo({
  size = 32,
  showWordmark = true,
  href = "/",
  className = "",
  priority = false,
}: {
  size?: number;
  showWordmark?: boolean;
  /** Pass null to render without a link, e.g. inside an existing anchor. */
  href?: string | null;
  className?: string;
  priority?: boolean;
}) {
  const mark = (
    <>
      <Image
        src="/logo-64.webp"
        alt=""
        width={size}
        height={size}
        priority={priority}
        className="rounded-lg object-contain"
        // Decorative when the wordmark is present; the text carries the name.
        aria-hidden={showWordmark || undefined}
      />
      {showWordmark && (
        <span className="hidden bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text font-bold tracking-tight text-transparent sm:inline">
          4LO4LO
        </span>
      )}
    </>
  );

  if (href === null) {
    return <span className={`flex items-center gap-2 ${className}`}>{mark}</span>;
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 ${className}`}
      aria-label={showWordmark ? undefined : "4lo4lo home"}
    >
      {mark}
    </Link>
  );
}

/**
 * Large, low-opacity logo used as hero decoration.
 * Purely decorative, so it is hidden from assistive technology.
 *
 * Deliberately a plain <img> rather than next/image. Two reasons:
 *
 *  1. The optimiser re-encodes to JPEG, which has no alpha channel, so a logo
 *     with a transparent background comes back with the transparency filled.
 *     At low opacity that reads as a grey block instead of the mark.
 *  2. There is nothing to optimise. The size is fixed, it is never part of the
 *     responsive layout, and the source is already a 16KB WebP. Routing it
 *     through the optimiser only adds a round trip and, on Vercel, billable
 *     image transformations.
 */
export function BrandWatermark({
  className = "",
  size = 320,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <img
      src="/logo-320.webp"
      alt=""
      width={size}
      height={size}
      aria-hidden
      /*
       * Not lazy. This sits in the hero, above the fold, so lazy loading is
       * wrong on principle. It was also failing in practice: the browser never
       * issued the request at all (no resource timing entry), while the same
       * URL loaded fine in a detached Image, so the hero rendered with an
       * empty box where the mark should be.
       */
      decoding="async"
      className={`pointer-events-none select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
