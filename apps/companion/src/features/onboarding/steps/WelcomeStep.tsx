import { useTranslation } from "react-i18next";
import { Rocket, Upload, FileText, Link } from "lucide-react";
import { Button } from "../../../shared/ui/Button";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation();

  const features = [
    { Icon: Upload, text: t("onboarding.welcome.feature1") },
    { Icon: FileText, text: t("onboarding.welcome.feature2") },
    { Icon: Link, text: t("onboarding.welcome.feature3") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 28 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div
          style={{
            width: 52,
            height: 52,
            background: "var(--primary)",
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            color: "#fff",
          }}
        >
          <Rocket size={24} />
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 12,
          }}
        >
          {t("onboarding.welcome.title")}
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--fg-sub)", lineHeight: 1.7, marginBottom: 28 }}>
          {t("onboarding.welcome.subtitle")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {features.map(({ Icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--fg-muted)",
                  flexShrink: 0,
                }}
              >
                <Icon size={14} />
              </div>
              <span style={{ fontSize: 13, color: "var(--fg-sub)" }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
      <Button onClick={onNext} style={{ width: "100%", justifyContent: "center", marginTop: 24 }}>
        {t("onboarding.welcome.getStarted")}
      </Button>
    </div>
  );
}
