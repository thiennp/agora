"use client";

import { useId, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "./cn";
import { Icon } from "./icons";

/* ---------- shared look ---------- */

const CONTROL =
  "block w-full rounded-control border bg-surface px-3.5 text-body text-ink placeholder:text-muted/70 " +
  "transition-colors focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted";

type Status = "default" | "error" | "success";

const STATUS: Record<Status, string> = {
  default: "border-line-strong focus:border-brand-500 focus:ring-brand-500/20",
  error: "border-red-500 focus:border-red-500 focus:ring-red-500/20",
  success: "border-green-500 focus:border-green-500 focus:ring-green-500/20",
};

const HINT_TONE: Record<Status, string> = { default: "text-muted", error: "text-bad", success: "text-ok" };

/* ---------- Field: label + control + hint ---------- */

export interface FieldProps {
  label: string;
  hint?: ReactNode;
  status?: Status;
  /** Receives the generated id and the id of the hint, to put on the control. */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  className?: string;
}

/** Wraps a control with a visible label and a hint or error line, wired together for screen readers. */
export function Field({ label, hint, status = "default", children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-small font-semibold text-ink">
        {label}
      </label>
      {children({ id, describedBy: hintId, invalid: status === "error" })}
      {hint ? (
        <p id={hintId} className={cn("mt-1.5 text-small", HINT_TONE[status])}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- text controls ---------- */

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  status?: Status;
}

export function TextInput({ status = "default", className, ...rest }: TextInputProps) {
  return <input aria-invalid={status === "error" || undefined} className={cn(CONTROL, "h-11", STATUS[status], className)} {...rest} />;
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  status?: Status;
}

export function TextArea({ status = "default", rows = 4, className, ...rest }: TextAreaProps) {
  return <textarea rows={rows} aria-invalid={status === "error" || undefined} className={cn(CONTROL, "py-2.5", STATUS[status], className)} {...rest} />;
}

export interface SelectBoxProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
  status?: Status;
}

export function SelectBox({ options, placeholder, status = "default", className, ...rest }: SelectBoxProps) {
  return (
    <div className="relative">
      <select aria-invalid={status === "error" || undefined} className={cn(CONTROL, "h-11 appearance-none pr-10", STATUS[status], className)} {...rest}>
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 6l4 4 4-4" />
      </svg>
    </div>
  );
}

/* ---------- choice controls ---------- */

interface ChoiceProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: ReactNode;
  description?: ReactNode;
}

function ChoiceRow({ label, description, className, disabled, children }: { label: ReactNode; description?: ReactNode; className?: string; disabled?: boolean; children: ReactNode }) {
  return (
    <label className={cn("flex items-start gap-3 font-normal", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", className)}>
      {children}
      <span className="min-w-0">
        <span className="block text-body text-ink">{label}</span>
        {description ? <span className="block text-small text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export function Checkbox({ label, description, className, ...rest }: ChoiceProps) {
  return (
    <ChoiceRow label={label} description={description} className={className} disabled={rest.disabled}>
      <input
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-line-strong bg-surface accent-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        {...rest}
      />
    </ChoiceRow>
  );
}

export function Radio({ label, description, className, ...rest }: ChoiceProps) {
  return (
    <ChoiceRow label={label} description={description} className={className} disabled={rest.disabled}>
      <input
        type="radio"
        className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        {...rest}
      />
    </ChoiceRow>
  );
}

export interface ToggleProps {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (on: boolean) => void;
}

/** An on/off switch (role="switch"). Works controlled or uncontrolled. */
export function Toggle({ label, checked, defaultChecked = false, disabled, onChange }: ToggleProps) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  const flip = () => {
    if (disabled) return;
    if (checked === undefined) setInner(!on);
    onChange?.(!on);
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={flip}
      className="inline-flex items-center gap-3 text-body text-ink disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
    >
      <span className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-brand-600 dark:bg-brand-500" : "bg-slate-300 dark:bg-slate-600")}>
        <span className={cn("absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", on && "translate-x-5")} />
      </span>
      {label}
    </button>
  );
}

/* ---------- files ---------- */

/** The browser's own file picker, styled. */
export function FilePicker({ className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      type="file"
      className={cn(
        "block w-full cursor-pointer rounded-control border border-line-strong bg-surface text-small text-muted",
        "file:mr-4 file:cursor-pointer file:border-0 file:bg-brand-100 file:px-4 file:py-3 file:text-small file:font-semibold file:text-brand-800",
        "dark:file:bg-brand-900 dark:file:text-brand-100",
        className,
      )}
      {...rest}
    />
  );
}

/** A drop target that also opens the picker on click or keyboard. Files are handed to `onFiles`; nothing is uploaded here. */
export function FileDrop({ onFiles, accept, title = "Drop files here", hint = "or press to choose" }: { onFiles: (files: File[]) => void; accept?: string; title?: string; hint?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const drop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    onFiles(Array.from(e.dataTransfer.files));
  };
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    onFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          input.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={cn(
        "flex flex-col items-center gap-1 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        over ? "border-brand-500 bg-brand-50 dark:bg-brand-950" : "border-line-strong bg-surface-2",
      )}
    >
      <span className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-100">
        <Icon name="upload" />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-small text-muted">{hint}</p>
      <input ref={input} type="file" multiple accept={accept} onChange={pick} className="hidden" tabIndex={-1} />
    </div>
  );
}
