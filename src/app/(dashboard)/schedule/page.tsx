import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DoorOpen } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am–8pm

function timeToDecimal(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

type ClassWithDetails = {
  id: string;
  name: string;
  room: string | null;
  dayOfWeek: number | null;
  timeStart: string | null;
  timeEnd: string | null;
  feeAmount: number;
  subject: { name: string };
  teacher: { user: { name: string } };
  branch: { name: string };
  _count: { enrollments: number };
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; branchId?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const viewMode = sp.view ?? "week";

  let branchFilter: string | undefined;
  let classes: ClassWithDetails[] = [];

  if (session.user.role === "STUDENT") {
    const student = await db.student.findUnique({ where: { userId: session.user.id } });
    if (student) {
      const enrollments = await db.enrollment.findMany({
        where: { studentId: student.id, status: "ACTIVE" },
        include: {
          class: {
            include: {
              subject: { select: { name: true } },
              teacher: { include: { user: { select: { name: true } } } },
              branch: { select: { name: true } },
              _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
            },
          },
        },
      });
      classes = enrollments.map(e => e.class);
    }
  } else if (session.user.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } });
    if (teacher) {
      classes = await db.class.findMany({
        where: { teacherId: teacher.id, isActive: true },
        include: {
          subject: { select: { name: true } },
          teacher: { include: { user: { select: { name: true } } } },
          branch: { select: { name: true } },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
      });
    }
  } else if (session.user.role === "PARENT") {
    const parent = await db.parent.findUnique({
      where: { userId: session.user.id },
      include: { children: { select: { id: true } } },
    });
    if (parent) {
      const enrollments = await db.enrollment.findMany({
        where: { studentId: { in: parent.children.map(c => c.id) }, status: "ACTIVE" },
        include: {
          class: {
            include: {
              subject: { select: { name: true } },
              teacher: { include: { user: { select: { name: true } } } },
              branch: { select: { name: true } },
              _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
            },
          },
        },
      });
      classes = enrollments.map(e => e.class);
    }
  } else {
    // Admin/super-admin: show all or filtered by branch
    if (session.user.role === "CENTRE_ADMIN") {
      const ba = await db.branchAdmin.findFirst({ where: { userId: session.user.id } });
      branchFilter = ba?.branchId;
    } else {
      branchFilter = sp.branchId;
    }
    classes = await db.class.findMany({
      where: {
        isActive: true,
        ...(branchFilter ? { branchId: branchFilter } : {}),
      },
      include: {
        subject: { select: { name: true } },
        teacher: { include: { user: { select: { name: true } } } },
        branch: { select: { name: true } },
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
    });
  }

  // Group by day
  const byDay: Record<number, ClassWithDetails[]> = {};
  for (const cls of classes) {
    if (cls.dayOfWeek == null) continue;
    if (!byDay[cls.dayOfWeek]) byDay[cls.dayOfWeek] = [];
    byDay[cls.dayOfWeek].push(cls);
  }

  const activeDays = Object.keys(byDay)
    .map(Number)
    .sort((a, b) => a - b);

  const today = new Date().getDay();

  // Palette for class blocks
  const palette = [
    "bg-blue-100 border-blue-300 text-blue-800",
    "bg-purple-100 border-purple-300 text-purple-800",
    "bg-green-100 border-green-300 text-green-800",
    "bg-amber-100 border-amber-300 text-amber-800",
    "bg-pink-100 border-pink-300 text-pink-800",
    "bg-cyan-100 border-cyan-300 text-cyan-800",
  ];
  const classColors: Record<string, string> = {};
  classes.forEach((c, i) => {
    classColors[c.id] = palette[i % palette.length];
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-700" /> Schedule
          </h1>
          <p className="text-sm text-gray-500 mt-1">Weekly timetable view</p>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No classes scheduled</p>
        </div>
      ) : (
        <>
          {/* List view: day-by-day */}
          <div className="space-y-4">
            {activeDays.map(day => (
              <div key={day} className={`bg-white rounded-lg border shadow-sm overflow-hidden ${day === today ? "border-blue-400" : "border-gray-200"}`}>
                <div className={`px-5 py-3 flex items-center gap-3 ${day === today ? "bg-blue-700 text-white" : "bg-gray-50 text-gray-700"}`}>
                  <span className="font-semibold">{DAYS[day]}</span>
                  {day === today && <Badge className="bg-white text-blue-700 text-xs">Today</Badge>}
                  <span className={`text-sm ml-auto ${day === today ? "text-blue-200" : "text-gray-400"}`}>
                    {byDay[day].length} class{byDay[day].length !== 1 ? "es" : ""}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {byDay[day]
                    .sort((a, b) => (a.timeStart ?? "").localeCompare(b.timeStart ?? ""))
                    .map(cls => (
                      <Link key={cls.id} href={`/classes/${cls.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="w-24 text-center shrink-0">
                          <p className="text-sm font-semibold text-blue-700">{cls.timeStart}</p>
                          <p className="text-xs text-gray-400">– {cls.timeEnd}</p>
                        </div>
                        <div className={`w-1.5 self-stretch rounded-full ${classColors[cls.id].split(" ")[0]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{cls.name}</p>
                          <p className="text-sm text-gray-500">{cls.subject.name}</p>
                          <p className="text-xs text-gray-400">{cls.teacher.user.name}</p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          {cls.room && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
                              <DoorOpen className="h-3 w-3" /> {cls.room}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            {cls._count.enrollments} students
                          </p>
                          <p className="text-xs text-gray-400">{cls.branch.name}</p>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-700">{classes.length}</p>
                <p className="text-xs text-blue-500">Total Classes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">{activeDays.length}</p>
                <p className="text-xs text-blue-500">Teaching Days</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700">
                  {classes.reduce((a, c) => a + c._count.enrollments, 0)}
                </p>
                <p className="text-xs text-blue-500">Total Students</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
