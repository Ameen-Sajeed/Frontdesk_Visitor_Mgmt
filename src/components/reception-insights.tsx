"use client";

import { useState } from "react";
import { OperationsChart } from "@/components/operations-chart";

type ChartItem = { label: string; value: number };

export function ReceptionInsights({
  statusData,
  dailyData,
}: {
  statusData: ChartItem[];
  dailyData: ChartItem[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="reception-insights">
      <button
        className="secondary"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? "Hide insights" : "View insights"}
      </button>
      {open && (
        <div className="operations-dashboard reception-insights-content">
          <OperationsChart title="Visitor status" data={statusData} />
          <OperationsChart title="Visits in the last 7 days" data={dailyData} />
        </div>
      )}
    </section>
  );
}
