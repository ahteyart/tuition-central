import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chatWithTutor } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subject, level, history, question } = await req.json();

  if (!question?.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  try {
    const response = await chatWithTutor(
      subject ?? "General",
      level ?? "SPM",
      history ?? [],
      question
    );
    return NextResponse.json({ response });
  } catch (err) {
    console.error("[AI chat error]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
