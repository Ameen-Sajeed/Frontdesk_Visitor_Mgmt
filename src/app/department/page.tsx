import { VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { UserNav } from "@/components/user-nav";
import { StatusBadge } from "@/components/status-badge";
import { VisitActions } from "@/components/visit-actions";
import { QueryFilter } from "@/components/query-filter";

const time = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  day: "numeric",
});
export default async function DepartmentQueue({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const { department: searchDept } = await searchParams;
  const session = await getAuthSession();

  // Security enforcement: Department users are restricted strictly to their assigned departmentId
  const departmentId =
    session?.role === "DEPARTMENT_LEAD"
      ? session.departmentId
      : searchDept ?? session?.departmentId ?? null;

  const currentDepartment = departmentId
    ? await prisma.department.findUnique({ where: { id: departmentId } })
    : null;

  const visits = departmentId
    ? await prisma.visit.findMany({
        where: { departmentId, status: VisitStatus.WAITING_APPROVAL },
        include: { visitor: true, host: true },
        orderBy: [{ priority: "desc" }, { approvalAskedAt: "asc" }],
      })
    : [];

  return (
    <main className="shell">
      <UserNav user={session} />
      <section className="hero">
        <div>
          <p className="eyebrow">Department workspace</p>
          <h1>Approval queue</h1>
          <p className="sub">
            {currentDepartment ? `Review visitors waiting for ${currentDepartment.name}.` : "Review incoming visitors for your department."}
          </p>
        </div>
      </section>
      <section className="panel">
        <div className="toolbar">
          <h2>
            {currentDepartment ? `${currentDepartment.name} visitors` : "My Department Visitors"}
          </h2>
        </div>
        <div style={{ padding: 18 }} className="queue">
          {visits.length ? (
            visits.map((visit) => (
              <article className="queue-card" key={visit.id}>
                <div>
                  <h3>
                    {visit.visitor.fullName} <StatusBadge status={visit.status} />
                  </h3>
                  <p className="queue-meta">
                    {visit.visitor.company ? `${visit.visitor.company} · ` : ""}Meeting{" "}
                    {visit.host.name} {visit.host.designation ? `(${visit.host.designation})` : ""} · {visit.type === "WALK_IN" ? "Walk-in" : "Appointment"}
                  </p>
                  <p className="queue-meta">
                    {visit.purpose} · Requested{" "}
                    {visit.approvalAskedAt ? time.format(visit.approvalAskedAt) : "just now"}
                  </p>
                </div>
                <VisitActions
                  visitId={visit.id}
                  actions={[
                    { status: VisitStatus.REJECTED, label: "Reject", kind: "danger" },
                    { status: VisitStatus.APPROVED, label: "Approve", kind: "primary" },
                  ]}
                />
              </article>
            ))
          ) : (
            <div className="empty">No visitors are waiting for approval.</div>
          )}
        </div>
      </section>
    </main>
  );
}
