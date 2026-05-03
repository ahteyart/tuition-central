import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, BookOpen, GraduationCap } from "lucide-react";

export default async function TeachersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  if (["STUDENT", "PARENT"].includes(session.user.role)) redirect("/dashboard/student");

  let branchFilter: string | undefined;
  if (session.user.role === "CENTRE_ADMIN") {
    const ba = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
    branchFilter = ba?.branchId;
  }
  if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } });
    branchFilter = teacher?.branchId;
  }

  const teachers = await db.teacher.findMany({
    where: branchFilter ? { branchId: branchFilter } : {},
    include: {
      user: { select: { name: true, email: true, phone: true } },
      branch: { select: { name: true } },
      subjects: { include: { subject: { select: { name: true } } } },
      classes: { where: { isActive: true }, select: { id: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const canManage = ["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-700" /> Teachers
          </h1>
          <p className="text-sm text-gray-500 mt-1">{teachers.length} teacher{teachers.length !== 1 ? "s" : ""}</p>
        </div>
        {canManage && (
          <Link href="/teachers/new">
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Teacher</Button>
          </Link>
        )}
      </div>

      {teachers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No teachers found.</p>
          {canManage && (
            <Link href="/teachers/new">
              <Button className="mt-4 gap-2"><Plus className="h-4 w-4" /> Add First Teacher</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map(t => (
            <Link key={t.id} href={`/teachers/${t.id}`}>
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{t.user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{t.user.email}</p>
                    {!branchFilter && <p className="text-xs text-blue-600 mt-0.5">{t.branch.name}</p>}
                  </div>
                  <Badge variant={t.isActive ? "success" : "secondary"} className="flex-shrink-0">
                    {t.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {t.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {t.subjects.slice(0, 3).map(ts => (
                      <span key={ts.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        <BookOpen className="h-2.5 w-2.5" />
                        {ts.subject.name}
                      </span>
                    ))}
                    {t.subjects.length > 3 && (
                      <span className="text-xs text-gray-400">+{t.subjects.length - 3} more</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-400 border-t border-gray-100 pt-2">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {t.classes.length} class{t.classes.length !== 1 ? "es" : ""}
                  </span>
                  {t.qualification && <span className="truncate">· {t.qualification}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
