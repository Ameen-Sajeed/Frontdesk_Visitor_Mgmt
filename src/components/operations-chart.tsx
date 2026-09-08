type ChartItem = { label: string; value: number };

export function OperationsChart({
  title,
  data,
  formatValue = (value) => String(value),
}: {
  title: string;
  data: ChartItem[];
  formatValue?: (value: number) => string;
}) {
  const maximum = Math.max(1, ...data.map((item) => item.value));
  return (
    <section className="operations-chart" aria-label={title}>
      <h3>{title}</h3>
      <div className="operations-chart-bars">
        {data.map((item) => (
          <div className="operations-chart-row" key={item.label}>
            <span>{item.label}</span>
            <div className="operations-chart-track">
              <div
                className="operations-chart-fill"
                style={{ width: `${(item.value / maximum) * 100}%` }}
              />
            </div>
            <strong>{formatValue(item.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
