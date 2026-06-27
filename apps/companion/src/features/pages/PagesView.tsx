import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, AlertTriangle, Inbox, RotateCw } from "lucide-react";
import { listPages } from "./pages.service";
import { PageCard } from "./components/PageCard";
import { Button } from "../../shared/ui/Button";

export function PagesView() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["pages"],
    queryFn: listPages,
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--fg-muted)", fontSize: 13 }}>
        {t("pages.loading")}
      </div>
    );
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : t("pages.failedToLoad");
    const isConfig = msg.includes("not configured");
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, padding: 24 }}>
        <div style={{ marginBottom: 4, color: isConfig ? "var(--fg-muted)" : "var(--error)" }}>
          {isConfig ? <KeyRound size={24} /> : <AlertTriangle size={24} />}
        </div>
        <div style={{ fontSize: 13, color: "var(--error)", textAlign: "center" }}>{msg}</div>
        {isConfig && (
          <div style={{ fontSize: 12, color: "var(--fg-muted)", textAlign: "center" }}>
            {t("pages.configHint")}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const pages = data ?? [];

  if (pages.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, padding: 24 }}>
        <div style={{ marginBottom: 4, color: "var(--fg-muted)" }}><Inbox size={32} /></div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{t("pages.noPages")}</div>
        <div style={{ fontSize: 13, color: "var(--fg-muted)", textAlign: "center" }}>
          {t("pages.noPagesHint")}
        </div>
      </div>
    );
  }

  return (
    <div className="scrollable" style={{ height: "100%", padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
          {t("pages.pageCount", { count: pages.length })}
        </span>
        <Button variant="ghost" size="sm" onClick={() => refetch()} style={{ fontSize: 11.5, gap: 4 }}>
          <RotateCw size={11} /> {t("pages.refresh")}
        </Button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pages.map((page) => (
          <PageCard key={page.path} page={page} />
        ))}
      </div>
    </div>
  );
}
