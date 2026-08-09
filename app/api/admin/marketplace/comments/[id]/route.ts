import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";

// DELETE /api/admin/marketplace/comments/:id, remove an abusive comment
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const commentId = parseInt(id, 10);
    if (isNaN(commentId)) {
      return NextResponse.json(
        { message: "Invalid comment ID" },
        { status: 400 }
      );
    }

    const comment = await storage.getListingComment(commentId);
    if (!comment) {
      return NextResponse.json(
        { message: "Comment not found" },
        { status: 404 }
      );
    }

    await storage.deleteListingComment(commentId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    return NextResponse.json(
      { message: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
