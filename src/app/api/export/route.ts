import { NextResponse } from "next/server";
import { Prisma, VisitStatus } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visitInclude } from "@/lib/visits";
import { formatDateTime } from "@/lib/timing";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function buildDateWhereClause(
  dateRange?: string,
  startDate?: string,
  endDate?: string,
): Prisma.DateTimeFilter | undefined {
  if (dateRange === "CUSTOM" && (startDate || endDate)) {
    const filter: Prisma.DateTimeFilter = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      filter.lte = e;
    }
    return filter;
  }

  if (!dateRange || dateRange === "ALL") return undefined;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateRange === "TODAY") {
    return { gte: startOfDay };
  }
  if (dateRange === "YESTERDAY") {
    const yesterdayStart = new Date(startOfDay);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    return { gte: yesterdayStart, lt: startOfDay };
  }
  if (dateRange === "7DAYS") {
    const sevenDaysAgo = new Date(startOfDay);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    return { gte: sevenDaysAgo };
  }
  if (dateRange === "30DAYS") {
    const thirtyDaysAgo = new Date(startOfDay);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    return { gte: thirtyDaysAgo };
  }
  return undefined;
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "excel";
    const status = searchParams.get("status");
    const dateRange = searchParams.get("dateRange");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const where: Prisma.VisitWhereInput = {};

    // Security enforcement: Department users are strictly limited to their department
    if (session.role === "DEPARTMENT_LEAD") {
      if (!session.departmentId) {
        return NextResponse.json({ error: "No department assigned to user." }, { status: 403 });
      }
      where.departmentId = session.departmentId;
    }

    if (status && status !== "ALL") {
      where.status = status as VisitStatus;
    }

    const dateFilter = buildDateWhereClause(dateRange || undefined, startDate || undefined, endDate || undefined);
    if (dateFilter) {
      where.registeredAt = dateFilter;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.visitor = {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
          { designation: { contains: q, mode: "insensitive" } },
        ],
      };
    }

    const visits = await prisma.visit.findMany({
      where,
      include: visitInclude,
      orderBy: { registeredAt: "desc" },
    });

    const exportRows = visits.map((v) => ({
      "Visitor Name": v.visitor.fullName,
      "Visitor Designation": v.visitor.designation || "—",
      Company: v.visitor.company || "—",
      Phone: v.visitor.phone,
      Email: v.visitor.email || "—",
      Department: v.department.name,
      Host: v.host.name,
      "Host Designation": v.host.designation || "—",
      "Visit Type": v.type === "WALK_IN" ? "Walk-in" : "Appointment",
      Purpose: v.purpose,
      Status: v.status.replaceAll("_", " "),
      "Registered At": formatDateTime(v.registeredAt),
      "Checked In At": formatDateTime(v.checkedInAt),
      "Meeting Started At": formatDateTime(v.meetingStartedAt),
      "Checked Out At": formatDateTime(v.checkedOutAt || v.leftAt),
      "Reason / Comment": v.rejectionReason || v.leftReason || "—",
    }));

    if (format === "pdf") {
      const doc = new jsPDF({ orientation: "landscape" });

      doc.setFontSize(16);
      doc.text("arriVo Visitor Management Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${visits.length}`, 14, 22);

      const tableHeaders = [
        ["Visitor", "Company", "Department", "Host", "Type", "Status", "Registered", "Out Reason"],
      ];

      const tableData = visits.map((v) => [
        v.visitor.fullName,
        v.visitor.company || "—",
        v.department.name,
        v.host.name,
        v.type === "WALK_IN" ? "Walk-in" : "Appt",
        v.status.replaceAll("_", " "),
        formatDateTime(v.registeredAt),
        v.rejectionReason || v.leftReason || "—",
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 28,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      });

      const pdfArrayBuffer = doc.output("arraybuffer");
      return new NextResponse(pdfArrayBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="visitors_report_${Date.now()}.pdf"`,
        },
      });
    }

    // Default Excel export (.xlsx)
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Visitors");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="visitors_report_${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed." },
      { status: 500 },
    );
  }
}
