import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Search, Clock, Users, DoorOpen } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const q = sp.q ?? "";

  let branchFilter: string | undefined;
  if (session.user.role === "CENTRE_ADMIN") {
    const ba = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
    branchFilter = ba?.branchId;
  } else if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } });
    branchFilter = teacher?.branchId;
  }

  const classes = await db.class.findMany({
    where: {
      ...(branchFilter ? { branchId: branchFilter } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { subject: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      subject: { select: { name: true, syllabusType: true } },
      teacher: { include: { user: { select: { name: true } } } },
      branch: { select: { name: true } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { timeStart: "asc" }],
  });

  const canManage = ["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-700" /> Classes
          </h1>
          <p className="text-sm text-gray-500 mt-1">{classes.length} classes</p>
        </div>
        {canManage && (
          <Link href="/classes/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Class
            </Button>
          </Link>
        )}
      </div>

      <form className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by class or subject..."
            className="w-full pl-9 pr-3 h-10 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>

      {classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No classes found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const utilisation = Math.round(
              (cls._count.enrollments / cls.capacity) * 100
            );
            return (
              <div
                key={cls.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-900 leading-tight">
                      {cls.name}
                    </h2>
                    <p className="text-sm text-blue-600 font-medium">
                      {cls.subject.name}
                    </p>
                    <p className="text-xs text-gray-400">{cls.branch.name}</p>
                  </div>
                  <Badge variant={cls.isActive ? "success" : "secondary"}>
                    {cls.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                    {DAY[cls.dayOfWeek ?? 0]} · {cls.timeStart}–{cls.timeEnd}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400 shrink-0" />
                    {cls._count.enrollments}/{cls.capacity} students
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        utilisation >= 90
                          ? "bg-red-100 text-red-700"
                          : utilisation >= 70
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {utilisation}%
                    </span>
                  </div>
                  {cls.room && (
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-gray-400 shrink-0" />
                      Room {cls.room}
                    </div>
                  )}
                </div>

                <div className="text-sm">
                  <span className="text-gray-500">Teacher: </span>
                  <span className="font-medium">{cls.teacher.user.name}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <span className="text-sm font-semibold text-blue-700">
                    {formatCurrency(cls.feeAmount)}/mo
                  </span>
                  <div className="flex gap-2">
                    <Link href={`/classes/${cls.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                    {canManage && (
                      <Link href={`/classes/${cls.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                    )}
                  </div>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      utilisation >= 90
                        ? "bg-red-500"
                        : utilisation >= 70
                        ? "bg-amber-400"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(utilisation, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
