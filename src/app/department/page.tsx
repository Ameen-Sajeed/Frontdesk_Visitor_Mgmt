import Link from "next/link";
import { VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
  const { department } = await searchParams;
  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  const departmentId = department ?? departments[0]?.id;
  const visits = departmentId
    ? await prisma.visit.findMany({
        where: { departmentId, status: VisitStatus.WAITING_APPROVAL },
        include: { visitor: true, host: true },
        orderBy: [{ priority: "desc" }, { approvalAskedAt: "asc" }],
      })
    : [];
  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand">
          front<i>desk</i>
        </div>
        <div className="nav-links">
          <Link href="/dashboard">Reception</Link>
          <Link href="/department">Department queue</Link>
        </div>
      </nav>
      <section className="hero">
        <div>
          <p className="eyebrow">Department workspace</p>
          <h1>Approval queue</h1>
          <p className="sub">Review incoming visitors in priority and arrival order.</p>
        </div>
      </section>
      <section className="panel">
        <div className="toolbar">
          <h2>
            {departments.find((item) => item.id === departmentId)?.name ?? "Department"} visitors
          </h2>
          <QueryFilter
            name="department"
            value={departmentId}
            options={departments.map((item) => ({ value: item.id, label: item.name }))}
          />
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
                    {visit.host.name} · {visit.type === "WALK_IN" ? "Walk-in" : "Appointment"}
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
