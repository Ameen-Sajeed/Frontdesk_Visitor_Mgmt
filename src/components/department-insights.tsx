"use client";

import { useState } from "react";
import { OperationsChart } from "@/components/operations-chart";

type ChartItem = { label: string; value: number };
type ResponseMetric = {
  label: string;
  averageMinutes: number;
  decisions: number;
  rejected: number;
};

export function DepartmentInsights({
  statusData,
  dailyData,
  responseMetrics,
}: {
  statusData: ChartItem[];
  dailyData: ChartItem[];
  responseMetrics: ResponseMetric[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="department-insights">
      <button
        className="secondary"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? "Hide insights" : "View insights"}
      </button>
      {open && (
        <div className="operations-dashboard department-insights-content">
          <OperationsChart title="Department visitor status" data={statusData} />
          <OperationsChart title="Visits in the last 7 days" data={dailyData} />
          <OperationsChart
            title="Average approval time"
            data={responseMetrics.map((metric) => ({
              label: metric.label,
              value: metric.averageMinutes,
            }))}
            formatValue={(minutes) => `${minutes}m`}
          />
          <OperationsChart
            title="Approval decisions"
            data={responseMetrics.map((metric) => ({
              label: metric.label,
              value: metric.decisions,
            }))}
          />
          <OperationsChart
            title="Rejected requests"
            data={responseMetrics.map((metric) => ({
              label: metric.label,
              value: metric.rejected,
            }))}
          />
        </div>
      )}
    </section>
  );
}
