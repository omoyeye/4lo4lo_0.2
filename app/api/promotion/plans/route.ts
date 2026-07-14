import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { promotionPlans, insertPromotionPlanSchema } from "@shared/schema.mysql";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
    const result = await db.select().from(promotionPlans);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching promotion plans:", error);
    return NextResponse.json(
      { message: "Failed to get promotion plans" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminAuth = await requireSuperadmin();
    if (adminAuth instanceof NextResponse) return adminAuth;
    const adminId = adminAuth.id;

    const body = await req.json();
    const planData = insertPromotionPlanSchema.parse({
      ...body,
      updatedAt: new Date(),
      updatedBy: adminId,
    });

    const insertRes = await db.insert(promotionPlans).values(planData);
    const insertId = insertRes[0].insertId;
    const [newPlan] = await db
      .select()
      .from(promotionPlans)
      .where(eq(promotionPlans.id, insertId));
      
    return NextResponse.json(newPlan, { status: 201 });
  } catch (error) {
    console.error("Error creating promotion plan:", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to create promotion plan",
      },
      { status: 500 }
    );
  }
}
