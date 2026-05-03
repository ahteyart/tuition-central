import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, MapPin, Phone, Mail, Users, BookOpen } from "lucide-react";
import { toggleBranchStatus } from "./actions";
import { formatDate } from "@/lib/utils";

export default async function BranchesPage() {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const branches = await db.branch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true, teachers: true, classes: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-700" />
            Branches
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all tuition centre branches
          </p>
        </div>
        <Link href="/branches/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Branches</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{branches.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {branches.filter((b) => b.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Inactive</p>
          <p className="text-3xl font-bold text-gray-400 mt-1">
            {branches.filter((b) => !b.isActive).length}
          </p>
        </div>
      </div>

      {/* Branches grid */}
      {branches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No branches yet</p>
          <p className="text-sm mt-1">Create your first branch to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-gray-900">{branch.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Since {formatDate(branch.createdAt)}
                  </p>
                </div>
                <Badge variant={branch.isActive ? "success" : "secondary"}>
                  {branch.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-gray-400" />
                  <span>{branch.address}</span>
                </div>
                {branch.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                {branch.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                    <span>{branch.email}</span>
                  </div>
                )}
              </div>

              {/* Counts */}
              <div className="flex gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {branch._count.students} students
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {branch._count.teachers} teachers
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {branch._count.classes} classes
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Link href={`/branches/${branch.id}/edit`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    Edit
                  </Button>
                </Link>
                <form
                  action={toggleBranchStatus.bind(null, branch.id, branch.isActive)}
                  className="flex-1"
                >
                  <Button
                    type="submit"
                    variant={branch.isActive ? "secondary" : "default"}
                    size="sm"
                    className="w-full"
                  >
                    {branch.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
