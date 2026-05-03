import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Clock, Users, DoorOpen, ClipboardList, UserPlus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { enrollStudent, unenrollStudent } from "../actions";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const enrollmentColor = { ACTIVE: "success", WAITLIST: "warning", DROPPED: "secondary", COMPLETED: "default" } as const;

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enroll?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const cls = await db.class.findUnique({
    where: { id },
    include: {
      subject: true,
      teacher: { include: { user: { select: { name: true, email: true } } } },
      branch: { select: { name: true } },
      enrollments: {
        include: { student: { include: { user: { select: { name: true, phone: true } } } } },
        orderBy: [{ status: "asc" }, { enrolledDate: "asc" }],
      },
    },
  });

  if (!cls) notFound();

  const canManage = ["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role);
  const activeEnrollments = cls.enrollments.filter(e => e.status === "ACTIVE");
  const waitlisted = cls.enrollments.filter(e => e.status === "WAITLIST");

  // Students available to enroll (not already active in this class)
  let enrollableStudents: Array<{ id: string; user: { name: string } }> = [];
  if (canManage && sp.enroll === "1") {
    const enrolled = cls.enrollments.filter(e => e.status !== "DROPPED").map(e => e.studentId);
    enrollableStudents = await db.student.findMany({
      where: {
        branchId: cls.branchId,
        status: "ACTIVE",
        id: { notIn: enrolled },
      },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/classes"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-700" /> {cls.name}
          </h1>
          <p className="text-sm text-gray-500">{cls.branch.name} · {cls.subject.name} ({cls.subject.syllabusType})</p>
        </div>
        <Badge variant={cls.isActive ? "success" : "secondary"}>{cls.isActive ? "Active" : "Inactive"}</Badge>
        {canManage && (
          <Link href={`/classes/${id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
        )}
      </div>

      {/* Info cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" /> Schedule</p>
          <p className="font-semibold mt-1">{DAY[cls.dayOfWeek ?? 0]}</p>
          <p className="text-sm text-blue-600">{cls.timeStart} – {cls.timeEnd}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-500 flex items-center gap-1"><Users className="h-3 w-3" /> Capacity</p>
          <p className="font-bold text-2xl mt-1 text-blue-700">{activeEnrollments.length}/{cls.capacity}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-500 flex items-center gap-1"><DoorOpen className="h-3 w-3" /> Room</p>
          <p className="font-semibold mt-1">{cls.room ?? "—"}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-gray-500">Monthly Fee</p>
          <p className="font-bold text-xl mt-1 text-green-600">{formatCurrency(cls.feeAmount)}</p>
        </div>
      </div>

      {/* Teacher */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Teacher</p>
        <p className="font-semibold text-gray-900">{cls.teacher.user.name}</p>
        <p className="text-sm text-gray-500">{cls.teacher.user.email}</p>
        <p className="text-xs text-gray-400 mt-1">{cls.teacher.qualification}</p>
      </div>

      {/* Attendance shortcut */}
      <div className="flex gap-3">
        <Link href={`/attendance/mark/${id}`}>
          <Button className="gap-2"><ClipboardList className="h-4 w-4" /> Mark Attendance</Button>
        </Link>
        <Link href={`/attendance/qr/${id}`}>
          <Button variant="outline" className="gap-2">QR Code</Button>
        </Link>
      </div>

      {/* Enrollment add panel */}
      {canManage && sp.enroll === "1" && enrollableStudents.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 space-y-3">
          <h3 className="font-semibold text-blue-900">Enroll Students</h3>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {enrollableStudents.map(s => (
              <form key={s.id} action={enrollStudent.bind(null, id, s.id)} className="flex items-center justify-between gap-3 bg-white rounded-md px-3 py-2 border border-blue-100">
                <span className="text-sm font-medium">{s.user.name}</span>
                <Button type="submit" size="sm" className="shrink-0">Enroll</Button>
              </form>
            ))}
          </div>
          <Link href={`/classes/${id}`}>
            <Button variant="outline" size="sm">Done</Button>
          </Link>
        </div>
      )}

      {/* Enrolled students */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Enrolled Students ({activeEnrollments.length})</h2>
          {canManage && (
            <Link href={`/classes/${id}?enroll=1`}>
              <Button size="sm" variant="outline" className="gap-1">
                <UserPlus className="h-4 w-4" /> Add Students
              </Button>
            </Link>
          )}
        </div>
        {cls.enrollments.filter(e => e.status !== "DROPPED").length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">No students enrolled yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Student</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Contact</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Enrolled</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                  {canManage && <th className="px-4 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cls.enrollments
                  .filter(e => e.status !== "DROPPED")
                  .map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{e.student.user.name}</td>
                      <td className="px-4 py-3 text-gray-500">{e.student.user.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(e.enrolledDate).toLocaleDateString("en-MY")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={enrollmentColor[e.status]}>{e.status}</Badge>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <form action={unenrollStudent.bind(null, e.id, id)}>
                            <Button type="submit" variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              Drop
                            </Button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Waitlist */}
      {waitlisted.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h3 className="font-semibold text-amber-800 mb-3">Waitlist ({waitlisted.length})</h3>
          <div className="space-y-2">
            {waitlisted.map((e, idx) => (
              <div key={e.id} className="flex items-center gap-3 bg-white rounded-md px-3 py-2 border border-amber-100">
                <span className="text-xs text-amber-600 font-bold w-5">#{idx + 1}</span>
                <span className="text-sm font-medium flex-1">{e.student.user.name}</span>
                {canManage && (
                  <form action={unenrollStudent.bind(null, e.id, id)}>
                    <Button type="submit" variant="ghost" size="sm" className="text-red-600">Remove</Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
