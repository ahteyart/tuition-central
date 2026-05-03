import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Search, QrCode, Check, X, Clock } from "lucide-react";

const statusIcon = {
  PRESENT: <Check className="h-4 w-4 text-green-600" />,
  ABSENT: <X className="h-4 w-4 text-red-500" />,
  LATE: <Clock className="h-4 w-4 text-amber-500" />,
};
const statusColor = {
  PRESENT: "success",
  ABSENT: "danger",
  LATE: "warning",
} as const;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; date?: string; studentId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const dateFilter = sp.date ?? today;

  let branchFilter: string | undefined;
  if (session.user.role === "CENTRE_ADMIN") {
    const ba = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
    branchFilter = ba?.branchId;
  } else if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } });
    branchFilter = teacher?.branchId;
  }

  const attendance = await db.attendance.findMany({
    where: {
      date: new Date(dateFilter),
      ...(sp.classId ? { classId: sp.classId } : {}),
      ...(sp.studentId ? { studentId: sp.studentId } : {}),
      class: branchFilter ? { branchId: branchFilter } : undefined,
    },
    include: {
      student: { include: { user: { select: { name: true } } } },
      class: { include: { subject: { select: { name: true } } } },
    },
    orderBy: [{ class: { timeStart: "asc" } }, { student: { user: { name: "asc" } } }],
  });

  // Classes for the filter dropdown
  const classes = await db.class.findMany({
    where: { isActive: true, ...(branchFilter ? { branchId: branchFilter } : {}) },
    include: { subject: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const stats = {
    present: attendance.filter(a => a.status === "PRESENT").length,
    absent: attendance.filter(a => a.status === "ABSENT").length,
    late: attendance.filter(a => a.status === "LATE").length,
  };

  const canMark = ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-700" /> Attendance
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track class attendance records</p>
        </div>
        {canMark && sp.classId && (
          <div className="flex gap-2">
            <Link href={`/attendance/qr/${sp.classId}`}>
              <Button variant="outline" className="gap-2">
                <QrCode className="h-4 w-4" /> QR Code
              </Button>
            </Link>
            <Link href={`/attendance/mark/${sp.classId}?date=${dateFilter}`}>
              <Button className="gap-2">
                <ClipboardList className="h-4 w-4" /> Mark Attendance
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Date</label>
          <input
            type="date"
            name="date"
            defaultValue={dateFilter}
            className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Class</label>
          <select
            name="classId"
            defaultValue={sp.classId ?? ""}
            className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} – {c.subject.name}</option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
      </form>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{stats.present}</p>
          <p className="text-xs text-green-600 font-medium mt-1">Present</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
          <p className="text-xs text-red-600 font-medium mt-1">Absent</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{stats.late}</p>
          <p className="text-xs text-amber-600 font-medium mt-1">Late</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {attendance.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No attendance records for this date</p>
            {canMark && (
              <p className="text-sm mt-1">
                Select a class and{" "}
                <Link href={`/attendance/mark/${sp.classId ?? classes[0]?.id}?date=${dateFilter}`} className="text-blue-600 hover:underline">
                  mark attendance
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Class</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendance.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.student.user.name}</td>
                    <td className="px-4 py-3 text-gray-600">{a.class.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(a.date).toLocaleDateString("en-MY")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        {statusIcon[a.status]}
                        <Badge variant={statusColor[a.status]}>{a.status}</Badge>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
