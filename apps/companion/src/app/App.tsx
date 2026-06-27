import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Upload, FileText, Settings as SettingsIcon, type LucideIcon, X } from "lucide-react";
import { OnboardingFlow } from "../features/onboarding/OnboardingFlow";
import { UploadView } from "../features/upload/UploadView";
import { PagesView } from "../features/pages/PagesView";
import { SettingsView } from "../features/settings/SettingsView";
import { loadSettings } from "../features/settings/settings.service";

type Route = "upload" | "pages" | "settings";
type Mode = "mini" | "expanded";

const MINI_HEIGHT = 350;
const MINI_WINDOW_WIDTH = 300;
const EXPANDED_HEIGHT = 600;
const WINDOW_WIDTH = 380;
const ONBOARDING_WIDTH = 460;
const ONBOARDING_HEIGHT = 560;

function resizeTo(height: number, width: number = WINDOW_WIDTH) {
  invoke("resize_window", { width, height }).catch(() => null);
}

export function App() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const onboardingDoneRef = useRef<boolean | null>(null);
  const [route, setRoute] = useState<Route>("upload");
  const [mode, setMode] = useState<Mode>("mini");

  useEffect(() => {
    onboardingDoneRef.current = onboardingDone;
  }, [onboardingDone]);

  useEffect(() => {
    loadSettings()
      .then((s) => {
        setOnboardingDone(s.onboarding_completed);
        onboardingDoneRef.current = s.onboarding_completed;
        if (s.global_shortcut) {
          invoke("register_shortcut", { shortcut: s.global_shortcut }).catch(() => null);
        }
      })
      .catch(() => {
        setOnboardingDone(false);
        onboardingDoneRef.current = false;
      });
  }, []);

  // Reset to mini when tray icon is clicked to show window
  // Rust already repositioned the window near the tray before emitting.
  // During onboarding, override: show centered at onboarding size instead.
  useEffect(() => {
    const unlisten = listen("tray-open", () => {
      if (onboardingDoneRef.current !== true) {
        invoke("resize_window", { width: ONBOARDING_WIDTH, height: ONBOARDING_HEIGHT }).catch(() => null);
        getCurrentWindow().center().catch(() => null);
      } else {
        setMode("mini");
        resizeTo(MINI_HEIGHT, MINI_WINDOW_WIDTH);
        getCurrentWindow().setAlwaysOnTop(true).catch(() => null);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Listen for tray "Settings" menu event
  useEffect(() => {
    const unlisten = listen<string>("navigate", (event) => {
      const target = event.payload as Route;
      if (target === "settings" || target === "upload" || target === "pages") {
        setRoute(target);
        setMode("expanded");
        resizeTo(EXPANDED_HEIGHT);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  function doHideAndReset() {
    setMode("mini");
    getCurrentWindow().hide().then(() => {
      resizeTo(MINI_HEIGHT, MINI_WINDOW_WIDTH);
    }).catch(() => null);
  }

  // Reset to mini when window is hidden from Rust side (shortcut or OS close)
  useEffect(() => {
    const unlisten = listen("window-hide", () => {
      setMode("mini");
      resizeTo(MINI_HEIGHT, MINI_WINDOW_WIDTH);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Escape key hides the window and resets to mini
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") doHideAndReset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function handleExpand() {
    setMode("expanded");
    invoke("expand_window", { width: WINDOW_WIDTH, height: EXPANDED_HEIGHT }).catch(() => null);
    getCurrentWindow().setAlwaysOnTop(false).catch(() => null);
  }

  if (onboardingDone === null) {
    return (
      <AppShell onHide={doHideAndReset}>
        <LoadingSpinner />
      </AppShell>
    );
  }

  if (!onboardingDone) {
    return (
      <AppShell noNav onHide={doHideAndReset}>
        <OnboardingFlow onComplete={() => {
          setOnboardingDone(true);
          onboardingDoneRef.current = true;
          setMode("mini");
          getCurrentWindow().hide().then(() => {
            resizeTo(MINI_HEIGHT, MINI_WINDOW_WIDTH);
          }).catch(() => null);
        }} />
      </AppShell>
    );
  }

  if (mode === "mini") {
    return <UploadView mini onExpand={handleExpand} />;
  }

  return (
    <AppShell route={route} onNavigate={setRoute} onHide={doHideAndReset}>
      {route === "upload" && <UploadView />}
      {route === "pages" && <PagesView />}
      {route === "settings" && <SettingsView onNavigate={setRoute} />}
    </AppShell>
  );
}

function LoadingSpinner() {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--fg-muted)", fontSize: 13 }}>
      {t("common.loading")}
    </div>
  );
}

interface ShellProps {
  children: React.ReactNode;
  noNav?: boolean;
  route?: Route;
  onNavigate?: (r: Route) => void;
  onHide?: () => void;
}

function AppShell({ children, noNav, route, onNavigate, onHide }: ShellProps) {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      <TitleBar onHide={onHide} />
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      {!noNav && route && onNavigate && (
        <BottomNav route={route} onNavigate={onNavigate} />
      )}
    </div>
  );
}

function TitleBar({ onHide }: { onHide?: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      data-tauri-drag-region
      style={{
        height: 40,
        background: "var(--bg-2)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 22,
            height: 22,
            background: "var(--primary)",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontFamily: "var(--mono)",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          &lt;/&gt;
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg-sub)", letterSpacing: "-0.01em" }}>
          html-hoster
        </span>
      </div>
      <button
        onClick={() => onHide ? onHide() : getCurrentWindow().hide().catch(() => null)}
        title={t("titleBar.hide")}
        style={{
          background: "none",
          border: "none",
          color: "var(--fg-muted)",
          cursor: "pointer",
          lineHeight: 1,
          padding: 4,
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

type NavItem = { id: Route; labelKey: string; Icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { id: "upload", labelKey: "nav.upload", Icon: Upload },
  { id: "pages", labelKey: "nav.pages", Icon: FileText },
  { id: "settings", labelKey: "nav.settings", Icon: SettingsIcon },
];

function BottomNav({ route, onNavigate }: { route: Route; onNavigate: (r: Route) => void }) {
  const { t } = useTranslation();
  return (
    <nav
      style={{
        height: 48,
        background: "var(--bg-2)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexShrink: 0,
      }}
    >
      {NAV_ITEMS.map(({ id, labelKey, Icon }) => {
        const active = route === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              color: active ? "var(--primary)" : "var(--fg-muted)",
              fontSize: 9.5,
              fontFamily: "var(--font)",
              fontWeight: active ? 600 : 400,
              transition: "color .15s",
              position: "relative",
            }}
          >
            {active && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "25%",
                  right: "25%",
                  height: 2,
                  background: "var(--primary)",
                  borderRadius: "0 0 2px 2px",
                }}
              />
            )}
            <Icon size={15} />
            <span style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>{t(labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
