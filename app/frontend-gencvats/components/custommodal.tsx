// components/CustomModal.tsx
import { useState } from "react";

// --- 1. CUSTOM HOOK UNTUK LOGIC MODAL ---
export function useModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "alert" | "confirm";
    onConfirm?: () => void;
  }>({ isOpen: false, title: "", message: "", type: "alert" });

  const showAlert = (title: string, message: string) => {
    setModalState({ isOpen: true, title, message, type: "alert" });
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
    showConfirm,
  };
}

// --- 2. KOMPONEN UI MODAL ---
interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: "alert" | "confirm";
  onConfirm?: () => void;
  onClose: () => void;
}

export function CustomModal({ isOpen, title, message, type, onConfirm, onClose }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-up border border-gray-100">
        <h3 className={`text-xl font-extrabold mb-3 ${type === "alert" ? "text-red-600" : "text-orange-600"}`}>
          {title}
        </h3>
        <p className="text-gray-700 mb-6 whitespace-pre-wrap text-sm leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          {type === "confirm" && (
            <button 
              type="button"
              onClick={onClose} 
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition cursor-pointer shadow-md hover:shadow-lg"
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
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md hover:shadow-lg cursor-pointer"
          >
            {type === "confirm" ? "Ya, Lanjutkan" : "OK Mengerti"}
          </button>
        </div>
      </div>
    </div>
  );
}