import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";

const statusColor = {
  ACTIVE: "success",
  TRIAL: "warning",
  INACTIVE: "secondary",
  GRADUATED: "default",
} as const;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; branch?: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role === "STUDENT") redirect("/dashboard");

  const sp = await searchParams;
  const q = sp.q ?? "";
  const statusFilter = sp.status;

  // Branch filter for centre admin
  let branchFilter: string | undefined;
  if (session.user.role === "CENTRE_ADMIN") {
    const admin = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
    branchFilter = admin?.branchId;
  }

  const students = await db.student.findMany({
    where: {
      ...(branchFilter ? { branchId: branchFilter } : {}),
      ...(statusFilter ? { status: statusFilter as any } : {}),
      ...(q
        ? {
            OR: [
              { user: { name: { contains: q, mode: "insensitive" } } },
              { icNumber: { contains: q, mode: "insensitive" } },
              { school: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      branch: { select: { name: true } },
      parents: {
        include: { user: { select: { name: true, phone: true } } },
        take: 1,
      },
      enrollments: { where: { status: "ACTIVE" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const statuses = ["ACTIVE", "TRIAL", "INACTIVE", "GRADUATED"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-blue-700" />
            Students
          </h1>
          <p className="text-sm text-gray-500 mt-1">{students.length} students</p>
        </div>
        {["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role) && (
          <Link href="/students/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <form className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by name, IC, school..."
              className="w-full pl-9 pr-3 h-10 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {students.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">IC / School</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Branch</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Parent</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Classes</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{s.user.name}</div>
                      <div className="text-xs text-gray-400">
                        {s.user.email ?? s.user.phone ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{s.icNumber ?? "—"}</div>
                      <div className="text-xs text-gray-400">
                        {s.school} {s.formLevel ? `· ${s.formLevel}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.branch.name}</td>
                    <td className="px-4 py-3">
                      {s.parents[0] ? (
                        <div>
                          <div className="text-gray-900">{s.parents[0].user.name}</div>
                          <div className="text-xs text-gray-400">
                            {s.parents[0].user.phone ?? "—"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-blue-700">{s.enrollments.length}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColor[s.status]}>
                        {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
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
