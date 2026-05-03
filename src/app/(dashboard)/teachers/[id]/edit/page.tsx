import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { updateTeacher } from "../../actions";

export default async function EditTeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role)) {
    redirect("/teachers");
  }

  const { id } = await params;

  const [teacher, subjects] = await Promise.all([
    db.teacher.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        subjects: { select: { subjectId: true } },
      },
    }),
    db.subject.findMany({ select: { id: true, name: true, syllabusType: true }, orderBy: { name: "asc" } }),
  ]);

  if (!teacher) notFound();

  const assignedSubjectIds = new Set(teacher.subjects.map(ts => ts.subjectId));
  const updateAction = updateTeacher.bind(null, id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/teachers/${id}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-700" /> Edit Teacher
          </h1>
          <p className="text-sm text-gray-500">{teacher.user.name}</p>
        </div>
      </div>

      <form action={updateAction} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Full Name *</label>
            <input name="name" required defaultValue={teacher.user.name}
              className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input value={teacher.user.email ?? ""} readOnly
              className="w-full h-9 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400" />
            <p className="text-xs text-gray-400">Email cannot be changed after creation.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <input name="phone" type="tel" defaultValue={teacher.user.phone ?? ""}
              className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Qualification</label>
            <input name="qualification" defaultValue={teacher.qualification ?? ""}
              className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Salary Type</label>
            <select name="salaryType" defaultValue={teacher.salaryType}
              className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
              <option value="MONTHLY">Monthly</option>
              <option value="PER_CLASS">Per Class</option>
              <option value="PER_HOUR">Per Hour</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Rate (RM)</label>
            <input name="salaryRate" type="number" step="0.01" min="0" defaultValue={teacher.salaryRate}
              className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Bio</label>
            <textarea name="bio" rows={3} defaultValue={teacher.bio ?? ""}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
          </div>
        </div>

        {subjects.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Subjects</label>
            <div className="grid grid-cols-2 gap-2">
              {subjects.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="subjectIds"
                    value={s.id}
                    defaultChecked={assignedSubjectIds.has(s.id)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-gray-700">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.syllabusType}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link href={`/teachers/${id}`} className="flex-1">
            <Button variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1">Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
