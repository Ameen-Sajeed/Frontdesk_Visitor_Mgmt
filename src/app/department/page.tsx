import { VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { getPaginatedDepartmentVisits } from "@/lib/visits";
import { UserNav } from "@/components/user-nav";
import { StatusBadge } from "@/components/status-badge";
import { VisitActions } from "@/components/visit-actions";
import { QueryFilter } from "@/components/query-filter";
import { DateFilter } from "@/components/date-filter";
import { SearchFilter } from "@/components/search-filter";
import { Pagination } from "@/components/pagination";
import { DepartmentTabs } from "@/components/department-tabs";
import { VisitDetailsModal } from "@/components/visit-details-modal";
import { RealtimeListener } from "@/components/realtime-listener";
import { formatDateTime } from "@/lib/timing";
import { ExportVisits } from "@/components/export-visits";
import { TableLoadingIndicator, TableNavigationProvider } from "@/components/table-navigation";

export default async function DepartmentQueue({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    status?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}) {
  const { tab, search, status, dateRange, startDate, endDate, page } = await searchParams;
  const session = await getAuthSession();

  // Strict Data Security Enforcement: Backend determines departmentId from authenticated user session
  const departmentId = session?.departmentId;

  const currentDepartment = departmentId
    ? await prisma.department.findUnique({ where: { id: departmentId } })
    : null;

  const activeTab = tab === "history" ? "history" : "pending";
  const pageNum = Number(page) || 1;

  // Pending count for tab badge
  const pendingCount = departmentId
    ? await prisma.visit.count({
        where: { departmentId, status: VisitStatus.WAITING_APPROVAL },
      })
    : 0;

  // Fetch paginated visits based on active tab and filters
  const paginatedData = departmentId
    ? await getPaginatedDepartmentVisits({
        departmentId,
        search,
        status,
        dateRange,
        startDate,
        endDate,
        tab: activeTab,
        page: pageNum,
        limit: 10,
      })
    : { visits: [], totalCount: 0, page: 1, totalPages: 1, limit: 10 };

  const { visits, totalCount, totalPages } = paginatedData;

  return (
    <main className="shell workspace-shell">
      <TableNavigationProvider>
        <UserNav user={session} />
        <RealtimeListener user={session} />
        <section className="hero">
          <div>
            <p className="eyebrow">Department workspace</p>
            <h1>
              {currentDepartment ? `${currentDepartment.name} Dashboard` : "Department Dashboard"}
            </h1>
            <p className="sub">
              {currentDepartment
                ? `Manage visitor approvals and history for ${currentDepartment.name}.`
                : "Review incoming visitors for your department."}
            </p>
          </div>
        </section>

        <section className="panel">
          <DepartmentTabs activeTab={activeTab} pendingCount={pendingCount} />

          {activeTab === "pending" ? (
            <div className="department-content">
              <div className="toolbar" style={{ flexWrap: "wrap", gap: 12 }}>
                <h2>Pending Approvals ({totalCount})</h2>
                <div className="toolbar-controls">
                  <SearchFilter defaultValue={search ?? ""} />
                  <DateFilter value={dateRange ?? "ALL"} />
                </div>
              </div>

              <div className="queue-scroll">
                <div style={{ padding: 18 }} className="queue">
                  {visits.length ? (
                    visits.map((visit) => (
                      <article className="queue-card" key={visit.id}>
                        <div>
                          <h3>
                            {visit.visitor.fullName} <StatusBadge status={visit.status} />
                          </h3>
                          <p className="queue-meta">
                            {visit.visitor.designation ? `${visit.visitor.designation} · ` : ""}
                            {visit.visitor.company ? `${visit.visitor.company} · ` : ""}Meeting{" "}
                            {visit.host.name}{" "}
                            {visit.host.designation ? `(${visit.host.designation})` : ""} ·{" "}
                            {visit.type === "WALK_IN" ? "Walk-in" : "Appointment"}
                          </p>
                          <p className="queue-meta">
                            {visit.purpose} · Requested{" "}
                            {formatDateTime(visit.approvalAskedAt || visit.registeredAt)}
                          </p>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <VisitActions
                            visitId={visit.id}
                            actions={[
                              { status: VisitStatus.REJECTED, label: "Reject", kind: "danger" },
                              { status: VisitStatus.APPROVED, label: "Approve", kind: "primary" },
                            ]}
                          />
                          <VisitDetailsModal visit={visit} />
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty">No visitors are currently waiting for approval.</div>
                  )}
                </div>
              </div>

              <Pagination page={pageNum} totalPages={totalPages} />
              <TableLoadingIndicator />
            </div>
          ) : (
            <div className="department-content">
              <div className="toolbar" style={{ flexWrap: "wrap", gap: 12 }}>
                <h2>Visitor History ({totalCount})</h2>

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
                </div>
              </div>

              {visits.length ? (
                <div className="table-section">
                  <div className="table-scroll" tabIndex={0} aria-label="Visitor history">
                    <table>
                      <thead>
                        <tr>
                          <th>Visitor</th>
                          <th>Host</th>
                          <th>Visit</th>
                          <th>Status</th>
                          <th>Registered</th>
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
                <div className="empty">No visitor history matches your search/filter criteria.</div>
              )}
            </div>
          )}
        </section>
      </TableNavigationProvider>
    </main>
  );
}
