import React from "react";

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: number | string;
}

export function Card({ children, style, padding = 16 }: CardProps) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
