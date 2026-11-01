import { redirect } from "next/navigation";

/**
 * /admin/email held a near-copy of components/admin/EmailCenter.tsx, outside
 * the section switch and its superadmin guard. Kept as a redirect so old
 * bookmarks still work.
 */
export default function AdminEmailRedirect() {
  redirect("/admin?section=email");
}
