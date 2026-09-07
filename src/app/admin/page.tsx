import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserNav } from "@/components/user-nav";
import { AdminWorkspace } from "@/components/admin-workspace";
import { OperationsChart } from "@/components/operations-chart";

export default async function AdminPage() {
  const session = await getAuthSession();
  if (session?.role !== "ADMIN") redirect("/login");
  const [users, departments, config] = await Promise.all([
    prisma.user.findMany({
      include: { department: { select: { name: true } } },
      orderBy: [{ accountStatus: "asc" }, { createdAt: "desc" }],
    }),
    prisma.department.findMany({
      include: { _count: { select: { users: true, employees: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.appConfig.findUnique({ where: { key: "wait_threshold_minutes" } }),
  ]);
  const usersByDepartment = departments.map((department) => ({
    label: department.name,
    value: department._count.users,
  }));
  const userAccessSummary = [
    { label: "Active", value: users.filter((user) => user.accountStatus === "ACTIVE").length },
    { label: "Pending", value: users.filter((user) => user.accountStatus === "PENDING").length },
    { label: "Blocked", value: users.filter((user) => user.accountStatus === "BLOCKED").length },
  ];
  return (
    <main className="shell">
      <UserNav user={session} />
      <section className="hero">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Manage access and settings.</h1>
          <p className="sub">Approve users, keep departments organised, and set visitor alerts.</p>
        </div>
      </section>
      <section className="operations-dashboard">
        <OperationsChart title="Users by department" data={usersByDepartment} />
        <OperationsChart title="User access" data={userAccessSummary} />
      </section>
      <AdminWorkspace
        initialUsers={users.map(({ password, department, ...user }) => ({
          ...user,
          departmentName: department?.name ?? null,
        }))}
        initialDepartments={departments}
        waitThreshold={config?.value ?? "30"}
      />
    </main>
  );
}
