import { redirect } from "next/navigation";

/**
 * /admin/dashboard used to hold a byte-identical copy of the 4,123-line
 * /admin page, two URLs, one file, duplicated. It is kept as a redirect so
 * existing bookmarks and the old login redirect keep working.
 */
export default function AdminDashboardRedirect() {
  redirect("/admin");
}
