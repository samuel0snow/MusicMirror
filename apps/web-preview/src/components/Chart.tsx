export interface BarRowData {
  id: string;
  name: string;
  value: number;
  display: string;
}

export type ChartModel =
  | { kind: 'prism' }
  | { kind: 'stat'; value: string; caption: string }
  | { kind: 'bars'; caption: string; rows: BarRowData[] };

function StatChart({ value, caption }: { value: string; caption: string }) {
  return (
    <div className="chart chart-stat" data-testid="chart-stat">
      <span className="chart-stat-value" data-testid="chart-value">{value}</span>
      <span className="chart-stat-caption" data-testid="chart-caption">{caption}</span>
    </div>
  );
}

function BarsChart({ caption, rows }: { caption: string; rows: BarRowData[] }) {
  return (
    <div className="chart chart-bars" data-testid="chart-bars">
      {rows.map((row) => {
        const width = Math.max(0, Math.min(100, row.value * 100));
        return (
          <div className="bar-row" data-testid="bar-row" key={row.id}>
            <span className="bar-name">{row.name}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: width + '%' }} />
            </span>
            <span className="bar-value" data-testid="bar-value">{row.display}</span>
          </div>
        );
      })}
      {caption ? <span className="chart-caption">{caption}</span> : null}
    </div>
  );
}

function PrismChart() {
  return (
    <div className="chart chart-prism" data-testid="chart-prism">
      <span className="prism-glyph" aria-hidden="true">◆</span>
      <span className="prism-glow" aria-hidden="true" />
    </div>
  );
}

export function Chart({ chart }: { chart: ChartModel }) {
  if (chart.kind === 'stat') {
    return <StatChart value={chart.value} caption={chart.caption} />;
  }
  if (chart.kind === 'bars') {
    return <BarsChart caption={chart.caption} rows={chart.rows} />;
  }
  return <PrismChart />;
}
