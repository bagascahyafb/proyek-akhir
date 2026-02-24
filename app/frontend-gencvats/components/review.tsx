import { useState } from "react";
import axios from "axios";
import { StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal"; // IMPORT HOOK MODAL

export default function Step5Review({ cvData, setCvData, prevStep }: StepProps) {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // PANGGIL HOOK MODAL
  const { modalProps, showAlert } = useModal();

  // Handler Enhance AI
  const handleEnhance = async () => {
    if (!cvData.Personal_Info.Nama) return showAlert("Perhatian", "Data kosong! Isi Nama Lengkap dulu di Step 1.");
    
    setLoading(true);
    setStatusMsg("Sedang menghubungi AI untuk memoles CV Anda... (Bisa memakan waktu 10-20 detik)");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
        const res = await axios.post(`${apiUrl}/enhance-cv`, cvData,  {
          headers: { 
            "ngrok-skip-browser-warning": "true"
        } 
        });
        setCvData(res.data);
        showAlert("Berhasil", "✨ CV Berhasil di-Enhance! Bahasa disesuaikan & kalimat diperbaiki.");
    } catch (error) {
        console.error(error);
        showAlert("Error", "❌ Gagal menghubungi server AI. Pastikan backend Python jalan.");
    } finally {
        setLoading(false);
        setStatusMsg("");
    }
  };

  // Handler Download
// Handler Download
  const handleDownload = async () => {
    setLoading(true);
    setStatusMsg("Sedang men-generate file .docx...");
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      // 1. UBAH responseType JADI arraybuffer
      const res = await axios.post(`${apiUrl}/generate-docx`, cvData, {
        responseType: "arraybuffer", 
        headers: { 
          "ngrok-skip-browser-warning": "true"
        } 
      });

      // 2. BUNGKUS RAW BINER-NYA JADI BLOB DOCX SECARA EKSPLISIT
      const blob = new Blob([res.data], { 
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `CV_${cvData.Personal_Info.Nama.replace(/\s+/g, '_')}_${cvData.Language}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showAlert("Berhasil", "✅ CV Anda berhasil diunduh. Silakan cek folder Download.");

    } catch (error) {
      console.error(error);
      showAlert("Error", "❌ Gagal download file. Terjadi kesalahan pada server.");
    } finally {
        setLoading(false);
        setStatusMsg("");
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl text-gray-800 relative overflow-hidden animate-fade-in-up">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
            <p className="font-bold text-lg text-blue-900 animate-pulse text-center">{statusMsg}</p>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-6 border-b pb-4">✨ 5. Review & Finalisasi</h2>

      {/* LANGUAGE SELECTOR */}
      <div className="mb-8 bg-blue-50 p-6 rounded-xl border border-blue-100">
        <label className="cursor-pointer block font-bold text-gray-700 mb-3 text-lg">🌐 Pilih Bahasa CV Output:</label>
        <select 
            value={cvData.Language} 
            onChange={(e) => setCvData({...cvData, Language: e.target.value})}
            className="w-full border p-4 rounded-lg bg-white text-lg"
        >
            <option value="English">🇬🇧 English (International Standard)</option>
            <option value="Indonesia">🇮🇩 Indonesia (Formal)</option>
        </select>
        <p className="text-sm text-gray-500 mt-2">*AI akan menerjemahkan & menyesuaikan gaya bahasa otomatis berdasarkan pilihan ini.</p>
      </div>

      {/* SUMMARY PREVIEW */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-700 mb-2">📝 Preview Summary (About Me)</h3>
        <textarea 
            className="w-full border p-4 rounded-lg bg-gray-50 h-32 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={cvData.Personal_Info.Summary || ""}
            onChange={(e) => setCvData({...cvData, Personal_Info: {...cvData.Personal_Info, Summary: e.target.value}})}
            placeholder="Summary akan otomatis diisi oleh AI saat Anda klik tombol Enhance..."
        />
      </div>

      {/* DATA STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center">
        <div className="bg-gray-100 p-3 rounded-lg">
            <div className="text-xl font-bold text-blue-600">{cvData.Education.length}</div>
            <div className="text-xs text-gray-500">Pendidikan</div>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg">
            <div className="text-xl font-bold text-green-600">{cvData.Experience.length}</div>
            <div className="text-xs text-gray-500">Pengalaman</div>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg">
            <div className="text-xl font-bold text-purple-600">{cvData.Projects.length}</div>
            <div className="text-xs text-gray-500">Proyek</div>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg">
            <div className="text-xl font-bold text-orange-600">{cvData.Certifications.length + cvData.Awards.length}</div>
            <div className="text-xs text-gray-500">Sertifikat</div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col gap-4">
        <button 
            type="button"
            onClick={handleEnhance}
            className="cursor-pointer w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
        >
            🤖 Polish & Rewrite with AI
        </button>
        
        <button 
            type="button"
            onClick={handleDownload}
            className="cursor-pointer w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
        >
            📥 Download Result (.docx)
        </button>

        <button type="button" onClick={prevStep} className="cursor-pointer mt-4 text-blue-600 font-bold hover:text-blue-800 underline transition">
          ← Kembali edit data
        </button>
      </div>

      {/* RENDER MODAL DI BAWAH */}
      <CustomModal {...modalProps} />
    </div>
  );
}