import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { updateMilestoneSchema } from "@shared/schema.mysql";
import { z } from "zod";

// PATCH /api/admin/milestones/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const milestoneId = parseInt(id, 10);
    if (isNaN(milestoneId)) {
      return NextResponse.json(
        { message: "Invalid milestone ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = updateMilestoneSchema.parse(body);

    const updatedMilestone = await storage.updateMilestone(
      milestoneId,
      validatedData
    );
    if (!updatedMilestone) {
      return NextResponse.json(
        { message: "Milestone not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedMilestone, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to update milestone:", error);
    return NextResponse.json(
      { message: "Failed to update milestone" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/milestones/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const { id } = await params;
    const milestoneId = parseInt(id, 10);
    if (isNaN(milestoneId)) {
      return NextResponse.json(
        { message: "Invalid milestone ID" },
        { status: 400 }
      );
    }

    const success = await storage.deleteMilestone(milestoneId);
    if (!success) {
      return NextResponse.json(
        { message: "Milestone not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Milestone deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete milestone:", error);
    return NextResponse.json(
      { message: "Failed to delete milestone" },
      { status: 500 }
    );
  }
}
