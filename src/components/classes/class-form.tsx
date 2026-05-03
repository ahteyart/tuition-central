"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Branch { id: string; name: string }
interface Subject { id: string; name: string; syllabusType: string }
interface Teacher { id: string; user: { name: string } }

interface ClassFormProps {
  branches: Branch[];
  subjects: Subject[];
  teachers: Teacher[];
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    name?: string;
    branchId?: string;
    subjectId?: string;
    teacherId?: string;
    room?: string | null;
    capacity?: number;
    dayOfWeek?: number | null;
    timeStart?: string | null;
    timeEnd?: string | null;
    feeAmount?: number;
  };
}

export function ClassForm({ branches, subjects, teachers, action, defaultValues }: ClassFormProps) {
  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Class Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Class Name *</Label>
            <Input id="name" name="name" defaultValue={defaultValues?.name} placeholder="e.g. Add Maths Form 5 (Batch A)" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="branchId">Branch *</Label>
              <select id="branchId" name="branchId" defaultValue={defaultValues?.branchId ?? ""} required
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                <option value="">Select branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subjectId">Subject *</Label>
              <select id="subjectId" name="subjectId" defaultValue={defaultValues?.subjectId ?? ""} required
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.syllabusType})</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="teacherId">Teacher *</Label>
            <select id="teacherId" name="teacherId" defaultValue={defaultValues?.teacherId ?? ""} required
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
              <option value="">Select teacher</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.user.name}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule & Room</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dayOfWeek">Day *</Label>
              <select id="dayOfWeek" name="dayOfWeek" defaultValue={defaultValues?.dayOfWeek ?? 1} required
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timeStart">Start Time *</Label>
              <Input id="timeStart" name="timeStart" type="time" defaultValue={defaultValues?.timeStart ?? "09:00"} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="timeEnd">End Time *</Label>
              <Input id="timeEnd" name="timeEnd" type="time" defaultValue={defaultValues?.timeEnd ?? "11:00"} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="room">Room</Label>
              <Input id="room" name="room" defaultValue={defaultValues?.room ?? ""} placeholder="e.g. A1" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity *</Label>
              <Input id="capacity" name="capacity" type="number" min={1} max={100} defaultValue={defaultValues?.capacity ?? 30} required />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="feeAmount">Monthly Fee (RM) *</Label>
            <Input id="feeAmount" name="feeAmount" type="number" min={0} step={0.01} defaultValue={defaultValues?.feeAmount ?? 0} required />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href="/classes" className="flex-1">
          <Button variant="outline" className="w-full">Cancel</Button>
        </Link>
        <Button type="submit" className="flex-1">Save Class</Button>
      </div>
    </form>
  );
}
