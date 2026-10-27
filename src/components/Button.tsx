import type { ButtonHTMLAttributes } from "react";

export function Button({ variant = "default", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "danger" | "ghost" }) {
  const v = variant === "default" ? "" : ` ${variant}`;
  return <button type="button" {...props} className={`btn${v}${className ? ` ${className}` : ""}`} />;
}
