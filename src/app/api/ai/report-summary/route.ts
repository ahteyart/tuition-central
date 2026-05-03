import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateBranchSummary } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await req.json();
  const summary = await generateBranchSummary(stats);
  return NextResponse.json({ summary });
}
