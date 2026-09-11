"use client";

import { cn } from "@/utils/common";
import Button from "./Button";

type ModalSize = "md" | "lg" | "xl";
type ModalVariant = "dialog" | "preview";

const sizeClass: Record<ModalSize, string> = {
  md: "max-w-md",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: ModalVariant;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  preventClose?: boolean;
  className?: string;
  bodyClassName?: string;
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  variant = "dialog",
  size = "lg",
  closeOnBackdrop = true,
  preventClose = false,
  className,
  bodyClassName,
}: ModalProps) {
  if (!open) return null;

  const isPreview = variant === "preview";

  function handleClose() {
    if (preventClose) return;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label={isPreview ? "Close preview" : "Close modal"}
        onClick={() => closeOnBackdrop && handleClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isPreview ? title || "Media preview" : undefined}
        aria-labelledby={!isPreview && title ? "modal-title" : undefined}
        className={cn(
          "relative z-10 flex w-full flex-col",
          isPreview
            ? "max-h-[92vh] w-[min(96vw,1200px)]"
            : cn(
                "max-h-[85vh] rounded-xl border border-slate-700 bg-[#0c0c0f] p-5 shadow-2xl",
                sizeClass[size]
              ),
          className
        )}
      >
        {isPreview ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={preventClose}
            className="absolute right-2 top-2 z-10 border-0 px-2 py-1 text-sm text-white/90 hover:bg-white/10"
            aria-label="Close preview"
          >
            Close
          </Button>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <h3 id="modal-title" className="text-base font-semibold text-white">
              {title}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={preventClose}
              className="border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        )}

        <div
          className={cn(
            isPreview
              ? "max-h-[92vh] overflow-hidden"
              : "mt-4 flex-1 space-y-4 overflow-y-auto pr-1",
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer && !isPreview ? (
          <div className="mt-4 flex justify-end border-t border-slate-800/80 pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
