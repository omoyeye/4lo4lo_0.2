import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// POST /api/admin/bulk-email
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { subject, htmlContent, textContent } = await req.json();

    if (!subject || !htmlContent) {
      return NextResponse.json(
        { message: "Subject and HTML content are required" },
        { status: 400 }
      );
    }

    const allUsers = await storage.getAllUsers();
    const recipients = allUsers
      .filter((user) => user.email)
      .map((user) => ({ email: user.email, username: user.username }));

    if (recipients.length === 0) {
      return NextResponse.json(
        { message: "No verified users to send emails to" },
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
