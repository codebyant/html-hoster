import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { X, Maximize2, Shuffle, ExternalLink, Copy } from "lucide-react";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Dropzone } from "../../shared/ui/Dropzone";
import { Card } from "../../shared/ui/Card";
import { useToast } from "../../shared/ui/Toast";
import { pathSchema } from "../../shared/lib/validation";
import { validateHtmlFile } from "./upload.schema";
import { uploadPage } from "./upload.service";
import { extractErrorMessage } from "../../shared/api/errors";
import { loadSettings } from "../settings/settings.service";
import { copyToClipboard } from "../../shared/lib/clipboard";
import { openExternal } from "../../shared/lib/openExternal";
import { useServerConfig } from "./useServerConfig";

function randomPath(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const len = 6 + Math.floor(Math.random() * 4);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const iconBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--fg-muted)",
  cursor: "pointer",
  lineHeight: 1,
  padding: "4px 6px",
  borderRadius: 5,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

interface Props {
  mini?: boolean;
  onExpand?: () => void;
}

export function UploadView({ mini, onExpand }: Props) {
  const { t } = useTranslation();
  const [path, setPath] = useState(randomPath);
  const [pathError, setPathError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const { maxFileSizeBytes } = useServerConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("No file selected");
      return uploadPage("/" + path, file);
    },
    onSuccess: async (result) => {
      setPath(randomPath());
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["pages"] });

      const settings = await loadSettings().catch(() => null);
      const action = settings?.after_upload_action ?? "copy";

      if (action === "copy" && result.url) {
        await copyToClipboard(result.url);
      } else if (action === "open" && result.url) {
        await openExternal(result.url);
      }

      if (settings?.notifications_enabled ?? true) {
        const body = action === "copy"
          ? t("upload.notificationBodyCopied")
          : t("upload.notificationBodyLive", { path });
        try {
          sendNotification({ title: t("upload.notificationSuccess"), body });
        } catch { /* notification not supported */ }
      }

      if (mini) {
        getCurrentWindow().hide().catch(() => null);
      } else {
        setLastUrl(result.url ?? null);
        toast("success", t("upload.success"));
        if (action === "copy") toast("info", t("upload.urlCopied"));
      }
    },
    onError: async (err) => {
      const msg = extractErrorMessage(err);
      if (!mini) toast("error", msg);
      const settings = await loadSettings().catch(() => null);
      if (settings?.notifications_enabled ?? true) {
        try {
          sendNotification({ title: t("upload.notificationFailed"), body: msg });
        } catch { /* notification not supported */ }
      }
    },
  });

  function validate(): boolean {
    let ok = true;
    const pathResult = pathSchema().safeParse("/" + path);
    if (!pathResult.success) {
      setPathError(pathResult.error.issues[0]?.message ?? t("upload.invalidPath"));
      ok = false;
    } else {
      setPathError("");
    }
    if (!file) {
      setFileError(t("upload.noFileSelected"));
      ok = false;
    } else {
      const ferr = validateHtmlFile(file, maxFileSizeBytes);
      if (ferr) { setFileError(ferr); ok = false; }
      else setFileError("");
    }
    return ok;
  }

  function handleSubmit() {
    if (!validate()) return;
    if (!mini) setLastUrl(null);
    uploadMutation.mutate();
  }

  const formContent = (
    <div style={{ flex: 1, padding: mini ? "12px 14px" : "16px 14px", display: "flex", flexDirection: "column", gap: mini ? 10 : 14 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <Input
            label={t("upload.pathLabel")}
            prefix="/"
            placeholder="my-page"
            value={path}
            onChange={(e) => { setPath(e.target.value); setPathError(""); if (!mini) setLastUrl(null); }}
            error={pathError}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={uploadMutation.isPending}
            style={{ fontFamily: "var(--mono)", fontSize: 13 }}
          />
        </div>
        <button
          onClick={() => { setPath(randomPath()); setPathError(""); if (!mini) setLastUrl(null); }}
          title={t("upload.newRandomPath")}
          disabled={uploadMutation.isPending}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--fg-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "11px 10px",
            flexShrink: 0,
          }}
        >
          <Shuffle size={14} />
        </button>
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--fg-sub)", display: "block", marginBottom: 6 }}>
          {t("upload.htmlFileLabel")}
        </label>
        <Dropzone
          file={file}
          onFile={(f) => { setFile(f); setFileError(""); if (!mini) setLastUrl(null); }}
          onError={setFileError}
          disabled={uploadMutation.isPending}
        />
        {fileError && (
          <span style={{ fontSize: 11.5, color: "var(--error)", display: "block", marginTop: 4 }}>
            {fileError}
          </span>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        loading={uploadMutation.isPending}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {uploadMutation.isPending ? t("upload.uploading") : t("upload.uploadButton")}
      </Button>

      {!mini && lastUrl && (
        <Card padding="12px 14px">
          <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginBottom: 6 }}>
            {t("upload.publishedAt")}
          </div>
          <div style={{ fontSize: 12, color: "var(--primary)", fontFamily: "var(--mono)", wordBreak: "break-all", marginBottom: 10 }}>
            {lastUrl}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(lastUrl).then(() => toast("success", t("common.copied")))}
              style={{ flex: 1, justifyContent: "center", gap: 4 }}
            >
              <Copy size={12} /> {t("upload.copyUrl")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openExternal(lastUrl)}
              style={{ flex: 1, justifyContent: "center", gap: 4 }}
            >
              {t("upload.open")} <ExternalLink size={12} />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );

  if (mini) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg)" }}>
        <div style={{
          height: 32,
          background: "var(--bg-2)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 6px",
          flexShrink: 0,
        }}>
          <button style={iconBtn} title={t("common.close")} onClick={() => getCurrentWindow().hide().catch(() => null)}>
            <X size={14} />
          </button>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-muted)", fontFamily: "var(--mono)", letterSpacing: "-0.01em", userSelect: "none" }}>
            &lt;/&gt; html-hoster
          </span>
          <button style={iconBtn} title={t("nav.settings")} onClick={onExpand}>
            <Maximize2 size={14} />
          </button>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <div className="scrollable" style={{ height: "100%" }}>
      {formContent}
    </div>
  );
}
