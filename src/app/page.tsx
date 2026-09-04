import Link from "next/link";
import { VisitStatus } from "@prisma/client";
import { getDashboardVisits, getDepartmentsWithHosts } from "@/lib/visits";
import { RegisterVisitor } from "@/components/register-visitor";
import { StatusBadge } from "@/components/status-badge";
import { VisitActions } from "@/components/visit-actions";
import { QueryFilter } from "@/components/query-filter";

const date = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  day: "numeric",
});
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const [visits, departments] = await Promise.all([
    getDashboardVisits(status),
    getDepartmentsWithHosts(),
  ]);
  const waiting = visits.filter((v) => v.status === VisitStatus.WAITING_APPROVAL).length;
  const activeStatuses: VisitStatus[] = [VisitStatus.CHECKED_IN, VisitStatus.IN_MEETING];
  const active = visits.filter((v) => activeStatuses.includes(v.status)).length;
  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand">
          front<i>desk</i>
        </div>
        <div className="nav-links">
          <Link href="/">Reception</Link>
          <Link href="/department">Department queue</Link>
        </div>
      </nav>
      <section className="hero">
        <div>
          <p className="eyebrow">Reception workspace</p>
          <h1>Visitors, handled with confidence.</h1>
          <p className="sub">Register arrivals and keep every hand-off visible.</p>
        </div>
        <RegisterVisitor departments={departments} />
      </section>
      <section className="cards">
        <Stat label="Total visits" value={visits.length} />
        <Stat label="Awaiting approval" value={waiting} />
        <Stat label="On site" value={active} />
        <Stat
          label="Checked out"
          value={visits.filter((v) => v.status === VisitStatus.CHECKED_OUT).length}
        />
      </section>
      <section className="panel">
        <div className="toolbar">
          <h2>Visitor list</h2>
          <QueryFilter
            name="status"
            value={status ?? "ALL"}
            options={[
              { value: "ALL", label: "All statuses" },
              ...Object.values(VisitStatus).map((item) => ({
                value: item,
                label: item.replaceAll("_", " "),
              })),
            ]}
          />
        </div>
        {visits.length ? (
          <table>
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Department</th>
                <th>Host</th>
                <th>Visit</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Next step</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((visit) => (
                <tr key={visit.id}>
                  <td>
                    <div className="visitor">{visit.visitor.fullName}</div>
                    <div className="small">{visit.visitor.company || visit.visitor.phone}</div>
                  </td>
                  <td>{visit.department.name}</td>
                  <td>{visit.host.name}</td>
                  <td>
                    {visit.type === "WALK_IN" ? "Walk-in" : "Appointment"}
                    <div className="small">{visit.purpose}</div>
                  </td>
                  <td>
                    <StatusBadge status={visit.status} />
                  </td>
                  <td>{date.format(visit.registeredAt)}</td>
                  <td>
                    {visit.status === VisitStatus.APPROVED ? (
                      <VisitActions
                        visitId={visit.id}
                        actions={[
                          { status: VisitStatus.CHECKED_IN, label: "Check in", kind: "primary" },
                        ]}
                      />
                    ) : visit.status === VisitStatus.CHECKED_IN ? (
                      <VisitActions
                        visitId={visit.id}
                        actions={[{ status: VisitStatus.IN_MEETING, label: "Start meeting" }]}
                      />
                    ) : visit.status === VisitStatus.IN_MEETING ? (
                      <VisitActions
                        visitId={visit.id}
                        actions={[{ status: VisitStatus.CHECKED_OUT, label: "Check out" }]}
                      />
                    ) : (
                      <span className="small">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No visitors match this filter.</div>
        )}
      </section>
    </main>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
