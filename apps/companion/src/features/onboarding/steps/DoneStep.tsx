import { useTranslation } from "react-i18next";
import { CheckCircle, Lightbulb } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import { StepBadge } from "./ApiUrlStep";

export function DoneStep({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 28 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <StepBadge step={4} total={4} />
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(134,239,172,0.12)",
            border: "1px solid rgba(134,239,172,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(134,239,172,0.9)",
            margin: "24px 0 20px",
          }}
        >
          <CheckCircle size={26} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 10 }}>
          {t("onboarding.done.title")}
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--fg-sub)", lineHeight: 1.7 }}>
          {t("onboarding.done.description")}
        </p>
        <div
          style={{
            marginTop: 20,
            padding: "12px 14px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            fontSize: 12,
            color: "var(--fg-muted)",
            lineHeight: 1.6,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          {t("onboarding.done.tip")}
        </div>
      </div>
      <Button
        onClick={onDone}
        style={{ width: "100%", justifyContent: "center", marginTop: 24 }}
      >
        {t("onboarding.done.startButton")}
      </Button>
    </div>
  );
}
