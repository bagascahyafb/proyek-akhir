"use client";

// components/CustomModal.tsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { LoadingTwotoneLoop } from "./icons";

// --- 1. CUSTOM HOOK UNTUK LOGIC MODAL ---
export function useModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "alert" | "confirm" | "success";
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
  }>({ isOpen: false, title: "", message: "", type: "alert" });

  const showAlert = (title: string, message: string) => {
    setModalState({ isOpen: true, title, message, type: "alert" });
  };

  const showSuccess = (title: string, message: string) => {
    setModalState({ isOpen: true, title, message, type: "success" });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    labels?: { confirmLabel?: string; cancelLabel?: string }
  ) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: "confirm",
      onConfirm,
      onCancel,
      confirmLabel: labels?.confirmLabel,
      cancelLabel: labels?.cancelLabel,
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return {
    modalProps: { ...modalState, onClose: closeModal },
    showAlert,
    showSuccess,
    showConfirm,
  };
}

// --- 2. KOMPONEN UI MODAL ---
interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: "alert" | "confirm" | "success";
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
}

export function CustomModal({ isOpen, title, message, type, onConfirm, onCancel, confirmLabel, cancelLabel, onClose }: ModalProps) {
  if (!isOpen || typeof document === "undefined") return null;

  const modalTone = {
    alert: {
      badge: "Perlu perhatian",
      badgeClass: "bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] text-[color-mix(in_oklab,var(--foreground)_78%,white)] border-[color-mix(in_oklab,var(--color-soft)_75%,white)]",
      titleClass: "text-[var(--foreground)]",
      actionClass: "bg-[var(--color-accent)] hover:bg-[color-mix(in_oklab,var(--color-accent)_82%,black)] text-white",
      iconWrapClass: "bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] border-[color-mix(in_oklab,var(--color-soft)_55%,white)]",
      iconClass: "text-[var(--color-accent)]",
    },
    confirm: {
      badge: "Butuh konfirmasi",
      badgeClass: "bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] text-[color-mix(in_oklab,var(--foreground)_78%,white)] border-[color-mix(in_oklab,var(--color-soft)_75%,white)]",
      titleClass: "text-[var(--foreground)]",
      actionClass: "bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] text-white",
      iconWrapClass: "bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] border-[color-mix(in_oklab,var(--color-soft)_55%,white)]",
      iconClass: "text-[var(--color-primary)]",
    },
    success: {
      badge: "Berhasil",
      badgeClass: "bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] text-[var(--color-primary)] border-[color-mix(in_oklab,var(--color-soft)_55%,white)]",
      titleClass: "text-[color-mix(in_oklab,var(--foreground)_92%,black)]",
      actionClass: "bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] text-white",
      iconWrapClass: "bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] border-[color-mix(in_oklab,var(--color-soft)_55%,white)]",
      iconClass: "text-[var(--color-primary)]",
    },
  }[type];

  return createPortal(
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-opacity">
      <div className="max-h-[min(90vh,620px)] w-full max-w-sm overflow-y-auto rounded-2xl border border-[color-mix(in_oklab,var(--color-soft)_55%,white)] bg-[color-mix(in_oklab,var(--color-surface)_94%,white)] p-6 shadow-[0_18px_40px_rgba(2,6,23,0.28)] animate-fade-in-up">
        <div className={`mb-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${modalTone.badgeClass}`}>
          {modalTone.badge}
        </div>
        {type === "success" && (
          <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full border ${modalTone.iconWrapClass}`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-5 w-5 ${modalTone.iconClass}`}
              aria-hidden="true"
            >
              <path d="M20 7 9 18l-5-5" />
            </svg>
          </div>
        )}
        <h3 className={`text-xl font-extrabold mb-3 ${modalTone.titleClass}`}>
          {title}
        </h3>
        <p className="text-[color-mix(in_oklab,var(--foreground)_78%,white)] mb-6 whitespace-pre-wrap text-sm leading-relaxed">
          {message}
        </p>
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          {type === "confirm" && (
            <button 
              type="button"
              onClick={() => {
                if (onCancel) onCancel();
                onClose();
              }} 
              className="cursor-pointer rounded-xl border border-[color-mix(in_oklab,var(--color-soft)_75%,white)] bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] px-5 py-2.5 font-bold text-[color-mix(in_oklab,var(--foreground)_78%,white)] transition hover:bg-[color-mix(in_oklab,var(--color-soft)_55%,white)]"
            >
              {cancelLabel || "Batal"}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose(); // Tutup modal setelah OK diklik
            }}
            className={`cursor-pointer rounded-xl px-5 py-2.5 font-bold transition ${modalTone.actionClass}`}
          >
            {type === "confirm" ? confirmLabel || "Ya, lanjut" : type === "success" ? "Selesai" : "Mengerti"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function BuilderLoadingOverlay({
  message,
  progress,
}: {
  message: string;
  progress?: { percent: number; label?: string } | null;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[color-mix(in_oklab,var(--color-soft)_55%,white)] bg-[color-mix(in_oklab,var(--color-surface)_94%,white)] p-6 text-center shadow-[0_18px_40px_rgba(2,6,23,0.28)]">
        <LoadingTwotoneLoop className="mx-auto mb-4 h-12 w-12 animate-spin text-[var(--color-primary)]" />
        <p className="text-base font-bold text-[var(--foreground)]">{message}</p>
        {progress && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[color-mix(in_oklab,var(--foreground)_68%,white)]">
              <span>{progress.label || "Memproses..."}</span>
              <span>{progress.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-soft)_55%,white)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

