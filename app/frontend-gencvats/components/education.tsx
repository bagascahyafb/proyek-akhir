import { useState, useRef } from "react";
import axios from "axios";
import { StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal"; // Pastikan huruf besar/kecil sesuai nama file lo

export default function Step2Education({ cvData, setCvData, nextStep, prevStep }: StepProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [manual, setManual] = useState({ uni: "", jur: "", gel: "", thn: "", ipk: "" });
  const [loading, setLoading] = useState(false);
  
  // Ref untuk reset input file dengan aman
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PANGGIL HOOK MODAL
  const { modalProps, showAlert, showConfirm } = useModal();

  // --- HANDLER UPLOAD DENGAN VALIDASI ---
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!cvData.Personal_Info.Nama) {
        showAlert("Perhatian", "Mohon isi Nama Lengkap dulu di Step 1 agar validasi Ijazah berjalan akurat.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("jenis", "ijazah");
    formData.append("target_name", cvData.Personal_Info.Nama);

    const apiUrl = "https://fungistatic-luanna-aphylly.ngrok-free.dev"; 

    try {
      const res = await axios.post(`${apiUrl}/extract-ocr`, formData, { 
        headers: { 
            "Content-Type": "multipart/form-data",
            "ngrok-skip-browser-warning": "true"
        } 
      });
        const { data, validation } = res.data;

        // Fungsi Simpan (Dipanggil langsung atau nunggu konfirmasi)
        const executeSave = () => {
            setCvData(prev => ({
                ...prev,
                Education: [...prev.Education, { 
                    Institusi: data.Universitas, 
                    Jurusan: data.Jurusan, 
                    Gelar: data.Gelar, 
                    Tahun_Lulus: data.Tahun_Lulus, 
                    IPK: data.IPK 
                }]
            }));
            showAlert("Berhasil", "✅ Ijazah Valid & Tersimpan!");
        };

        // Cek Validasi Levenshtein
        if (!validation.is_valid) {
            showConfirm(
                "Peringatan Validasi",
                `Nama di dokumen: "${validation.extracted_name}"\nNama Anda: "${cvData.Personal_Info.Nama}"\nStatus: ${validation.message}\n\nApakah Anda yakin dokumen ini milik Anda dan ingin tetap menyimpannya?`,
                executeSave
            );
        } else {
            executeSave();
        }
        
    } catch (error) { 
        showAlert("Error", "Gagal memproses file. Pastikan server berjalan."); 
    } finally { 
        setLoading(false); 
        // Reset input file menggunakan Ref
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };

  const addManual = () => {
    if (!manual.uni) return showAlert("Perhatian", "Nama Universitas / Institusi wajib diisi!");
    
    setCvData(prev => ({
        ...prev,
        Education: [...prev.Education, { Institusi: manual.uni, Jurusan: manual.jur, Gelar: manual.gel, Tahun_Lulus: manual.thn, IPK: manual.ipk }]
    }));
    setManual({ uni: "", jur: "", gel: "", thn: "", ipk: "" });
  };

  // --- FITUR HAPUS DATA ---
  const handleDelete = (indexToDelete: number) => {
    showConfirm("Konfirmasi Hapus", "Hapus data pendidikan ini?", () => {
        setCvData(prev => ({
            ...prev,
            Education: prev.Education.filter((_, index) => index !== indexToDelete)
        }));
    });
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl text-gray-800 animate-fade-in-up relative">
        <h2 className="text-2xl font-bold mb-6 border-b pb-2">🎓 2. Pendidikan</h2>
        
        {/* TABS */}
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
            {tab === "upload" ? "Upload Ijazah" : tab === "manual" ? "Manual Input" : ""}
          </button>
        ))}
        </div>

        {activeTab === "upload" ? (
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
                    <span className="text-4xl mb-2">📂</span>
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
        ) : (
            // Form Manual
            <div key="tab-manual" className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-xl border">
                <input 
                    placeholder="Nama Universitas / Institusi" 
                    className="border p-3 rounded-lg" 
                    value={manual.uni || ""}  
                    onChange={e=>setManual({...manual, uni:e.target.value})} 
                />
                <input 
                    placeholder="Jurusan / Program Studi" 
                    className="border p-3 rounded-lg" 
                    value={manual.jur || ""} 
                    onChange={e=>setManual({...manual, jur:e.target.value})} 
                />
                <input 
                    placeholder="Gelar (Contoh: S.Kom)" 
                    className="border p-3 rounded-lg" 
                    value={manual.gel || ""} 
                    onChange={e=>setManual({...manual, gel:e.target.value})} 
                />
                <input 
                    placeholder="Tahun Lulus" 
                    className="border p-3 rounded-lg" 
                    value={manual.thn || ""} 
                    onChange={e=>setManual({...manual, thn:e.target.value})} 
                />
                <input 
                    placeholder="IPK (Contoh: 3.85)" 
                    className="border p-3 rounded-lg md:col-span-2" 
                    value={manual.ipk || ""}
                    onChange={e=>setManual({...manual, ipk:e.target.value})} 
                />
                
                <button type="button" onClick={addManual} className="cursor-pointer bg-green-600 text-white md:col-span-2 py-3 rounded-lg font-bold hover:bg-green-700 shadow">
                    ➕ Tambah Pendidikan
                </button>
            </div>
        )}

        {/* LIST DATA */}
        <div className="mt-8 bg-gray-50 p-4 rounded-xl border">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                Daftar Pendidikan <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-800">{cvData.Education.length}</span>
            </h3>
            
            {cvData.Education.length === 0 && <p className="text-xs text-gray-400 italic">Belum ada data.</p>}

            <div className="space-y-3">
                {cvData.Education.map((e, i) => (
                    <div key={i} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm flex justify-between items-center hover:shadow-md transition">
                        <div>
                            <p className="font-bold text-gray-900">{e.Institusi}</p>
                            <p className="text-sm text-gray-600">{e.Gelar} in {e.Jurusan} ({e.Tahun_Lulus})</p>
                            {e.IPK && <p className="text-xs text-green-600 font-semibold">IPK: {e.IPK}</p>}
                        </div>
                        
                        <button 
                            onClick={() => handleDelete(i)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition cursor-pointer"
                            title="Hapus Data"
                        >
                            🗑️
                        </button>
                    </div>
                ))}
            </div>
        </div>

        <div className="flex justify-between mt-8 pt-6">
            <button type="button" onClick={prevStep} 
                className="cursor-pointer px-6 py-2 rounded-lg font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 transition-all transform hover:scale-105 active:scale-95">
                Back
            </button>
            <button type="button" onClick={nextStep} 
                className="cursor-pointer px-6 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg">
                Next
            </button>
        </div>

        {/* --- RENDER MODAL IN-APP --- */}
        <CustomModal {...modalProps} />
    </div>
  );
}