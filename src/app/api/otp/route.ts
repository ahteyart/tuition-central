import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  const { phone, action } = await req.json();

  if (!phone) {
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  }

  if (action === "send") {
    // Invalidate previous OTPs
    await db.otpCode.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });

    const code = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await db.otpCode.create({ data: { phone, code, expires } });

    // In production: send via WhatsApp/SMS. Dev: return in response.
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json({
      success: true,
      ...(isDev ? { code } : {}),
    });
  }

  if (action === "verify") {
    const { code } = await req.json();
    const otp = await db.otpCode.findFirst({
      where: {
        phone,
        code,
        used: false,
        expires: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    await db.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    // Find or create user
    let user = await db.user.findUnique({ where: { phone } });
    if (!user) {
      user = await db.user.create({
        data: { name: "New User", phone, role: "PARENT" },
      });
    }

    return NextResponse.json({ success: true, userId: user.id });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
