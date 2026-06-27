import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { StepBadge } from "./ApiUrlStep";
import { testAuth } from "../../../shared/api/client";
import { setApiKey } from "../../settings/settings.service";

interface Props {
  apiUrl: string;
  onNext: () => void;
  onBack: () => void;
}

export function ApiKeyStep({ apiUrl, onNext, onBack }: Props) {
  const { t } = useTranslation();
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "ok" | "fail">("idle");

  async function handleNext() {
    if (!key.trim()) {
      setError(t("onboarding.apiKey.keyRequired"));
      return;
    }
    setError("");
    setTesting(true);
    setTestStatus("idle");
    const check = await testAuth(apiUrl, key.trim());
    setTesting(false);
    if (!check.ok) {
      setTestStatus("fail");
      setError(check.error ?? t("onboarding.apiKey.authFailed"));
      return;
    }
    setTestStatus("ok");
    try {
      await setApiKey(key.trim());
    } catch (err) {
      setTesting(false);
      setError(t("onboarding.apiKey.failedToStore", { error: err instanceof Error ? err.message : String(err) }));
      return;
    }
    onNext();
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
        <StepBadge step={3} total={4} />
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8, marginTop: 12 }}>
          {t("onboarding.apiKey.title")}
        </h2>
        <p style={{ fontSize: 13, color: "var(--fg-sub)", lineHeight: 1.6, marginBottom: 24 }}>
          {t("onboarding.apiKey.description")}
        </p>
        <div style={{ position: "relative" }}>
          <Input
            label={t("onboarding.apiKey.label")}
            type={showKey ? "text" : "password"}
            placeholder={t("onboarding.apiKey.placeholder")}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setError("");
              setTestStatus("idle");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
            error={error}
            autoFocus
            style={{ paddingRight: 40, fontFamily: key && !showKey ? "var(--mono)" : undefined }}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            style={{
              position: "absolute",
              right: 10,
              bottom: error ? 28 : 8,
              background: "none",
              border: "none",
              color: "var(--fg-muted)",
              cursor: "pointer",
              fontSize: 13,
              padding: 2,
            }}
          >
            {showKey ? "🙈" : "👁"}
          </button>
        </div>
        {testStatus === "ok" && (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--success)" }}>
            {t("onboarding.apiKey.authSuccessful")}
          </div>
        )}
        <div
          style={{
            marginTop: 16,
            padding: "10px 12px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            display: "flex",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14 }}>🔒</span>
          <span style={{ fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.5 }}>
            {t("onboarding.apiKey.keyringNote")}
          </span>
        </div>
      </div>
      <Button
        onClick={handleNext}
        loading={testing}
        style={{ width: "100%", justifyContent: "center", marginTop: 24 }}
      >
        {testing ? t("onboarding.apiKey.verifying") : t("common.continue")}
      </Button>
    </div>
  );
}
