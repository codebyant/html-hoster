import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { apiUrlSchema } from "../../../shared/lib/validation";
import { testConnection } from "../../../shared/api/client";
import { saveApiUrl } from "../../settings/settings.service";

interface Props {
  onNext: (url: string) => void;
  onBack: () => void;
  initialUrl?: string;
}

export function ApiUrlStep({ onNext, onBack, initialUrl = "" }: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "ok" | "fail">("idle");

  async function handleNext() {
    const result = apiUrlSchema().safeParse(url.trim());
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? t("onboarding.apiUrl.invalidUrl"));
      return;
    }
    setError("");
    setTesting(true);
    setTestStatus("idle");
    const check = await testConnection(url.trim());
    setTesting(false);
    if (!check.ok) {
      setTestStatus("fail");
      setError(check.error ?? t("settings.connectionFailed"));
      return;
    }
    setTestStatus("ok");
    await saveApiUrl(url.trim());
    onNext(url.trim());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 28 }}>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--fg-muted)",
          cursor: "pointer",
          fontSize: 12,
          textAlign: "left",
          marginBottom: 24,
          padding: 0,
        }}
      >
        {t("common.back")}
      </button>
      <div style={{ flex: 1 }}>
        <StepBadge step={2} total={4} />
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8, marginTop: 12 }}>
          {t("onboarding.apiUrl.title")}
        </h2>
        <p style={{ fontSize: 13, color: "var(--fg-sub)", lineHeight: 1.6, marginBottom: 24 }}>
          {t("onboarding.apiUrl.description")}
        </p>
        <Input
          label={t("onboarding.apiUrl.label")}
          type="url"
          placeholder={t("onboarding.apiUrl.placeholder")}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError("");
            setTestStatus("idle");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleNext()}
          error={error}
          hint={t("onboarding.apiUrl.hint")}
          autoFocus
        />
        {testStatus === "ok" && (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--success)", display: "flex", gap: 6, alignItems: "center" }}>
            {t("onboarding.apiUrl.connectionSuccessful")}
          </div>
        )}
      </div>
      <Button
        onClick={handleNext}
        loading={testing}
        style={{ width: "100%", justifyContent: "center", marginTop: 24 }}
      >
        {testing ? t("onboarding.apiUrl.testingConnection") : t("common.continue")}
      </Button>
    </div>
  );
}

function StepBadge({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            height: 3,
            flex: 1,
            borderRadius: 2,
            background: i < step ? "var(--primary)" : "var(--border-h)",
            transition: "background .2s",
          }}
        />
      ))}
    </div>
  );
}

export { StepBadge };
