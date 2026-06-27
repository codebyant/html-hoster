import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Lock, Eye, EyeOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { useToast } from "../../shared/ui/Toast";
import { Card } from "../../shared/ui/Card";
import { ConfirmDialog } from "../../shared/ui/Dialog";
import {
  loadSettings,
  saveApiUrl,
  setApiKey,
  deleteApiKey,
  saveAfterUploadAction,
  saveNotificationsEnabled,
  saveAutostartEnabled,
  saveGlobalShortcut,
  saveLanguage,
} from "./settings.service";
import { SUPPORTED_LANGUAGES } from "../../shared/lib/i18n";
import { invoke } from "@tauri-apps/api/core";
import i18next from "../../shared/lib/i18n";
import { testConnection, testAuth } from "../../shared/api/client";
import { apiUrlSchema } from "../../shared/lib/validation";
import type { Settings } from "./settings.schema";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import { getVersion } from "@tauri-apps/api/app";
import { openExternal } from "../../shared/lib/openExternal";

interface Props {
  onNavigate: (route: "upload" | "pages" | "settings") => void;
}

export function SettingsView({ onNavigate: _nav }: Props) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [apiUrl, setApiUrlLocal] = useState("");
  const [urlError, setUrlError] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<"idle" | "ok" | "fail">("idle");

  const [newKey, setNewKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const [deleteKeyOpen, setDeleteKeyOpen] = useState(false);
  const [deletingKey, setDeletingKey] = useState(false);

  const [updateStatus, setUpdateStatus] = useState<"idle" | "checking" | "available" | "none" | "error">("idle");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setApiUrlLocal(s.api_url);
    });
  }, []);

  async function handleSaveUrl() {
    const result = apiUrlSchema().safeParse(apiUrl.trim());
    if (!result.success) {
      setUrlError(result.error.issues[0]?.message ?? t("settings.invalidUrl"));
      return;
    }
    setSavingUrl(true);
    await saveApiUrl(apiUrl.trim());
    queryClient.invalidateQueries();
    setSavingUrl(false);
    setUrlError("");
    toast("success", t("settings.apiUrlSaved"));
  }

  async function handleTestConnection() {
    const result = apiUrlSchema().safeParse(apiUrl.trim());
    if (!result.success) { setUrlError(result.error.issues[0]?.message ?? t("settings.invalidUrl")); return; }
    setTestingConn(true);
    setConnStatus("idle");
    const check = await testConnection(apiUrl.trim());
    setTestingConn(false);
    setConnStatus(check.ok ? "ok" : "fail");
    if (!check.ok) setUrlError(check.error ?? t("settings.connectionFailed"));
  }

  async function handleSaveKey() {
    if (!newKey.trim()) { setKeyError(t("settings.keyRequired")); return; }
    if (!settings?.api_url) { setKeyError(t("settings.saveUrlFirst")); return; }
    setSavingKey(true);
    const check = await testAuth(settings.api_url, newKey.trim());
    if (!check.ok) {
      setSavingKey(false);
      setKeyError(check.error ?? t("settings.authFailed"));
      return;
    }
    try {
      await setApiKey(newKey.trim());
    } catch (err) {
      setSavingKey(false);
      setKeyError(t("settings.keyringError", { error: err instanceof Error ? err.message : String(err) }));
      return;
    }
    queryClient.invalidateQueries();
    setSavingKey(false);
    setNewKey("");
    setKeyError("");
    setSettings((s) => s ? { ...s, api_key_stored: true } : s);
    toast("success", t("settings.keyUpdated"));
  }

  async function handleDeleteKey() {
    setDeletingKey(true);
    await deleteApiKey();
    setSettings((s) => s ? { ...s, api_key_stored: false } : s);
    setDeletingKey(false);
    setDeleteKeyOpen(false);
    queryClient.invalidateQueries();
    toast("info", t("settings.keyRemoved"));
  }

  async function handleCheckUpdate() {
    setUpdateStatus("checking");
    try {
      const update = await checkUpdate();
      if (update) {
        setUpdateStatus("available");
        toast("info", t("settings.updateAvailableToast", { version: update.version }));
      } else {
        setUpdateStatus("none");
      }
    } catch {
      setUpdateStatus("error");
      toast("error", t("settings.failedToCheckUpdates"));
    }
  }

  if (!settings) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--fg-muted)", fontSize: 13 }}>
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="scrollable" style={{ height: "100%", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* API URL */}
      <Section title={t("settings.apiConnection")}>
        <Input
          label={t("settings.apiUrlLabel")}
          value={apiUrl}
          onChange={(e) => { setApiUrlLocal(e.target.value); setUrlError(""); setConnStatus("idle"); }}
          error={urlError}
          placeholder={t("settings.apiUrlPlaceholder")}
        />
        {connStatus === "ok" && (
          <div style={{ fontSize: 11.5, color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
            <Check size={12} /> {t("settings.connectionOk")}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" size="sm" onClick={handleTestConnection} loading={testingConn} style={{ flex: 1, justifyContent: "center" }}>
            {t("settings.testConnection")}
          </Button>
          <Button size="sm" onClick={handleSaveUrl} loading={savingUrl} style={{ flex: 1, justifyContent: "center" }}>
            {t("settings.saveUrl")}
          </Button>
        </div>
      </Section>

      {/* API Key */}
      <Section title={t("settings.apiKey")}>
        {settings.api_key_stored && (
          <div style={{ fontSize: 12, color: "var(--success)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <Lock size={12} /> {t("settings.keyStored")}
          </div>
        )}
        <div style={{ position: "relative" }}>
          <Input
            label={t("settings.newApiKeyLabel")}
            type={showKey ? "text" : "password"}
            placeholder={t("settings.newKeyPlaceholder")}
            value={newKey}
            onChange={(e) => { setNewKey(e.target.value); setKeyError(""); }}
            error={keyError}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            style={{ position: "absolute", right: 10, bottom: keyError ? 28 : 8, background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="sm" onClick={handleSaveKey} loading={savingKey} style={{ flex: 1, justifyContent: "center" }}>
            {t("settings.updateKey")}
          </Button>
          {settings.api_key_stored && (
            <Button variant="danger" size="sm" onClick={() => setDeleteKeyOpen(true)} style={{ flex: 1, justifyContent: "center" }}>
              {t("settings.removeKey")}
            </Button>
          )}
        </div>
      </Section>

      {/* Behavior */}
      <Section title={t("settings.afterUpload")}>
        {(["open", "copy", "nothing"] as const).map((action) => (
          <RadioRow
            key={action}
            label={{
              open: t("settings.openInBrowser"),
              copy: t("settings.copyToClipboard"),
              nothing: t("settings.doNothing"),
            }[action]}
            checked={settings.after_upload_action === action}
            onChange={async () => {
              await saveAfterUploadAction(action);
              setSettings((s) => s ? { ...s, after_upload_action: action } : s);
            }}
          />
        ))}
      </Section>

      {/* System */}
      <Section title={t("settings.system")}>
        <LanguageSelector
          value={settings.language}
          onChange={async (lang) => {
            await i18next.changeLanguage(lang || undefined);
            await saveLanguage(lang);
            setSettings((s) => s ? { ...s, language: lang } : s);
            toast("success", t("language.changed"));
          }}
        />
        <ToggleRow
          label={t("settings.desktopNotifications")}
          checked={settings.notifications_enabled}
          onChange={async (v) => {
            await saveNotificationsEnabled(v);
            setSettings((s) => s ? { ...s, notifications_enabled: v } : s);
          }}
        />
        <ToggleRow
          label={t("settings.startWithSystem")}
          checked={settings.autostart_enabled}
          onChange={async (v) => {
            await saveAutostartEnabled(v);
            setSettings((s) => s ? { ...s, autostart_enabled: v } : s);
          }}
        />
        <div>
          <div style={{ fontSize: 12, color: "var(--fg-sub)", marginBottom: 6 }}>
            {t("settings.shortcutLabel")}
          </div>
          <ShortcutRecorder
            value={settings.global_shortcut}
            onChange={async (shortcut) => {
              const result = await invoke<string | null>("register_shortcut", { shortcut }).catch((e: unknown) => String(e));
              if (typeof result === "string" && result !== null) {
                toast("error", t("settings.invalidShortcut", { error: result }));
                return;
              }
              await saveGlobalShortcut(shortcut);
              setSettings((s) => s ? { ...s, global_shortcut: shortcut } : s);
              toast("success", shortcut ? t("settings.shortcutSaved") : t("settings.shortcutCleared"));
            }}
          />
        </div>
      </Section>

      {/* Updates */}
      <Section title={t("settings.updates")}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button variant="outline" size="sm" onClick={handleCheckUpdate} loading={updateStatus === "checking"} style={{ flex: 1, justifyContent: "center" }}>
            {t("settings.checkForUpdates")}
          </Button>
          {updateStatus === "none" && <span style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>{t("settings.upToDate")}</span>}
          {updateStatus === "available" && <span style={{ fontSize: 11.5, color: "var(--success)" }}>{t("settings.updateAvailable")}</span>}
          {updateStatus === "error" && <span style={{ fontSize: 11.5, color: "var(--error)" }}>{t("settings.checkFailed")}</span>}
        </div>
      </Section>

      {/* About */}
      <AboutSection />

      <ConfirmDialog
        open={deleteKeyOpen}
        onClose={() => setDeleteKeyOpen(false)}
        onConfirm={handleDeleteKey}
        title={t("settings.removeKeyTitle")}
        message={t("settings.removeKeyMessage")}
        confirmLabel={t("common.remove")}
        loading={deletingKey}
      />
    </div>
  );
}

const GITHUB_URL = "https://github.com/codebyant/html-hoster";

function AboutSection() {
  const { t } = useTranslation();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => null);
  }, []);

  return (
    <Section title={t("about.title")}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            background: "var(--primary)",
            borderRadius: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontFamily: "var(--mono)",
            color: "#fff",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          &lt;/&gt;
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
            html-hoster Companion
          </div>
          <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 2 }}>
            {version ? t("about.version", { version }) : "…"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--success)",
            background: "rgba(134,239,172,0.1)",
            border: "1px solid rgba(134,239,172,0.2)",
            borderRadius: 4,
            padding: "2px 6px",
            letterSpacing: "0.02em",
          }}
        >
          {t("about.openSource")}
        </span>
        <span style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>
          {t("about.license")}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => openExternal(GITHUB_URL)}
        style={{ justifyContent: "center", gap: 6 }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
        {t("about.viewOnGitHub")}
      </Button>

      <div style={{ fontSize: 11, color: "var(--fg-muted)", textAlign: "center" }}>
        {t("about.copyright")}
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-muted)", marginBottom: 8 }}>
        {title}
      </div>
      <Card padding={12}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {children}
        </div>
      </Card>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, color: "var(--fg-sub)" }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 38,
          height: 22,
          borderRadius: 11,
          border: "none",
          background: checked ? "var(--primary)" : "rgba(255,255,255,0.1)",
          position: "relative",
          cursor: "pointer",
          transition: "background .15s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 19 : 3,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            transition: "left .15s",
          }}
        />
      </button>
    </div>
  );
}

