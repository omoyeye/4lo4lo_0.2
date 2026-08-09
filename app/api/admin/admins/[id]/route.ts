import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/auth-helpers";
import { storage } from "@/lib/core/storage";
import { hashPassword } from "@/auth";
import { z } from "zod";

const updateAdminSchema = z.object({
  username: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["admin", "superadmin"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

// PATCH /api/admin/admins/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const adminId = parseInt(id, 10);
    if (isNaN(adminId)) {
      return NextResponse.json({ message: "Invalid admin ID" }, { status: 400 });
    }

    const body = await req.json();
    const data = updateAdminSchema.parse(body);

    // Hash before it ever reaches the database.
    const updates: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.password) {
      updates.password = await hashPassword(data.password);
    }

    const updated = await storage.updateAdmin(adminId, updates as any);
    if (!updated) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    const { password, ...safe } = updated;
    return NextResponse.json(safe, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to update admin:", error);
    return NextResponse.json(
      { message: "Failed to update admin" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/admins/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperadmin();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const adminId = parseInt(id, 10);
    if (isNaN(adminId)) {
      return NextResponse.json({ message: "Invalid admin ID" }, { status: 400 });
    }

    // Guard against an operator removing their own access and locking
    // everyone out of the panel.
    if (adminId === auth.id) {
      return NextResponse.json(
        { message: "You cannot delete your own admin account" },
        { status: 400 }
      );
    }

    const remaining = await storage.getAllAdmins();
    const superadmins = remaining.filter((a) => a.role === "superadmin");
    const target = remaining.find((a) => a.id === adminId);

    if (!target) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }
    if (target.role === "superadmin" && superadmins.length <= 1) {
      return NextResponse.json(
        { message: "Cannot delete the last superadmin" },
        { status: 400 }
      );
    }

    await storage.deleteAdmin(adminId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete admin:", error);
    return NextResponse.json(
      { message: "Failed to delete admin" },
      { status: 500 }
    );
  }
}
