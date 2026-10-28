import { BarList } from "@/components/BarList";
import { LineChart } from "@/components/LineChart";

import { Demo, Section } from "../Block";

export function ChartsSection() {
  return (
    <Section id="charts" title="Charts">
      <Demo title="Line chart" note="The dashboard's own dependency-free SVG chart, drawn here from sample numbers.">
        <LineChart
          title="Acceptance over rounds"
          summary="Sample data: the learning line rises from 40 to 80 percent while the baseline stays flat."
          xs={[1, 2, 3, 4, 5, 6]}
          yMax={100}
          format={(n) => `${n}%`}
          series={[
            { key: "learning", label: "Learning", color: "var(--c-learning)", values: [40, 48, 59, 66, 74, 80] },
            { key: "off", label: "Learning off", color: "var(--c-off)", dashed: true, values: [41, 42, 40, 43, 42, 41] },
          ]}
        />
      </Demo>
      <Demo title="Bar list">
        <BarList
          unit="%"
          max={100}
          bars={[
            { label: "Learning", value: 80, color: "var(--c-learning)" },
            { label: "Retry", value: 62, color: "var(--c-retry)" },
            { label: "Learning off", value: 41, color: "var(--c-off)" },
          ]}
        />
      </Demo>
    </Section>
  );
}