function codeToKey(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F\d+$/.test(code)) return code;
  const map: Record<string, string> = {
    Space: "Space", Tab: "Tab", Enter: "Enter", Backspace: "Backspace",
    Delete: "Delete", Insert: "Insert", Home: "Home", End: "End",
    PageUp: "PageUp", PageDown: "PageDown",
    ArrowUp: "ArrowUp", ArrowDown: "ArrowDown",
    ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight",
  };
  return map[code] ?? null;
}

function ShortcutRecorder({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recording) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        setRecording(false);
        setPending(null);
        return;
      }

      if (["Control", "Shift", "Alt", "Meta", "Super"].includes(e.key)) return;

      const mods: string[] = [];
      if (e.ctrlKey) mods.push("Control");
      if (e.metaKey) mods.push("Super");
      if (e.altKey) mods.push("Alt");
      if (e.shiftKey) mods.push("Shift");
      if (mods.length === 0) return;

      const key = codeToKey(e.code);
      if (!key) return;

      setPending([...mods, key].join("+"));
      setRecording(false);
    };

    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, [recording]);

  async function handleSave() {
    if (pending === null) return;
    setSaving(true);
    await onChange(pending);
    setSaving(false);
    setPending(null);
  }

  const display = pending ?? value;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div
          style={{
            flex: 1,
            padding: "5px 10px",
            borderRadius: 6,
            border: `1px solid ${recording ? "var(--primary)" : "var(--border-h)"}`,
            background: recording ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.04)",
            fontSize: 12,
            fontFamily: "monospace",
            color: recording ? "var(--primary)" : display ? "var(--fg)" : "var(--fg-muted)",
            minHeight: 28,
            display: "flex",
            alignItems: "center",
          }}
        >
          {recording ? t("settings.pressKeys") : display || t("settings.notSet")}
        </div>
        <Button
          size="sm"
          variant={recording ? "danger" : "outline"}
          onClick={() => { setRecording((r) => !r); setPending(null); }}
        >
          {recording ? t("settings.cancelRecord") : t("settings.record")}
        </Button>
      </div>
      {pending !== null && (
        <div style={{ display: "flex", gap: 6 }}>
          <Button size="sm" onClick={handleSave} loading={saving} style={{ flex: 1, justifyContent: "center" }}>
            {t("common.save")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setPending(null)} style={{ flex: 1, justifyContent: "center" }}>
            {t("settings.discardShortcut")}
          </Button>
        </div>
      )}
      {value && pending === null && (
        <Button size="sm" variant="outline" onClick={() => onChange("")} style={{ justifyContent: "center" }}>
          {t("settings.clearShortcut")}
        </Button>
      )}
    </div>
  );
}

function LanguageSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (lang: string) => Promise<void>;
}) {
  const { t } = useTranslation();

  const labels: Record<string, string> = {
    "": t("language.auto"),
    "en": "English",
    "pt-BR": "Português (Brasil)",
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--fg-sub)", marginBottom: 8 }}>
        {t("language.label")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SUPPORTED_LANGUAGES.map(({ code }) => (
          <RadioRow
            key={code}
            label={labels[code] ?? code}
            checked={value === code}
            onChange={() => onChange(code)}
          />
        ))}
      </div>
    </div>
  );
}

function RadioRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: `2px solid ${checked ? "var(--primary)" : "var(--border-h)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "border-color .15s",
        }}
      >
        {checked && (
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }} />
        )}
      </div>
      <span style={{ fontSize: 13, color: "var(--fg-sub)" }}>{label}</span>
    </div>
  );
}
