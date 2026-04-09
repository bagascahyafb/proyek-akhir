import { useState, useRef } from "react";
import axios from "axios";
import { StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function Step4Certificates({ cvData, setCvData, apiUrl, nextStep, prevStep }: StepProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadCategory, setUploadCategory] = useState<"Keahlian" | "Penghargaan">("Keahlian");
  const [manualForm, setManualForm] = useState({ kategori: "Keahlian", nama: "", penerbit: "", tahun: "" });
  const [editingState, setEditingState] = useState<{ type: "Keahlian" | "Kompetisi"; index: number } | null>(null);

  const { modalProps, showAlert, showConfirm } = useModal();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      showAlert("Ukuran File", "Ukuran file maksimal 5 MB per file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!cvData.Personal_Info.Nama) {
      showAlert("Perhatian", "Mohon isi Nama Lengkap dulu di Step 1.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("jenis", "sertifikat");
    formData.append("target_name", cvData.Personal_Info.Nama);
    try {
      const res = await axios.post(`${apiUrl}/extract-ocr`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "ngrok-skip-browser-warning": "true",
        },
      });
      const { data, validation } = res.data;

      const executeSave = () => {
        setCvData((prev) => {
          const newData = { ...prev };
          if (uploadCategory === "Penghargaan") {
            newData.Awards = [
              ...prev.Awards,
              {
                Nama_Award: data.Judul_Sertifikat || "Tanpa Judul",
                Pemberi: data.Lembaga_Penerbit || "Penyelenggara Tidak Terdeteksi",
                Tahun: data.Tahun_Sertifikat || "-",
              },
            ];
          } else {
            newData.Certifications = [
              ...prev.Certifications,
              {
                Nama: data.Judul_Sertifikat || "Tanpa Judul",
                Penerbit: data.Lembaga_Penerbit || "Penerbit Tidak Terdeteksi",
                Tahun: data.Tahun_Sertifikat || "-",
              },
            ];
          }

          if (data.Skill && data.Skill !== "Tidak Ditemukan") {
            const newSkills = data.Skill.split(",").map((skill: string) => skill.trim());
            if (data.Tipe_Skill && data.Tipe_Skill.includes("Soft")) {
              newData.Skills_Soft = [...prev.Skills_Soft, ...newSkills];
            } else {
              newData.Skills_Hard = [...prev.Skills_Hard, ...newSkills];
            }
          }
          return newData;
        });
        showAlert("Berhasil", `Berhasil ditambahkan ke kategori: ${uploadCategory}`);
      };

      if (!validation.is_valid) {
        showConfirm(
          "Peringatan Validasi",
          `Nama Dokumen: "${validation.extracted_name}"\nNama Anda: "${cvData.Personal_Info.Nama}"\n\nApakah Anda yakin dokumen ini milik Anda dan ingin tetap menyimpannya?`,
          executeSave,
        );
      } else {
        executeSave();
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.detail || "Gagal memproses file. Pastikan server berjalan."
        : "Gagal memproses file. Pastikan server berjalan.";
      showAlert("Error", message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addManual = () => {
    if (!manualForm.nama) return showAlert("Perhatian", "Isi nama sertifikat terlebih dahulu!");

    setCvData((prev) => {
      const newData = { ...prev };

      if (manualForm.kategori === "Kompetisi") {
        const awardData = {
          Nama_Award: manualForm.nama,
          Pemberi: manualForm.penerbit,
          Tahun: manualForm.tahun,
        };

        if (editingState?.type === "Kompetisi") {
          newData.Awards = prev.Awards.map((item, i) => (i === editingState.index ? awardData : item));
        } else {
          newData.Awards = [...prev.Awards, awardData];
        }
      } else {
        const certData = {
          Nama: manualForm.nama,
          Penerbit: manualForm.penerbit,
          Tahun: manualForm.tahun,
        };

        if (editingState?.type === "Keahlian") {
          newData.Certifications = prev.Certifications.map((item, i) => (i === editingState.index ? certData : item));
        } else {
          newData.Certifications = [...prev.Certifications, certData];
        }
      }

      return newData;
    });

    setEditingState(null);
    setManualForm({ kategori: "Keahlian", nama: "", penerbit: "", tahun: "" });
  };

  const handleEditCert = (idx: number) => {
    const cert = cvData.Certifications[idx];
    setManualForm({
      kategori: "Keahlian",
      nama: cert.Nama || "",
      penerbit: cert.Penerbit || "",
      tahun: cert.Tahun || "",
    });
    setEditingState({ type: "Keahlian", index: idx });
    setActiveTab("manual");
  };

  const handleEditAward = (idx: number) => {
    const award = cvData.Awards[idx];
    setManualForm({
      kategori: "Kompetisi",
      nama: award.Nama_Award || "",
      penerbit: award.Pemberi || "",
      tahun: award.Tahun || "",
    });
    setEditingState({ type: "Kompetisi", index: idx });
    setActiveTab("manual");
  };

  const handleDeleteCert = (idx: number) => {
    showConfirm("Konfirmasi Hapus", "Hapus sertifikat ini dari daftar?", () => {
      setCvData((prev) => ({ ...prev, Certifications: prev.Certifications.filter((_, i) => i !== idx) }));
    });
  };

  const handleDeleteAward = (idx: number) => {
    showConfirm("Konfirmasi Hapus", "Hapus penghargaan ini dari daftar?", () => {
      setCvData((prev) => ({ ...prev, Awards: prev.Awards.filter((_, i) => i !== idx) }));
    });
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl text-gray-800 animate-fade-in-up relative">
      <h2 className="text-2xl font-bold mb-6 border-b pb-2">3. Sertifikat & Prestasi</h2>
      <div className="flex gap-2 mb-6 border-b">
        {["upload", "manual"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "upload" | "manual")}
            className={`cursor-pointer px-6 py-3 font-bold text-sm rounded-t-lg transition ${
              activeTab === tab ? "bg-blue-600 text-white shadow-lg" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab === "upload" ? "Upload File" : "Manual Input"}
          </button>
        ))}
      </div>

      {activeTab === "upload" ? (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="font-bold text-gray-700 mb-3 text-sm">Jenis dokumen yang akan diupload:</p>
            <div className="flex gap-4">
              <label className={`flex-1 cursor-pointer border p-3 rounded-lg flex items-center gap-2 transition ${uploadCategory === "Keahlian" ? "bg-white border-blue-500 ring-2 ring-blue-200" : "bg-gray-50 border-gray-200"}`}>
                <input
                  type="radio"
                  name="cat"
                  value="Keahlian"
                  checked={uploadCategory === "Keahlian"}
                  onChange={() => setUploadCategory("Keahlian")}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <span className="block font-bold text-sm">Sertifikat Keahlian</span>
                  <span className="text-xs text-gray-500">Contoh: Course, Bootcamp</span>
                </div>
              </label>

              <label className={`flex-1 cursor-pointer border p-3 rounded-lg flex items-center gap-2 transition ${uploadCategory === "Penghargaan" ? "bg-white border-orange-500 ring-2 ring-orange-200" : "bg-gray-50 border-gray-200"}`}>
                <input
                  type="radio"
                  name="cat"
                  value="Penghargaan"
                  checked={uploadCategory === "Penghargaan"}
                  onChange={() => setUploadCategory("Penghargaan")}
                  className="w-4 h-4 text-orange-600"
                />
                <div>
                  <span className="block font-bold text-sm">Penghargaan / Lomba</span>
                  <span className="text-xs text-gray-500">Contoh: Juara 1, Best Capstone</span>
                </div>
              </label>
            </div>
          </div>

          <div className="p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center hover:bg-gray-100 transition relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              disabled={loading}
              accept=".pdf,.jpg,.jpeg,.png"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-2">📁</span>
              {loading ? (
                <p className="text-blue-600 font-bold animate-pulse">Sedang membaca & memvalidasi...</p>
              ) : (
                <>
                  <p className="font-bold text-gray-600">Klik atau geser file ke sini</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG, JPEG (Max 5MB)</p>
                  <p className="text-xs font-semibold text-blue-500 mt-2 bg-blue-50 px-2 py-1 rounded">
                    Masuk bagian {uploadCategory === "Keahlian" ? "Sertifikat Keahlian" : "Penghargaan"}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-xl border">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">Kategori</label>
            <select
              value={manualForm.kategori || "Keahlian"}
              onChange={(e) => setManualForm({ ...manualForm, kategori: e.target.value })}
              className="w-full p-3 border rounded-lg bg-white"
            >
              <option value="Keahlian">Sertifikat Keahlian / Kompetensi</option>
              <option value="Kompetisi">Juara Kompetisi / Penghargaan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Nama Sertifikat <span className="text-red-500">*</span></label>
            <input
              placeholder="Nama Sertifikat / Lomba"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={manualForm.nama || ""}
              onChange={(e) => setManualForm({ ...manualForm, nama: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Penerbit / Penyelenggara</label>
            <input
              placeholder="Penerbit / Penyelenggara"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={manualForm.penerbit || ""}
              onChange={(e) => setManualForm({ ...manualForm, penerbit: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Tahun</label>
            <input
              placeholder="Tahun"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={manualForm.tahun || ""}
              onChange={(e) => setManualForm({ ...manualForm, tahun: e.target.value })}
            />
          </div>
          {editingState !== null && (
            <p className="text-sm text-yellow-600 font-semibold md:col-span-2">
              Sedang mengedit {editingState.type === "Keahlian" ? "sertifikat keahlian" : "penghargaan / lomba"}
            </p>
          )}
          <button
            onClick={addManual}
            className={`cursor-pointer md:col-span-2 py-3 rounded-lg text-white font-bold shadow transition ${
              editingState !== null ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {editingState !== null ? "Update Data" : "Tambahkan Manual"}
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-xl border">
          <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
            Sertifikat Keahlian <span className="text-xs bg-blue-200 px-2 py-1 rounded-full text-blue-800">{cvData.Certifications.length}</span>
          </h3>
          {cvData.Certifications.length === 0 && <p className="text-xs text-gray-400 italic">Belum ada data.</p>}
          <ul className="space-y-2">
            {cvData.Certifications.map((certificate, i) => (
              <li key={i} className="bg-white p-3 rounded border flex justify-between items-start text-sm shadow-sm">
                <div>
                  <p className="font-bold text-gray-800">{certificate.Nama}</p>
                  <p className="text-xs text-gray-500">{certificate.Penerbit} {certificate.Tahun && `(${certificate.Tahun})`}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEditCert(i)} className="cursor-pointer text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50 transition">✏️</button>
                  <button onClick={() => handleDeleteCert(i)} className="cursor-pointer text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition">🗑️</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border">
          <h3 className="font-bold text-yellow-700 mb-4 flex items-center gap-2">
            Penghargaan / Lomba <span className="text-xs bg-yellow-200 px-2 py-1 rounded-full text-yellow-800">{cvData.Awards.length}</span>
          </h3>
          {cvData.Awards.length === 0 && <p className="text-xs text-gray-400 italic">Belum ada data.</p>}
          <ul className="space-y-2">
            {cvData.Awards.map((award, i) => (
              <li key={i} className="bg-white p-3 rounded border flex justify-between items-start text-sm shadow-sm">
                <div>
                  <p className="font-bold text-gray-800">{award.Nama_Award}</p>
                  <p className="text-xs text-gray-500">{award.Pemberi} {award.Tahun && `(${award.Tahun})`}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEditAward(i)} className="cursor-pointer text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50 transition">✏️</button>
                  <button onClick={() => handleDeleteAward(i)} className="cursor-pointer text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition">🗑️</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-between mt-8 pt-6">
        <button
          type="button"
          onClick={prevStep}
          className="cursor-pointer px-6 py-2 rounded-lg font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 transition-all transform hover:scale-105 active:scale-95"
        >
          Back
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="cursor-pointer px-6 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
        >
          Next
        </button>
      </div>
      <CustomModal {...modalProps} />
    </div>
  );
}
