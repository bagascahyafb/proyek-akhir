// components/CustomModal.tsx
import { useState } from "react";

// --- 1. CUSTOM HOOK UNTUK LOGIC MODAL ---
export function useModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "alert" | "confirm" | "success";
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, title: "", message: "", type: "alert" });

  const showAlert = (title: string, message: string) => {
    setModalState({ isOpen: true, title, message, type: "alert" });
  };

  const showSuccess = (title: string, message: string) => {
    setModalState({ isOpen: true, title, message, type: "success" });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setModalState({ isOpen: true, title, message, type: "confirm", onConfirm, onCancel });
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
  onClose: () => void;
}

export function CustomModal({ isOpen, title, message, type, onConfirm, onCancel, onClose }: ModalProps) {
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black/35 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity">
      <div className="w-full max-w-sm rounded-2xl border border-[color-mix(in_oklab,var(--color-soft)_55%,white)] bg-[color-mix(in_oklab,var(--color-surface)_94%,white)] p-6 shadow-[0_18px_40px_rgba(2,6,23,0.28)] animate-fade-in-up">
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
        <div className="flex justify-end gap-3">
          {type === "confirm" && (
            <button 
              type="button"
              onClick={() => {
                if (onCancel) onCancel();
                onClose();
              }} 
              className="cursor-pointer rounded-xl border border-[color-mix(in_oklab,var(--color-soft)_75%,white)] bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] px-5 py-2.5 font-bold text-[color-mix(in_oklab,var(--foreground)_78%,white)] transition hover:bg-[color-mix(in_oklab,var(--color-soft)_55%,white)]"
            >
              Batal
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
            {type === "confirm" ? "Ya, Lanjutkan" : type === "success" ? "Selesai" : "OK Mengerti"}
          </button>
        </div>
      </div>
    </div>
  );
}

