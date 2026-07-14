import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// POST /api/admin/bulk-message
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
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
      const recipients = allUsers
        .filter((user) => user.email)
        .map((user) => ({ email: user.email, username: user.username }));

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
          errors: ["No verified users"],
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
