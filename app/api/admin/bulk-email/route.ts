import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { announcementRecipients } from "@/lib/core/announcement-recipients";

// POST /api/admin/bulk-email
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireSuperadmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { subject, htmlContent, textContent } = await req.json();

    if (!subject || !htmlContent) {
      return NextResponse.json(
        { message: "Subject and HTML content are required" },
        { status: 400 }
      );
    }

    const allUsers = await storage.getAllUsers();
    // Opted-out, deleted and undeliverable members are skipped.
    const recipients = announcementRecipients(allUsers);

    if (recipients.length === 0) {
      return NextResponse.json(
        { message: "No members are currently subscribed to announcements" },
        { status: 400 }
      );
    }

    const { sendBulkEmail } = await import("@/lib/core/services/email");
    const result = await sendBulkEmail({
      subject,
      htmlContent,
      textContent,
      recipients,
    });

    return NextResponse.json(
      {
        message: `Email sent to ${result.success} users. Failed: ${result.failed}`,
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Bulk email error:", error);
    return NextResponse.json(
      { message: "Failed to send bulk emails" },
      { status: 500 }
    );
  }
}
