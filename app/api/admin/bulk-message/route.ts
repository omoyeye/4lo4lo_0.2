import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { announcementRecipients } from "@/lib/core/announcement-recipients";

// POST /api/admin/bulk-message
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireSuperadmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const {
      subject,
      htmlContent,
      textContent,
      sendEmail,
      sendNotification,
    } = await req.json();

    if (!subject || !htmlContent) {
      return NextResponse.json(
        { message: "Subject and content are required" },
        { status: 400 }
      );
    }

    const results: any = {
      email: null,
      notification: null,
    };

    const allUsers = await storage.getAllUsers();

    if (sendEmail) {
      // Opted-out, deleted and undeliverable members are skipped.
      const recipients = announcementRecipients(allUsers);

      if (recipients.length > 0) {
        const { sendBulkEmail } = await import("@/lib/core/services/email");
        results.email = await sendBulkEmail({
          subject,
          htmlContent,
          textContent,
          recipients,
        });
      } else {
        results.email = {
          success: 0,
          failed: 0,
          errors: ["No members are currently subscribed to announcements"],
        };
      }
    }

    if (sendNotification) {
      let successCount = 0;
      const plainTextMessage =
        textContent ||
        htmlContent
          .replace(/<[^>]*>/g, "")
          .substring(0, 500);

      for (const user of allUsers) {
        if (user.role === "deleted") continue;
        try {
          await storage.createNotification({
            userId: user.id,
            adminOnly: false,
            type: "system_announcement",
            title: subject,
            message: plainTextMessage,
            data: null,
            isRead: false,
          });
          successCount++;
        } catch (err) {
          console.error(`Failed notification for user ${user.id}:`, err);
        }
      }

      results.notification = {
        success: successCount,
        total: allUsers.length,
      };

      // TODO: (Phase 9) Send real-time SSE update here.
      // try {
      //   const websocketModule = await import('./websocket');
      //   const rtService = websocketModule.getRealTimeService();
      //   if (rtService) {
      //     rtService.broadcastToAllUsers({
      //       type: "new_notification",
      //       data: { type: "system_announcement", title: subject, message: plainTextMessage },
      //       timestamp: Date.now()
      //     });
      //   }
      // } catch (err) {
      //   console.error("Failed to broadcast:", err);
      // }
    }

    return NextResponse.json(
      {
        message: "Bulk message sent successfully",
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Bulk message error:", error);
    return NextResponse.json(
      { message: "Failed to send bulk message" },
      { status: 500 }
    );
  }
}
