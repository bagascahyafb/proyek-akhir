import { useState, useRef } from "react";
import axios from "axios";
import { StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal";

export default function Step2Education({ cvData, setCvData, nextStep, prevStep }: StepProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [manual, setManual] = useState({uni: "", jur: "", gel: "", thn: "", ipk: "", matkul: ""});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { modalProps, showAlert, showConfirm, showSuccess } = useModal();

  // ================= UPLOAD =================
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!cvData.Personal_Info.Nama) {
      showAlert("Perhatian", "Isi Nama di Step 1 dulu bro.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("jenis", "ijazah");
    formData.append("target_name", cvData.Personal_Info.Nama);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await axios.post(`${apiUrl}/extract-ocr`, formData);
      const { data, validation } = res.data;

      const executeSave = () => {
        setCvData(prev => ({
          ...prev,
          Education: [
            ...prev.Education,
            {
              Institusi: data.Universitas,
              Jurusan: data.Jurusan,
              Gelar: data.Gelar,
              Tahun_Lulus: data.Tahun_Lulus,
              IPK: data.IPK,
              Matkul: ""
            }
          ]
        }));
        showSuccess("Berhasil", "Data dari OCR masuk!");
      };

      if (!validation.is_valid) {
        showConfirm("Validasi", "Data beda nama, lanjut?", executeSave);
      } else {
        executeSave();
      }
    } catch {
      showAlert("Error", "Gagal OCR");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ================= ADD / EDIT =================
  const addManual = () => {
    if (!manual.uni || !manual.jur || !manual.thn) {
      return showAlert("Perhatian", "Institusi, Jurusan, Tahun wajib diisi!");
    }

    const newData = {
      Institusi: manual.uni,
      Jurusan: manual.jur,
      Gelar: manual.gel,
      Tahun_Lulus: manual.thn,
      IPK: manual.ipk,
      Matkul: manual.matkul
    };

    if (editingIndex !== null) {
      setCvData(prev => ({
        ...prev,
        Education: prev.Education.map((item, i) =>
          i === editingIndex ? newData : item
        )
      }));
      setEditingIndex(null);
    } else {
      setCvData(prev => ({
        ...prev,
        Education: [...prev.Education, newData]
      }));
    }

    setManual({ uni: "", jur: "", gel: "", thn: "", ipk: "", matkul: "" });
  };

  const handleEdit = (index: number) => {
    const data = cvData.Education[index];
    setManual({
      uni: data.Institusi,
      jur: data.Jurusan,
      gel: data.Gelar,
      thn: data.Tahun_Lulus,
      ipk: data.IPK,
      matkul: data.Matkul || ""
    });
    setEditingIndex(index);
    setActiveTab("manual");
  };

  const handleDelete = (index: number) => {
    showConfirm("Hapus", "Yakin hapus?", () => {
      setCvData(prev => ({
        ...prev,
        Education: prev.Education.filter((_, i) => i !== index)
      }));
    });
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-gray-800">

      <h2 className="text-2xl font-bold mb-6 border-b pb-3">
        2. Pendidikan
      </h2>

      <div className="flex gap-2 mb-6 border-b">
        {["upload", "manual"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`cursor-pointer px-6 py-3 font-bold text-sm rounded-t-lg transition ${
              activeTab === tab 
                ? "bg-blue-600 text-white shadow-lg" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab === "upload" ? "Upload File" : tab === "manual" ? "Manual Input" : ""}
          </button>
        ))}
        </div>
      {/* ================= UPLOAD FORM ================= */}
      {activeTab === "upload" && (
            <div key="tab-upload" className="p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-center hover:bg-gray-100 transition relative">
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleUpload} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                    disabled={loading} 
                    accept=".pdf,.jpg,.jpeg,.png" 
                />
                <div className="flex flex-col items-center">
                    <span className="text-base font-semibold uppercase tracking-[0.2em] text-gray-400">📁</span>
                    {loading ? (
                        <p className="text-blue-600 font-bold animate-pulse">Sedang Memvalidasi & OCR...</p>
                    ) : (
                        <>
                            <p className="font-bold text-gray-600">Klik atau geser file Ijazah ke sini</p>
                            <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                        </>
                    )}
                </div>
            </div>
        )}
      {/* ================= MANUAL FORM ================= */}
      {activeTab === "manual" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 p-6 rounded-xl border">

          {/* Institusi */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Nama Institusi <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Universitas Indonesia"
              value={manual.uni || ""}
              onChange={e => setManual({ ...manual, uni: e.target.value })}
            />
          </div>

          {/* Jurusan */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Jurusan <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Teknik Informatika"
              value={manual.jur || ""}
              onChange={e => setManual({ ...manual, jur: e.target.value })}
            />
          </div>

          {/* Tahun */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Tahun Lulus <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="2020"
              value={manual.thn || ""}
              onChange={e => setManual({ ...manual, thn: e.target.value })}
            />
          </div>

          {/* Gelar */}
          <div>
            <label className="block text-sm font-bold mb-1">Gelar</label>
            <input
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="S. Kom"
              value={manual.gel || ""}
              onChange={e => setManual({ ...manual, gel: e.target.value })}
            />
          </div>

          {/* IPK */}
          <div>
            <label className="block text-sm font-bold mb-1">IPK</label>
            <input
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Range 0.00 - 4.00"
              value={manual.ipk || ""}
              onChange={e => setManual({ ...manual, ipk: e.target.value })}
            />
          </div>

          {/* Matkul */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">
              Mata Kuliah Relevan
            </label>
            <textarea
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Machine Learning, NLP, Data Mining"
              value={manual.matkul || ""}
              onChange={e => setManual({ ...manual, matkul: e.target.value })}
            />
          </div>

          {/* INDICATOR EDIT */}
          {editingIndex !== null && (
            <p className="text-sm text-yellow-600 font-semibold md:col-span-2">
              Sedang mengedit data pendidikan
            </p>
          )}
          <button
            onClick={addManual}
            className={`cursor-pointer md:col-span-2 py-3 rounded-lg font-bold text-white transition ${
              editingIndex !== null
                ? "bg-yellow-500 hover:bg-yellow-600"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {editingIndex !== null ? "Update Pendidikan" : "Tambah Pendidikan"}
          </button>
        </div>
      )}

      <div className="mt-8 bg-gray-50 p-5 rounded-xl border">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
          Daftar Pendidikan <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-800">{cvData.Education.length}</span>
        </h3>

        {cvData.Education.length === 0 && (
          <p className="text-xs text-gray-400 italic">Belum ada data</p>
        )}

        <div className="space-y-3">
          {cvData.Education.map((e, i) => (
            <div
              key={i}
              className="bg-white border p-4 rounded-lg flex justify-between items-center shadow-sm hover:shadow-md transition"
            >
              <div>
                <p className="font-bold text-gray-900">{e.Institusi}</p>
                <p className="text-sm text-gray-600">
                  {e.Gelar && `${e.Gelar} - `} {e.Jurusan} ({e.Tahun_Lulus})
                </p>

                {e.IPK && (
                  <p className="text-xs text-green-600">IPK: {e.IPK}</p>
                )}

                {e.Matkul && (
                  <p className="text-xs text-gray-600">
                    Mata Kuliah Relevan: {e.Matkul}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(i)}
                  className="cursor-pointer text-blue-500 hover:bg-blue-50 p-2 rounded-full transition flex items-center justify-center"
                >✏️</button>

                <button
                  onClick={() => handleDelete(i)}
                  className="cursor-pointer text-red-500 hover:bg-red-50 p-2 rounded-full transition flex items-center justify-center"
                >🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          className="cursor-pointer px-6 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300"
        >
          Back
        </button>

        <button
          onClick={nextStep}
          className="cursor-pointer px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
        >
          Next
        </button>
      </div>

      <CustomModal {...modalProps} />
    </div>
  );
}

