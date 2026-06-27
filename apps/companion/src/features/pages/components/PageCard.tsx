import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Copy, Trash2 } from "lucide-react";
import { Card } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import { copyToClipboard } from "../../../shared/lib/clipboard";
import { openExternal } from "../../../shared/lib/openExternal";
import { useToast } from "../../../shared/ui/Toast";
import { UpdateHtmlDialog } from "./UpdateHtmlDialog";
import { EditPathDialog } from "./EditPathDialog";
import { DeletePageDialog } from "./DeletePageDialog";
import type { Page } from "../pages.schema";

export function PageCard({ page }: { page: Page }) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [updateOpen, setUpdateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dateStr = (() => {
    try {
      return new Date(page.updated_at).toLocaleDateString(i18n.language, {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      });
    } catch {
      return page.updated_at;
    }
  })();

  return (
    <>
      <Card padding="12px 14px" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontFamily: "var(--mono)",
                color: "var(--fg)",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              /{page.path}
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>
              {t("pages.updatedOn", { date: dateStr })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <ActionBtn title={t("pages.openInBrowser")} onClick={() => openExternal(page.url)}>
              <ExternalLink size={13} />
            </ActionBtn>
            <ActionBtn title={t("pages.copyUrl")} onClick={() => copyToClipboard(page.url).then(() => toast("success", t("common.copied")))}>
              <Copy size={13} />
            </ActionBtn>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="outline" size="sm" onClick={() => setUpdateOpen(true)} style={{ flex: 1, justifyContent: "center", fontSize: 11.5 }}>
            {t("pages.updateHtml")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} style={{ flex: 1, justifyContent: "center", fontSize: 11.5 }}>
            {t("pages.editRoute")}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)} style={{ justifyContent: "center", display: "flex", alignItems: "center" }}>
            <Trash2 size={13} />
          </Button>
        </div>
      </Card>

      <UpdateHtmlDialog page={page} open={updateOpen} onClose={() => setUpdateOpen(false)} />
      <EditPathDialog page={page} open={editOpen} onClose={() => setEditOpen(false)} />
      <DeletePageDialog page={page} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </>
  );
}

function ActionBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid var(--border)",
        borderRadius: 7,
        color: "var(--fg-sub)",
        cursor: "pointer",
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}
