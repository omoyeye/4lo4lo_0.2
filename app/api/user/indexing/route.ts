import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  isIndexingEnabled,
  isUserIndexable,
  setUserIndexable,
} from "@/lib/profile-visibility";

/*
 * Search engine visibility, on its own endpoint.
 *
 * is_indexable is not in the Drizzle users schema, on purpose: Drizzle expands
 * select().from(users) into an explicit column list, so declaring a column
 * that the live database may not have yet would break every query against the
 * users table, sign in included. It is therefore read and written by raw SQL,
 * and kept off the main profile PATCH so that a failure here can never take
 * the rest of a profile save down with it.
 *
 * `enabled: false` means scripts/sql/007-profile-indexing.sql has not been run
 * yet. The UI uses that to explain why the control is unavailable rather than
 * silently accepting a change it cannot persist.
 */

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);
  const [enabled, indexable] = await Promise.all([
    isIndexingEnabled(),
    isUserIndexable(userId),
  ]);

  return NextResponse.json({ enabled, indexable });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let indexable: unknown;
  try {
    ({ indexable } = await req.json());
  } catch {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  if (typeof indexable !== "boolean") {
    return NextResponse.json(
      { message: "`indexable` must be true or false" },
      { status: 400 }
    );
  }

  // Only ever your own row. The id comes from the session, never the body.
  const userId = parseInt(session.user.id, 10);
  const ok = await setUserIndexable(userId, indexable);

  if (!ok) {
    return NextResponse.json(
      {
        message:
          "Search engine visibility is not available yet. The database migration that adds it has not been run.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ enabled: true, indexable });
}
