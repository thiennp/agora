import { Badge, Table, TBody, Td, Th, THead, Tr, type BadgeTone } from "@/components/ui";

import { Demo, Section } from "../Block";

const ROWS: { item: string; owner: string; state: string; tone: BadgeTone; offers: number }[] = [
  { item: "Balance bike", owner: "Mia", state: "Offered", tone: "info", offers: 3 },
  { item: "Winter boots, size 28", owner: "Jonas", state: "Agreed", tone: "success", offers: 1 },
  { item: "Picture books (12)", owner: "Aiko", state: "Waiting", tone: "warning", offers: 0 },
  { item: "Baby gate", owner: "Sam", state: "Declined", tone: "danger", offers: 2 },
];

export function TablesSection() {
  return (
    <Section id="tables" title="Tables">
      <Demo title="Data table" note="Scrolls sideways inside its frame on narrow screens; the page itself never does.">
        <Table caption="Sample items">
          <THead>
            <Tr>
              <Th>Item</Th>
              <Th>Owner</Th>
              <Th>State</Th>
              <Th numeric>Offers</Th>
            </Tr>
          </THead>
          <TBody>
            {ROWS.map((r) => (
              <Tr key={r.item}>
                <Td className="font-semibold">{r.item}</Td>
                <Td>{r.owner}</Td>
                <Td>
                  <Badge size="sm" tone={r.tone}>
                    {r.state}
                  </Badge>
                </Td>
                <Td numeric>{r.offers}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Demo>
    </Section>
  );
}
