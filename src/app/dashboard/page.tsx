import { VisitStatus } from "@prisma/client";
import { getDepartmentsWithHosts, getPaginatedReceptionVisits } from "@/lib/visits";
import { getAuthSession } from "@/lib/auth";
import { UserNav } from "@/components/user-nav";
import { RegisterVisitor } from "@/components/register-visitor";
import { StatusBadge } from "@/components/status-badge";
import { VisitActions } from "@/components/visit-actions";
import { QueryFilter } from "@/components/query-filter";
import { DateFilter } from "@/components/date-filter";
import { Pagination } from "@/components/pagination";
import { VisitDetailsModal } from "@/components/visit-details-modal";
import { RealtimeListener } from "@/components/realtime-listener";
import { formatDateTime } from "@/lib/timing";
import { prisma } from "@/lib/prisma";
import { SearchFilter } from "@/components/search-filter";
import { ExportVisits } from "@/components/export-visits";
import { WaitThresholdSettings } from "@/components/wait-threshold-settings";
import { TableLoadingIndicator, TableNavigationProvider } from "@/components/table-navigation";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; dateRange?: string; startDate?: string; endDate?: string; page?: string }>;
}) {
  const { status, search, dateRange, startDate, endDate, page } = await searchParams;
  const pageNum = Number(page) || 1;

  const [session, paginatedData, departments, waitThreshold] = await Promise.all([
    getAuthSession(),
    getPaginatedReceptionVisits({ status, search, dateRange, startDate, endDate, page: pageNum, limit: 10 }),
    getDepartmentsWithHosts(),
    prisma.appConfig.findUnique({ where: { key: "wait_threshold_minutes" } }),
  ]);

  const { visits, totalCount, totalPages } = paginatedData;

  const waiting = visits.filter((v) => v.status === VisitStatus.WAITING_APPROVAL).length;
  const activeStatuses: VisitStatus[] = [VisitStatus.CHECKED_IN, VisitStatus.IN_MEETING];
  const active = visits.filter((v) => activeStatuses.includes(v.status)).length;

  return (
    <main className="shell workspace-shell">
      <TableNavigationProvider>
        <UserNav user={session} />
        <RealtimeListener user={session} />
        <section className="hero">
        <div>
          <p className="eyebrow">Reception workspace</p>
          <h1>Visitors, handled with confidence.</h1>
          <p className="sub">Register arrivals and keep every hand-off visible.</p>
        </div>
        <RegisterVisitor departments={departments} />
        </section>

        <section className="cards">
        <Stat label="Total visits" value={totalCount} />
        <Stat label="Awaiting approval" value={waiting} />
        <Stat label="On site" value={active} />
        <Stat
          label="Checked out"
          value={visits.filter((v) => v.status === VisitStatus.CHECKED_OUT).length}
        />
        </section>

        <section className="panel">
        <div className="toolbar" style={{ flexWrap: "wrap", gap: 12 }}>
          <h2>Visitor list ({totalCount})</h2>

          <div className="toolbar-controls">
            <SearchFilter defaultValue={search ?? ""} />
            <DateFilter value={dateRange ?? "ALL"} />

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
            <ExportVisits />
            <WaitThresholdSettings initialMinutes={waitThreshold?.value || "30"} />
          </div>
        </div>

        {visits.length ? (
          <div className="table-section">
            <div className="table-scroll" tabIndex={0} aria-label="Visitor list">
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
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id}>
                    <td>
                      <div className="visitor">{visit.visitor.fullName}</div>
                      <div className="small">
                        {visit.visitor.designation ? `${visit.visitor.designation} · ` : ""}
                        {visit.visitor.company || visit.visitor.phone}
                      </div>
                    </td>
                    <td>{visit.department.name}</td>
                    <td>
                      <div>{visit.host.name}</div>
                      {visit.host.designation && (
                        <div className="small">{visit.host.designation}</div>
                      )}
                    </td>
                    <td>
                      {visit.type === "WALK_IN" ? "Walk-in" : "Appointment"}
                      <div className="small">{visit.purpose}</div>
                    </td>
                    <td>
                      <StatusBadge status={visit.status} />
                    </td>
                    <td>{formatDateTime(visit.registeredAt)}</td>
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
                      ) : ([VisitStatus.WAITING_APPROVAL, VisitStatus.APPROVED, VisitStatus.CHECKED_IN] as VisitStatus[]).includes(visit.status) ? (
                        <VisitActions visitId={visit.id} actions={[{ status: VisitStatus.LEFT_WITHOUT_MEETING, label: "Mark left", kind: "danger" }]} />
                      ) : (
                        <span className="small">—</span>
                      )}
                    </td>
                    <td>
                      <VisitDetailsModal visit={visit} />
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination page={pageNum} totalPages={totalPages} />
            <TableLoadingIndicator />
          </div>
        ) : (
          <div className="empty">No visitors match this filter.</div>
        )}
        </section>
      </TableNavigationProvider>
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
