import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Users, BookOpen, Calendar, Mail, Phone,
  GraduationCap, Edit, CheckCircle, XCircle, Clock, Banknote,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toggleTeacherStatus, requestLeave, reviewLeave } from "../actions";

const leaveVariant = { PENDING: "warning", APPROVED: "success", REJECTED: "danger" } as const;

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (["STUDENT", "PARENT"].includes(session.user.role)) redirect("/dashboard/student");

  const { id } = await params;

  const teacher = await db.teacher.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true, image: true } },
      branch: { select: { name: true } },
      subjects: { include: { subject: { select: { name: true, syllabusType: true } } } },
      classes: {
        where: { isActive: true },
        include: {
          subject: { select: { name: true } },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
      },
      leaveRequests: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!teacher) notFound();

  const canManage = ["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role);
  const isOwnProfile = session.user.role === "TEACHER" &&
    (await db.teacher.findUnique({ where: { userId: session.user.id } }))?.id === id;

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const toggleActive = toggleTeacherStatus.bind(null, id, !teacher.isActive);
  const requestLeaveForTeacher = requestLeave.bind(null, id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/teachers">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-700" /> {teacher.user.name}
        </h1>
      </div>

      {/* Profile card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant={teacher.isActive ? "success" : "secondary"}>
                {teacher.isActive ? "Active" : "Inactive"}
              </Badge>
              <span className="text-sm text-gray-500">{teacher.branch.name}</span>
            </div>
            {teacher.user.email && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-3.5 w-3.5 text-gray-400" /> {teacher.user.email}
              </p>
            )}
            {teacher.user.phone && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-3.5 w-3.5 text-gray-400" /> {teacher.user.phone}
              </p>
            )}
            {teacher.qualification && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <GraduationCap className="h-3.5 w-3.5 text-gray-400" /> {teacher.qualification}
              </p>
            )}
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <Banknote className="h-3.5 w-3.5 text-gray-400" />
              {formatCurrency(teacher.salaryRate)} / {teacher.salaryType.toLowerCase().replace("_", " ")}
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Link href={`/teachers/${id}/edit`}>
                <Button variant="outline" size="sm" className="gap-2"><Edit className="h-4 w-4" /> Edit</Button>
              </Link>
              <form action={toggleActive}>
                <Button type="submit" variant="outline" size="sm">
                  {teacher.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </form>
            </div>
          )}
        </div>

        {teacher.bio && (
          <p className="mt-4 text-sm text-gray-600 border-t border-gray-100 pt-4">{teacher.bio}</p>
        )}

        {teacher.subjects.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subjects</p>
            <div className="flex flex-wrap gap-2">
              {teacher.subjects.map(ts => (
                <span key={ts.id} className="inline-flex items-center gap-1.5 text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                  <BookOpen className="h-3.5 w-3.5" />
                  {ts.subject.name}
                  <span className="text-xs text-blue-400">{ts.subject.syllabusType}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Classes */}
      {teacher.classes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" /> Active Classes
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {teacher.classes.map(cls => (
              <Link key={cls.id} href={`/classes/${cls.id}`}>
                <div className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{cls.name}</p>
                    <p className="text-xs text-gray-500">
                      {cls.subject.name}
                      {cls.dayOfWeek != null && ` · ${days[cls.dayOfWeek]}`}
                      {cls.timeStart && ` ${cls.timeStart}–${cls.timeEnd}`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{cls._count.enrollments} students</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Leave requests */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Leave Requests</h2>
        </div>

        {(canManage || isOwnProfile) && (
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-3">Submit Leave Request</p>
            <form action={requestLeaveForTeacher} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">From</label>
                  <input type="date" name="dateFrom" required
                    className="w-full h-8 rounded-md border border-gray-300 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">To</label>
                  <input type="date" name="dateTo" required
                    className="w-full h-8 rounded-md border border-gray-300 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
              </div>
              <input type="text" name="reason" required placeholder="Reason…"
                className="w-full h-8 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
              <Button type="submit" size="sm" variant="outline">Submit Request</Button>
            </form>
          </div>
        )}

        {teacher.leaveRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No leave requests.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {teacher.leaveRequests.map(lr => {
              const approveAction = reviewLeave.bind(null, lr.id, "APPROVED");
              const rejectAction = reviewLeave.bind(null, lr.id, "REJECTED");
              return (
                <div key={lr.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900">{lr.reason}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(lr.dateFrom)} → {formatDate(lr.dateTo)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={leaveVariant[lr.status]}>
                      <span className="flex items-center gap-1">
                        {lr.status === "PENDING" && <Clock className="h-3 w-3" />}
                        {lr.status === "APPROVED" && <CheckCircle className="h-3 w-3" />}
                        {lr.status === "REJECTED" && <XCircle className="h-3 w-3" />}
                        {lr.status}
                      </span>
                    </Badge>
                    {canManage && lr.status === "PENDING" && (
                      <>
                        <form action={approveAction}>
                          <Button type="submit" size="sm" variant="outline" className="text-green-700 border-green-200 hover:bg-green-50 h-7 text-xs">Approve</Button>
                        </form>
                        <form action={rejectAction}>
                          <Button type="submit" size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50 h-7 text-xs">Reject</Button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
