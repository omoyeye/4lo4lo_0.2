import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/core/storage";
import { z } from "zod";

// POST /api/tools/qr-lead
export async function POST(req: NextRequest) {
  try {
    const { email, originalUrl } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { message: "Valid email required" },
        { status: 400 }
      );
    }
    if (!originalUrl || typeof originalUrl !== "string") {
      return NextResponse.json(
        { message: "originalUrl is required" },
        { status: 400 }
      );
    }

    await storage.createQrEmailLead(
      email.toLowerCase().trim(),
      originalUrl.trim()
    );

    // TODO: Send an email to the user with a confirmation message

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save email lead:", error);
    return NextResponse.json(
      { message: "Failed to save email lead" },
      { status: 500 }
    );
  }
}
