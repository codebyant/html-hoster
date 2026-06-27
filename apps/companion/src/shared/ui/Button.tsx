import React from "react";
import { cn } from "../lib/cn";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "none",
  borderRadius: 9,
  fontFamily: "var(--font)",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all .15s",
  whiteSpace: "nowrap",
  outline: "none",
};

const variants: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "var(--primary)",
    color: "#fff",
  },
  outline: {
    background: "transparent",
    color: "var(--fg-sub)",
    border: "1px solid var(--border-h)",
  },
  ghost: {
    background: "transparent",
    color: "var(--fg-sub)",
  },
  danger: {
    background: "rgba(239,68,68,0.15)",
    color: "#fca5a5",
    border: "1px solid rgba(239,68,68,0.25)",
  },
};

const sizes: Record<Size, React.CSSProperties> = {
  sm: { padding: "5px 12px", fontSize: 12 },
  md: { padding: "8px 16px", fontSize: 13.5 },
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  style,
  className: _cls,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        ...base,
        ...variants[variant],
        ...sizes[size],
        opacity: disabled || loading ? 0.5 : 1,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      style={{
        width: 12,
        height: 12,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "currentColor",
        borderRadius: "50%",
        animation: "spin .6s linear infinite",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

// inject keyframe once
if (typeof document !== "undefined") {
  const id = "__companion-spin";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(style);
  }
}

export { cn };
