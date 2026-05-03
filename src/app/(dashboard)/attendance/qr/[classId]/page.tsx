import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft, QrCode } from "lucide-react";
import Link from "next/link";
import { QrDisplay } from "./qr-display";

export default async function QrAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role)) {
    redirect("/attendance");
  }

  const { classId } = await params;
  const sp = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const date = sp.date ?? today;

  const cls = await db.class.findUnique({
    where: { id: classId },
    include: { subject: { select: { name: true } }, branch: { select: { name: true } } },
  });

  if (!cls) notFound();

  // The QR encodes a URL that a student would open to self-check-in
  // (In production this would be a separate student-facing page)
  const checkInUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/checkin/${classId}?date=${date}`;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/attendance?classId=${classId}&date=${date}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <QrCode className="h-6 w-6 text-blue-700" /> QR Check-in
          </h1>
          <p className="text-sm text-gray-500">{cls.name}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center space-y-4">
        <div className="space-y-1">
          <p className="text-lg font-bold text-gray-900">{cls.name}</p>
          <p className="text-sm text-blue-600">{cls.subject.name}</p>
          <p className="text-xs text-gray-400">{cls.branch.name} · {date}</p>
        </div>

        <QrDisplay url={checkInUrl} />

        <div className="text-xs text-gray-400 space-y-1">
          <p>Students scan this QR to mark themselves present</p>
          <p className="font-mono bg-gray-50 rounded p-2 text-xs break-all">{checkInUrl}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <form>
          <input type="hidden" name="classId" value={classId} />
          <input type="date" name="date" defaultValue={date}
            className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          <Button type="submit" variant="outline" size="sm" className="ml-2">Change Date</Button>
        </form>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">Instructions</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Display this QR on the projector or print it</li>
          <li>Students scan with their phone camera</li>
          <li>They will be marked Present automatically</li>
          <li>Manually adjust Late/Absent in the attendance sheet</li>
        </ol>
      </div>
    </div>
  );
}
