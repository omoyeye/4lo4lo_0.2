import LegalDoc from "@/components/legal/LegalDoc";
import { termsSections } from "@/lib/legal-content";
import { getBrand } from "@/lib/brand";

// Company details come from Admin → Brand; re-read every few minutes.
export const revalidate = 300;

export default async function Page() {
  const brand = await getBrand();
  return (
    <LegalDoc
      title="Terms of Service"
      intro={`The rules for using ${brand.name}: who can join, how points and withdrawals work, and what we each promise.`}
      sections={termsSections(brand)}
      other={{ href: "/privacy", label: "Privacy Policy →" }}
    />
  );
}
