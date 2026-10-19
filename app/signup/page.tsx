import { permanentRedirect } from "next/navigation";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Keep the query string: referral links in the wild are /signup?ref=CODE.
export default async function Page({ searchParams }: Props) {
  const ref = (await searchParams).ref;
  const code = Array.isArray(ref) ? ref[0] : ref;
  permanentRedirect(code ? `/auth?ref=${encodeURIComponent(code)}` : "/auth");
}
