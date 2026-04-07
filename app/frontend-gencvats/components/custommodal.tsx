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
  }>({ isOpen: false, title: "", message: "", type: "alert" });

  const showAlert = (title: string, message: string) => {
    setModalState({ isOpen: true, title, message, type: "alert" });
  };

  const showSuccess = (title: string, message: string) => {
    setModalState({ isOpen: true, title, message, type: "success" });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalState({ isOpen: true, title, message, type: "confirm", onConfirm });
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
  onClose: () => void;
}

export function CustomModal({ isOpen, title, message, type, onConfirm, onClose }: ModalProps) {
  if (!isOpen) return null;

  const modalTone = {
    alert: {
      badge: "Perlu perhatian",
      badgeClass: "bg-stone-200 text-stone-700 border-stone-300",
      titleClass: "text-stone-800",
      actionClass: "bg-stone-600 hover:bg-stone-700 text-white",
      iconWrapClass: "bg-stone-100 border-stone-200",
      iconClass: "text-stone-600",
    },
    confirm: {
      badge: "Butuh konfirmasi",
      badgeClass: "bg-slate-200 text-slate-700 border-slate-300",
      titleClass: "text-slate-800",
      actionClass: "bg-slate-600 hover:bg-slate-700 text-white",
      iconWrapClass: "bg-slate-100 border-slate-200",
      iconClass: "text-slate-600",
    },
    success: {
      badge: "Berhasil",
      badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
      titleClass: "text-emerald-900",
      actionClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
      iconWrapClass: "bg-emerald-100 border-emerald-200",
      iconClass: "text-emerald-700",
    },
  }[type];

  return (
    <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)] animate-fade-in-up">
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
        <p className="text-slate-600 mb-6 whitespace-pre-wrap text-sm leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          {type === "confirm" && (
            <button 
              type="button"
              onClick={onClose} 
              className="cursor-pointer rounded-xl border border-slate-300 bg-slate-100 px-5 py-2.5 font-bold text-slate-700 transition hover:bg-slate-200"
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

