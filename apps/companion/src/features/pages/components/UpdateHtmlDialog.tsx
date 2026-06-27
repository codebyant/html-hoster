import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "../../../shared/ui/Dialog";
import { Dropzone } from "../../../shared/ui/Dropzone";
import { Button } from "../../../shared/ui/Button";
import { useToast } from "../../../shared/ui/Toast";
import { validateHtmlFile } from "../../upload/upload.schema";
import { uploadPage } from "../../upload/upload.service";
import { extractErrorMessage } from "../../../shared/api/errors";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { loadSettings } from "../../settings/settings.service";
import type { Page } from "../pages.schema";

interface Props {
  page: Page;
  open: boolean;
  onClose: () => void;
}

export function UpdateHtmlDialog({ page, open, onClose }: Props) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mut = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("No file selected");
      return uploadPage("/" + page.path, file);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast("success", t("pages.pageUpdated"));
      const settings = await loadSettings().catch(() => null);
      if (settings?.notifications_enabled ?? true) {
        try { sendNotification({ title: t("pages.pageUpdated"), body: page.path }); } catch { /* noop */ }
      }
      setFile(null);
      onClose();
    },
    onError: (err) => toast("error", extractErrorMessage(err)),
  });

  function handleConfirm() {
    const err = file ? validateHtmlFile(file) : t("pages.noFileSelected");
    if (err) { setFileError(err); return; }
    setFileError("");
    mut.mutate();
  }

  return (
    <Dialog
      open={open}
      onClose={() => { if (!mut.isPending) { setFile(null); onClose(); } }}
      title={t("pages.updateHtml")}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={mut.isPending}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={handleConfirm} loading={mut.isPending}>
            {t("common.update")}
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 12, fontFamily: "var(--mono)" }}>
        /{page.path}
      </div>
      <Dropzone
        file={file}
        onFile={(f) => { setFile(f); setFileError(""); }}
        onError={setFileError}
        disabled={mut.isPending}
      />
      {fileError && (
        <span style={{ fontSize: 11.5, color: "var(--error)", display: "block", marginTop: 6 }}>
          {fileError}
        </span>
      )}
    </Dialog>
  );
}
