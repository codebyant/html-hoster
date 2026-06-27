import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "../../../shared/ui/Dialog";
import { useToast } from "../../../shared/ui/Toast";
import { deletePage } from "../pages.service";
import { extractErrorMessage } from "../../../shared/api/errors";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { loadSettings } from "../../settings/settings.service";
import type { Page } from "../pages.schema";

interface Props {
  page: Page;
  open: boolean;
  onClose: () => void;
}

export function DeletePageDialog({ page, open, onClose }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mut = useMutation({
    mutationFn: () => deletePage("/" + page.path),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast("success", t("pages.pageDeleted"));
      const settings = await loadSettings().catch(() => null);
      if (settings?.notifications_enabled ?? true) {
        try { sendNotification({ title: t("pages.pageDeleted"), body: page.path }); } catch { /* noop */ }
      }
      onClose();
    },
    onError: (err) => toast("error", extractErrorMessage(err)),
  });

  return (
    <ConfirmDialog
      open={open}
      onClose={() => { if (!mut.isPending) onClose(); }}
      onConfirm={() => mut.mutate()}
      title={t("deletePage.title")}
      message={t("deletePage.message", { path: page.path })}
      confirmLabel={t("deletePage.confirm")}
      loading={mut.isPending}
    />
  );
}
