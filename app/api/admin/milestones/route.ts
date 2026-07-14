import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { createMilestoneSchema } from "@shared/schema.mysql";
import { z } from "zod";

// GET /api/admin/milestones
export async function GET(_req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const milestones = await storage.getMilestones();
    return NextResponse.json(milestones, { status: 200 });
  } catch (error) {
    console.error("Failed to get milestones:", error);
    return NextResponse.json(
      { message: "Failed to get milestones" },
      { status: 500 }
    );
  }
}

// POST /api/admin/milestones
export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireAdmin();
    if (adminAuth instanceof NextResponse) return adminAuth;

    const body = await req.json();
    const validatedData = createMilestoneSchema.parse(body);

    const newMilestone = await storage.addMilestone({
      ...validatedData,
      createdAt: new Date(),
    });

    return NextResponse.json(newMilestone, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to create milestone:", error);
    return NextResponse.json(
      { message: "Failed to create milestone" },
      { status: 500 }
    );
  }
}
