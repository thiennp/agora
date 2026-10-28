"use client";

import { useState } from "react";

import { Checkbox, Field, FileDrop, FilePicker, Radio, SelectBox, TextArea, TextInput, Toggle } from "@/components/ui";

import { Demo, Section } from "../Block";

const SIZES = [
  { value: "s", label: "Small" },
  { value: "m", label: "Medium" },
  { value: "l", label: "Large" },
];

export function FormsSection() {
  const [dropped, setDropped] = useState<string[]>([]);
  return (
    <Section id="forms" title="Form controls">
      <Demo title="Text fields" note="Every control has a visible label and a hint or error line.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Item name" hint="Shown to other families.">
            {({ id, describedBy }) => <TextInput id={id} aria-describedby={describedBy} placeholder="Wooden balance bike" />}
          </Field>
          <Field label="Postcode" status="error" hint="Enter four digits.">
            {({ id, describedBy, invalid }) => <TextInput id={id} aria-describedby={describedBy} aria-invalid={invalid} defaultValue="12" status="error" />}
          </Field>
          <Field label="Size" status="success" hint="Looks good.">
            {({ id, describedBy }) => <SelectBox id={id} aria-describedby={describedBy} options={SIZES} defaultValue="m" status="success" />}
          </Field>
          <Field label="Locked field">
            {({ id }) => <TextInput id={id} disabled defaultValue="Cannot be edited" />}
          </Field>
          <Field label="Notes" className="md:col-span-2">
            {({ id }) => <TextArea id={id} placeholder="Anything the other family should know" />}
          </Field>
        </div>
      </Demo>
      <Demo title="Choices">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3">
            <Checkbox label="Allow standing rules" defaultChecked />
            <Checkbox label="Share a coarse district" description="Never the street." />
            <Checkbox label="Disabled" disabled />
          </div>
          <fieldset className="m-0 space-y-3 border-0 p-0">
            <legend className="sr-only">Handoff</legend>
            <Radio name="handoff" label="Meet in person" defaultChecked />
            <Radio name="handoff" label="Post it" />
            <Radio name="handoff" label="Locker" disabled />
          </fieldset>
          <div className="space-y-3">
            <Toggle label="Notify me" defaultChecked />
            <Toggle label="Translate messages" />
            <Toggle label="Disabled" disabled />
          </div>
        </div>
      </Demo>
      <Demo title="Files">
        <div className="space-y-4">
          <FilePicker aria-label="Choose a file" />
          <FileDrop onFiles={(files) => setDropped(files.map((f) => f.name))} accept="image/*" />
          {dropped.length ? <p className="text-small text-muted">Chosen here only, nothing is uploaded: {dropped.join(", ")}</p> : null}
        </div>
      </Demo>
    </Section>
  );
}
