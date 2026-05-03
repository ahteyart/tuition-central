import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  const hash = await bcrypt.hash("Admin@123", 12);

  // Super admin
  const superAdminUser = await db.user.upsert({
    where: { email: "superadmin@tuitioncentral.my" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@tuitioncentral.my",
      passwordHash: hash,
      role: "SUPER_ADMIN",
    },
  });
  console.log("✅ Super admin:", superAdminUser.email);

  // Branches
  const branch1 = await db.branch.upsert({
    where: { id: "branch-pj" },
    update: {},
    create: {
      id: "branch-pj",
      name: "Tuition Central PJ",
      address: "No. 12, Jalan PJU 5/20, Kota Damansara, 47810 Petaling Jaya, Selangor",
      phone: "+603-6142 5000",
      email: "pj@tuitioncentral.my",
    },
  });

  const branch2 = await db.branch.upsert({
    where: { id: "branch-kl" },
    update: {},
    create: {
      id: "branch-kl",
      name: "Tuition Central KL",
      address: "Lot 3, Jalan Imbi, 55100 Kuala Lumpur",
      phone: "+603-2145 8888",
      email: "kl@tuitioncentral.my",
    },
  });
  console.log("✅ Branches created");

  // Centre admin
  const adminUser = await db.user.upsert({
    where: { email: "admin.pj@tuitioncentral.my" },
    update: {},
    create: {
      name: "Ahmad Farid",
      email: "admin.pj@tuitioncentral.my",
      passwordHash: hash,
      role: "CENTRE_ADMIN",
    },
  });
  await db.branchAdmin.upsert({
    where: { userId_branchId: { userId: adminUser.id, branchId: branch1.id } },
    update: {},
    create: { userId: adminUser.id, branchId: branch1.id },
  });
  console.log("✅ Centre admin:", adminUser.email);

  // Subjects
  const mathSubj = await db.subject.upsert({
    where: { id: "subj-math-spm" },
    update: {},
    create: { id: "subj-math-spm", name: "Additional Mathematics", level: "Form 4-5", syllabusType: "SPM" },
  });
  const sciSubj = await db.subject.upsert({
    where: { id: "subj-sci-pt3" },
    update: {},
    create: { id: "subj-sci-pt3", name: "Science", level: "Form 1-3", syllabusType: "PT3" },
  });
  const bmSubj = await db.subject.upsert({
    where: { id: "subj-bm-spm" },
    update: {},
    create: { id: "subj-bm-spm", name: "Bahasa Melayu", level: "Form 4-5", syllabusType: "SPM" },
  });
  const engSubj = await db.subject.upsert({
    where: { id: "subj-eng-spm" },
    update: {},
    create: { id: "subj-eng-spm", name: "English", level: "Form 4-5", syllabusType: "SPM" },
  });
  console.log("✅ Subjects created");

  // Teacher
  const teacherUser = await db.user.upsert({
    where: { email: "teacher1@tuitioncentral.my" },
    update: {},
    create: {
      name: "Siti Nurhaliza binti Hassan",
      email: "teacher1@tuitioncentral.my",
      passwordHash: hash,
      role: "TEACHER",
    },
  });
  const teacher = await db.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      branchId: branch1.id,
      qualification: "B.Sc. Mathematics (UM), Dip. Education",
      salaryType: "MONTHLY",
      salaryRate: 3500,
    },
  });
  await db.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId: teacher.id, subjectId: mathSubj.id } },
    update: {},
    create: { teacherId: teacher.id, subjectId: mathSubj.id },
  });
  console.log("✅ Teacher:", teacherUser.email);

  // Class
  const mathClass = await db.class.upsert({
    where: { id: "class-math-f5-a" },
    update: {},
    create: {
      id: "class-math-f5-a",
      branchId: branch1.id,
      subjectId: mathSubj.id,
      teacherId: teacher.id,
      name: "Add Maths Form 5 (Batch A)",
      room: "A1",
      capacity: 20,
      dayOfWeek: 6,
      timeStart: "09:00",
      timeEnd: "11:00",
      feeAmount: 180,
    },
  });
  console.log("✅ Class created");

  // Parent
  const parentUser = await db.user.upsert({
    where: { email: "parent1@example.com" },
    update: {},
    create: {
      name: "Abdullah bin Razak",
      email: "parent1@example.com",
      phone: "+60123456789",
      passwordHash: hash,
      role: "PARENT",
    },
  });
  const parent = await db.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: { userId: parentUser.id, relationship: "Father" },
  });

  // Student
  const studentUser = await db.user.upsert({
    where: { email: "student1@example.com" },
    update: {},
    create: {
      name: "Ahmad Aiman bin Abdullah",
      email: "student1@example.com",
      passwordHash: hash,
      role: "STUDENT",
    },
  });
  const student = await db.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      branchId: branch1.id,
      icNumber: "060101-14-1234",
      school: "SMK Kota Damansara",
      formLevel: "Form 5",
      status: "ACTIVE",
      parents: { connect: { id: parent.id } },
    },
  });

  // Enrollment
  await db.enrollment.upsert({
    where: { studentId_classId: { studentId: student.id, classId: mathClass.id } },
    update: {},
    create: { studentId: student.id, classId: mathClass.id, status: "ACTIVE" },
  });

  // Invoice
  const now = new Date();
  await db.invoice.upsert({
    where: { id: "inv-seed-001" },
    update: {},
    create: {
      id: "inv-seed-001",
      studentId: student.id,
      branchId: branch1.id,
      month: new Date(now.getFullYear(), now.getMonth(), 1),
      amount: 180,
      dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
      status: "PENDING",
    },
  });

  // Exam result
  await db.examResult.upsert({
    where: { id: "result-seed-001" },
    update: {},
    create: {
      id: "result-seed-001",
      studentId: student.id,
      classId: mathClass.id,
      title: "Mid-Year Mock Exam",
      score: 78,
      maxScore: 100,
      examDate: new Date("2024-06-15"),
    },
  });

  console.log("✅ Student, parent, enrollment, invoice, result created");
  console.log("   Student email:", studentUser.email);
  console.log("   Parent email: ", parentUser.email);

  // Student points
  await db.studentPoint.create({
    data: {
      studentId: student.id,
      points: 50,
      reason: "Joined tuition centre",
    },
  }).catch(() => {});

  // Badges
  await db.badge.upsert({
    where: { id: "badge-perfect-att" },
    update: {},
    create: { id: "badge-perfect-att", name: "Perfect Attendance", description: "100% attendance for a month", iconUrl: "🌟" },
  });
  await db.badge.upsert({
    where: { id: "badge-top-student" },
    update: {},
    create: { id: "badge-top-student", name: "Top Student", description: "Ranked #1 in class", iconUrl: "🏆" },
  });

  // Award a badge to student
  await db.studentBadge.upsert({
    where: { studentId_badgeId: { studentId: student.id, badgeId: "badge-perfect-att" } },
    update: {},
    create: { studentId: student.id, badgeId: "badge-perfect-att" },
  });
  console.log("✅ Badges seeded");

  // Malaysian holidays
  const holidays = [
    { id: "h-newyear-2025", name: "New Year's Day", date: new Date("2025-01-01") },
    { id: "h-thaipusam-2025", name: "Thaipusam", date: new Date("2025-02-11") },
    { id: "h-chinese-ny-2025", name: "Chinese New Year", date: new Date("2025-01-29") },
    { id: "h-labour-2025", name: "Labour Day", date: new Date("2025-05-01") },
    { id: "h-hari-raya-2025", name: "Hari Raya Aidilfitri", date: new Date("2025-03-31") },
    { id: "h-merdeka-2025", name: "Hari Merdeka", date: new Date("2025-08-31") },
    { id: "h-malaysia-day-2025", name: "Malaysia Day", date: new Date("2025-09-16") },
    { id: "h-deepavali-2025", name: "Deepavali", date: new Date("2025-10-20") },
    { id: "h-christmas-2025", name: "Christmas", date: new Date("2025-12-25") },
  ];

  for (const h of holidays) {
    await db.holiday.upsert({
      where: { id: h.id },
      update: {},
      create: { ...h, isNational: true },
    });
  }
  console.log("✅ Malaysian holidays seeded");

  console.log("\n🎉 Seeding complete!");
  console.log("\n📧 Login credentials (password: Admin@123):");
  console.log("   Super Admin:   superadmin@tuitioncentral.my");
  console.log("   Centre Admin:  admin.pj@tuitioncentral.my");
  console.log("   Teacher:       teacher1@tuitioncentral.my");
  console.log("   Parent:        parent1@example.com");
  console.log("   Student:       student1@example.com");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
