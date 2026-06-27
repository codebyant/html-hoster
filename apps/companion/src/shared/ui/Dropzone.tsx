import { useTranslation } from "react-i18next";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, ArrowDown } from "lucide-react";
import { MAX_HTML_BYTES } from "../lib/validation";

interface DropzoneProps {
  onFile: (file: File) => void;
  onError: (msg: string) => void;
  file: File | null;
  disabled?: boolean;
}

export function Dropzone({ onFile, onError, file, disabled }: DropzoneProps) {
  const { t } = useTranslation();
  const maxMB = MAX_HTML_BYTES / 1024 / 1024;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    disabled,
    maxFiles: 1,
    maxSize: MAX_HTML_BYTES,
    accept: { "text/html": [".html"] },
    onDropAccepted: ([f]) => {
      if (!f) return;
      if (!f.name.endsWith(".html")) {
        onError(t("dropzone.onlyHtml"));
        return;
      }
      onFile(f);
    },
    onDropRejected: (rejections) => {
      const reason = rejections[0]?.errors[0];
      if (reason?.code === "file-too-large") {
        onError(t("dropzone.fileTooLarge", { maxMB }));
      } else if (reason?.code === "file-invalid-type") {
        onError(t("dropzone.onlyHtml"));
      } else {
        onError(reason?.message ?? t("dropzone.invalidFile"));
      }
    },
  });

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${
          isDragActive ? "var(--primary)" : "var(--border-h)"
        }`,
        borderRadius: "var(--radius)",
        padding: "20px 16px",
        textAlign: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        background: isDragActive ? "var(--primary-glow)" : "transparent",
        transition: "all .15s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input {...getInputProps()} />
      {file ? (
        <div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 6, color: "var(--fg-muted)" }}>
            <FileText size={22} />
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--fg)",
              fontFamily: "var(--mono)",
              wordBreak: "break-all",
            }}
          >
            {file.name}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 4 }}>
            {(file.size / 1024).toFixed(1)} KB · {t("dropzone.clickOrDragToReplace")}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: isDragActive ? "var(--primary)" : "var(--fg-muted)" }}>
            {isDragActive ? <ArrowDown size={26} /> : <Upload size={26} />}
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-sub)" }}>
            {isDragActive ? t("dropzone.dropHere") : t("dropzone.dragHtml")}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 4 }}>
            {t("dropzone.clickToSelect", { maxMB })}
          </div>
        </div>
      )}
    </div>
  );
}
