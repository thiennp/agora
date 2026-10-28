"use client";

import { useState } from "react";

import { Button, Modal } from "@/components/ui";

import { Demo, Section } from "../Block";

type Which = "info" | "confirm" | null;

export function ModalsSection() {
  const [which, setWhich] = useState<Which>(null);
  const close = () => setWhich(null);
  return (
    <Section id="modals" title="Modals">
      <Demo title="Dialogs" note="Focus stays inside, Escape closes the top one, and focus returns to the button.">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setWhich("info")}>
            Open dialog
          </Button>
          <Button variant="danger" onClick={() => setWhich("confirm")}>
            Open confirmation
          </Button>
        </div>
      </Demo>
      <Modal open={which === "info"} onClose={close} title="About this dialog" footer={<Button onClick={close}>Got it</Button>}>
        <p>Dialogs interrupt, so use them for one decision. This one only explains itself.</p>
      </Modal>
      <Modal
        open={which === "confirm"}
        onClose={close}
        size="sm"
        title="Withdraw the offer?"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Keep it
            </Button>
            <Button variant="danger" onClick={close} data-autofocus>
              Withdraw
            </Button>
          </>
        }
      >
        <p>The other family is told, and the item goes back to your list.</p>
      </Modal>
    </Section>
  );
}
