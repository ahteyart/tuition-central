import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { createTeacher } from "../actions";

export default async function NewTeacherPage() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role)) {
    redirect("/teachers");
  }

  let branchFilter: string | undefined;
  if (session.user.role === "CENTRE_ADMIN") {
    const ba = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
    branchFilter = ba?.branchId;
  }

  const [branches, subjects] = await Promise.all([
    db.branch.findMany({
      where: { isActive: true, ...(branchFilter ? { id: branchFilter } : {}) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.subject.findMany({ select: { id: true, name: true, syllabusType: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/teachers">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-700" /> Add Teacher
          </h1>
        </div>
      </div>

      <form action={createTeacher} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Full Name *</label>
            <input name="name" required className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Email *</label>
            <input name="email" type="email" required className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <input name="phone" type="tel" placeholder="+601X-XXXXXXX" className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Branch *</label>
            <select name="branchId" required className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
              <option value="">Select branch…</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Qualification</label>
            <input name="qualification" placeholder="e.g. B.Ed Mathematics" className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Salary Type</label>
            <select name="salaryType" className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
              <option value="MONTHLY">Monthly</option>
              <option value="PER_CLASS">Per Class</option>
              <option value="PER_HOUR">Per Hour</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Rate (RM)</label>
            <input name="salaryRate" type="number" step="0.01" min="0" defaultValue="0" className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Bio</label>
            <textarea name="bio" rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
        </div>

        {subjects.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Subjects</label>
            <div className="grid grid-cols-2 gap-2">
              {subjects.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="subjectIds" value={s.id} className="rounded border-gray-300 text-blue-600" />
                  <span className="text-gray-700">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.syllabusType}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-600">
          Default password: <span className="font-mono font-semibold">Teacher@123</span> — teacher should change on first login.
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/teachers" className="flex-1">
            <Button variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1">Create Teacher</Button>
        </div>
      </form>
    </div>
  );
}
