import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, User, Users } from "lucide-react";
import Link from "next/link";
import { createStudent } from "../actions";

const formLevels = [
  "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
  "Form 1", "Form 2", "Form 3", "Form 4", "Form 5",
  "Lower 6", "Upper 6",
  "IGCSE Year 1", "IGCSE Year 2",
];

export default async function NewStudentPage() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "CENTRE_ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  // Get branches for the dropdown
  const branches = await db.branch.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  // For centre admin, only show their branch
  let availableBranches = branches;
  if (session.user.role === "CENTRE_ADMIN") {
    const admin = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
    if (admin) availableBranches = branches.filter((b) => b.id === admin.branchId);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/students">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-blue-700" />
            Add Student
          </h1>
          <p className="text-sm text-gray-500">Register a new student with parent details</p>
        </div>
      </div>

      <form action={createStudent} className="space-y-6">
        {/* Student Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-blue-700" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="studentName">Full Name *</Label>
                <Input id="studentName" name="studentName" placeholder="Ahmad bin Abdullah" required />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="icNumber">IC Number</Label>
                <Input id="icNumber" name="icNumber" placeholder="030101-14-5678" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studentEmail">Email</Label>
                <Input id="studentEmail" name="studentEmail" type="email" placeholder="student@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studentPhone">Phone</Label>
                <Input id="studentPhone" name="studentPhone" placeholder="+6012-XXXXXXX" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="school">School</Label>
                <Input id="school" name="school" placeholder="SMK Subang Jaya" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="formLevel">Form Level</Label>
                <select
                  id="formLevel"
                  name="formLevel"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Select level</option>
                  {formLevels.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branchId">Branch *</Label>
                <select
                  id="branchId"
                  name="branchId"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                >
                  <option value="">Select branch</option>
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Enrollment Status</Label>
                <select
                  id="status"
                  name="status"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="TRIAL">Trial</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parent Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-blue-700" />
              Parent / Guardian Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="parentName">Full Name *</Label>
                <Input id="parentName" name="parentName" placeholder="Abdullah bin Ibrahim" required />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="relationship">Relationship</Label>
                <select
                  id="relationship"
                  name="relationship"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Parent">Parent</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Sibling">Sibling</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parentEmail">Email</Label>
                <Input id="parentEmail" name="parentEmail" type="email" placeholder="parent@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parentPhone">Phone (WhatsApp) *</Label>
                <Input id="parentPhone" name="parentPhone" placeholder="+6012-XXXXXXX" />
              </div>
            </div>
            <p className="text-xs text-gray-400 bg-blue-50 border border-blue-100 rounded p-2">
              If the parent email/phone already exists in the system, the student will be linked to the existing parent account.
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Link href="/students" className="flex-1">
            <Button variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1">Register Student</Button>
        </div>
      </form>
    </div>
  );
}
