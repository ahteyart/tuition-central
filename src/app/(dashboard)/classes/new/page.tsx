import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ClassForm } from "@/components/classes/class-form";
import { createClass } from "../actions";

export default async function NewClassPage() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role)) redirect("/classes");

  const [branches, subjects, teachers] = await Promise.all([
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.subject.findMany({ orderBy: { name: "asc" } }),
    db.teacher.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/classes"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-700" /> New Class
          </h1>
          <p className="text-sm text-gray-500">Create a new class and assign teacher</p>
        </div>
      </div>
      <ClassForm branches={branches} subjects={subjects} teachers={teachers} action={createClass} />
    </div>
  );
}
