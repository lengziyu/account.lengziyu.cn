"use client";

import { CircleAlert, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const Icon = tone === "danger" ? CircleAlert : TriangleAlert;
  const panelClassName =
    tone === "danger"
      ? "border-red-100 dark:border-red-400/30"
      : "border-amber-200 dark:border-amber-400/30";
  const iconWrapClassName =
    tone === "danger"
      ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300"
      : "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300";
  const confirmVariant = tone === "danger" ? "danger" : "warning";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        onClick={busy ? undefined : onCancel}
        aria-label="关闭确认弹窗"
      />
      <div className={`relative w-full max-w-lg rounded-3xl border bg-white p-7 shadow-2xl dark:bg-[#1b1c21] ${panelClassName}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${iconWrapClassName}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-textPrimary">{title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.15)] dark:text-textSecondary dark:hover:bg-[rgba(255,255,255,0.05)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-6 text-gray-600 dark:text-textSecondary">{description}</p>

        <div className="mt-7 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={busy}>
            {busy ? "处理中..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
