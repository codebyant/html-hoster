import React, { useState } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
}

export function Input({ label, error, hint, prefix, style, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? focused ? "rgba(239,68,68,0.8)" : "rgba(239,68,68,0.5)"
    : focused ? "var(--border-h)" : "var(--border)";

  const baseInputStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    color: "var(--fg)",
    fontFamily: "var(--font)",
    fontSize: 13.5,
    outline: "none",
    width: "100%",
    ...style,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-sub)", letterSpacing: "0.01em" }}>
          {label}
        </label>
      )}

      {prefix ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--bg-2)",
            border: `1px solid ${borderColor}`,
            borderRadius: 9,
            transition: "border-color .15s",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              padding: "8px 4px 8px 12px",
              color: "var(--fg-muted)",
              fontFamily: "var(--mono)",
              fontSize: 13.5,
              userSelect: "none",
              flexShrink: 0,
              lineHeight: 1.5,
            }}
          >
            {prefix}
          </span>
          <input
            {...props}
            style={{ ...baseInputStyle, padding: "8px 12px 8px 2px" }}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          />
        </div>
      ) : (
        <input
          {...props}
          style={{
            background: "var(--bg-2)",
            border: `1px solid ${borderColor}`,
            borderRadius: 9,
            color: "var(--fg)",
            fontFamily: "var(--font)",
            fontSize: 13.5,
            padding: "8px 12px",
            outline: "none",
            transition: "border-color .15s",
            width: "100%",
            ...style,
          }}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        />
      )}

      {error && <span style={{ fontSize: 11.5, color: "var(--error)" }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>{hint}</span>}
    </div>
  );
}
