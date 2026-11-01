import LegalDoc from "@/components/legal/LegalDoc";
import { privacySections } from "@/lib/legal-content";
import { getBrand } from "@/lib/brand";

// Company details come from Admin → Brand; re-read every few minutes.
export const revalidate = 300;

export default async function Page() {
  const brand = await getBrand();
  return (
    <LegalDoc
      title="Privacy Policy"
      intro="What personal data we collect, why, who we share it with, how long we keep it, and how to use your rights."
      sections={privacySections(brand)}
      other={{ href: "/terms", label: "Terms of Service →" }}
    />
  );
}
