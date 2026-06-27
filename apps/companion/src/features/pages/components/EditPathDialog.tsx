import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "../../../shared/ui/Dialog";
import { Input } from "../../../shared/ui/Input";
import { Button } from "../../../shared/ui/Button";
import { useToast } from "../../../shared/ui/Toast";
import { pathSchema } from "../../../shared/lib/validation";
import { renamePage } from "../pages.service";
import { extractErrorMessage } from "../../../shared/api/errors";
import type { Page } from "../pages.schema";

interface Props {
  page: Page;
  open: boolean;
  onClose: () => void;
}

export function EditPathDialog({ page, open, onClose }: Props) {
  const { t } = useTranslation();
  const [newPath, setNewPath] = useState("/" + page.path);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mut = useMutation({
    mutationFn: () =>
      renamePage("/" + page.path, newPath, page.url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast("success", t("pages.pathUpdated"));
      onClose();
    },
    onError: (err) => {
      setError(extractErrorMessage(err));
    },
  });

  function handleConfirm() {
    if (newPath === "/" + page.path) { onClose(); return; }
    const result = pathSchema().safeParse(newPath);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? t("editPath.invalidPath"));
      return;
    }
    setError("");
    mut.mutate();
  }

  return (
    <Dialog
      open={open}
      onClose={() => { if (!mut.isPending) onClose(); }}
      title={t("editPath.title")}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={mut.isPending}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={handleConfirm} loading={mut.isPending}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <Input
        label={t("editPath.newPathLabel")}
        value={newPath}
        onChange={(e) => { setNewPath(e.target.value); setError(""); }}
        onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
        error={error}
        style={{ fontFamily: "var(--mono)", fontSize: 13 }}
        autoFocus
      />
      <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.5 }}>
        {t("editPath.description")}
      </div>
    </Dialog>
  );
}
