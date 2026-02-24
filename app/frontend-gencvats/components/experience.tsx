import { useState, useEffect } from "react";
import { StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal"; // Pastikan huruf besar-kecil file sesuai

export default function Step3Experience({ cvData, setCvData, nextStep, prevStep }: StepProps) {
  const [activeTab, setActiveTab] = useState<"exp" | "proj" | "skill">("exp");
  const [loading, setLoading] = useState(false);
  
  const [expForm, setExpForm] = useState({ pos: "", comp: "", dur: "", desc: "" });
  const [projForm, setProjForm] = useState({ name: "", role: "", stack: "", desc: "" });
  
  // PANGGIL HOOK MODAL
  const { modalProps, showAlert, showConfirm } = useModal();

  const [hardSkillsText, setHardSkillsText] = useState("");
  const [softSkillsText, setSoftSkillsText] = useState("");

  // EFFECT: Sinkronisasi data awal atau jika AI mengubah data
  useEffect(() => {
    setHardSkillsText(cvData.Skills_Hard.join(", "));
    setSoftSkillsText(cvData.Skills_Soft.join(", "));
  }, [cvData.Skills_Hard, cvData.Skills_Soft]);

  // Handlers untuk Experience & Projects
  const addExp = () => {
    if (!expForm.pos || !expForm.comp) {
        showAlert("Perhatian", "Posisi & Perusahaan wajib diisi!");
        return;
    }
    setCvData(prev => ({
      ...prev,
      Experience: [...prev.Experience, { Posisi: expForm.pos, Perusahaan: expForm.comp, Durasi: expForm.dur, Deskripsi: expForm.desc }]
    }));
    setExpForm({ pos: "", comp: "", dur: "", desc: "" });
  };

  const addProj = () => {
    if (!projForm.name) {
        showAlert("Perhatian", "Nama Proyek wajib diisi!");
        return;
    }
    setCvData(prev => ({
      ...prev,
      Projects: [...prev.Projects, { Nama_Proyek: projForm.name, Role: projForm.role, Tech_Stack: projForm.stack, Deskripsi: projForm.desc }]
    }));
    setProjForm({ name: "", role: "", stack: "", desc: "" });
  };

  // --- PERBAIKAN LOGIC DELETE HANDLERS ---
  const handleDeleteExp = (idx: number) => {
    // Taruh logic hapusnya di parameter ketiga (onConfirm)
    showConfirm("Konfirmasi Hapus", "Hapus pengalaman ini dari daftar?", () => {
        setCvData(prev => ({...prev, Experience: prev.Experience.filter((_, i) => i !== idx)}));
    });
  };

  const handleDeleteProj = (idx: number) => {
    // Taruh logic hapusnya di parameter ketiga (onConfirm)
    showConfirm("Konfirmasi Hapus", "Hapus proyek ini dari daftar?", () => {
        setCvData(prev => ({...prev, Projects: prev.Projects.filter((_, i) => i !== idx)}));
    });
  };

  // HANDLER KHUSUS SKILLS (Update saat Blur/Klik Luar)
  const handleSkillsBlur = (type: "hard" | "soft") => {
    if (type === "hard") {
        const cleanSkills = hardSkillsText.split(",").map(s => s.trim()).filter(s => s !== "");
        setCvData(prev => ({ ...prev, Skills_Hard: cleanSkills }));
        setHardSkillsText(cleanSkills.join(", "));
    } else {
        const cleanSkills = softSkillsText.split(",").map(s => s.trim()).filter(s => s !== "");
        setCvData(prev => ({ ...prev, Skills_Soft: cleanSkills }));
        setSoftSkillsText(cleanSkills.join(", "));
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl text-gray-800 animate-fade-in-up relative">
      <h2 className="text-2xl font-bold mb-6 border-b pb-4">💼 3. Pengalaman & Keahlian</h2>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 mb-6 border-b">
        {["exp", "proj", "skill"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`cursor-pointer px-6 py-3 font-bold text-sm rounded-t-lg transition ${
              activeTab === tab 
                ? "bg-blue-600 text-white shadow-lg" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab === "exp" ? "Work Experience" : tab === "proj" ? "Projects" : "Skills"}
          </button>
        ))}
      </div>

      {/* --- CONTENT: WORK EXPERIENCE --- */}
      {activeTab === "exp" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <input 
                placeholder="Posisi (e.g. Data Analyst)" className="border p-3 rounded-lg" 
                value={expForm.pos || ""} onChange={e => setExpForm({...expForm, pos: e.target.value})} 
            />
            <input 
                placeholder="Perusahaan" className="border p-3 rounded-lg" 
                value={expForm.comp || ""} onChange={e => setExpForm({...expForm, comp: e.target.value})} 
            />
            <input 
                placeholder="Durasi (e.g. Jan 2023 - Present)" className="col-span-2 border p-3 rounded-lg" 
                value={expForm.dur || ""} onChange={e => setExpForm({...expForm, dur: e.target.value})} 
            />
            <textarea 
                placeholder="Jobdesk Pekerjaan..." className="col-span-2 border p-3 rounded-lg h-24" 
                value={expForm.desc || ""} onChange={e => setExpForm({...expForm, desc: e.target.value})} 
            />
            <button onClick={addExp} className="cursor-pointer col-span-2 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow">
                ➕ Tambah Pengalaman
            </button>
          </div>

          <div className="mt-6 bg-gray-50 p-4 rounded-xl border">
             <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                Daftar Pengalaman <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-800">{cvData.Experience.length}</span>
             </h3>
             {cvData.Experience.length === 0 && <p className="text-xs text-gray-400 italic">Belum ada data.</p>}
             <div className="space-y-3">
                {cvData.Experience.map((item, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm flex justify-between items-start hover:shadow-md transition">
                    <div>
                        <h4 className="font-bold text-gray-900">{item.Posisi}</h4>
                        <p className="text-sm font-semibold text-blue-600">{item.Perusahaan}</p>
                        <p className="text-xs text-gray-500 mb-1">{item.Durasi}</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{item.Deskripsi}</p>
                    </div>
                    <button onClick={() => handleDeleteExp(idx)} className="cursor-pointer text-red-500 hover:text-red-700 p-2 ml-2">🗑️</button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* --- CONTENT: PROJECTS --- */}
      {activeTab === "proj" && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <input 
                placeholder="Nama Proyek" className="border p-3 rounded-lg" 
                value={projForm.name || ""} onChange={e => setProjForm({...projForm, name: e.target.value})} 
            />
            <input 
                placeholder="Role" className="border p-3 rounded-lg" 
                value={projForm.role || ""} onChange={e => setProjForm({...projForm, role: e.target.value})} 
            />
            <input 
                placeholder="Tech Stack" className="col-span-2 border p-3 rounded-lg" 
                value={projForm.stack || ""} onChange={e => setProjForm({...projForm, stack: e.target.value})} 
            />
            <textarea 
                placeholder="Deskripsi Proyek" className="col-span-2 border p-3 rounded-lg h-24" 
                value={projForm.desc || ""} onChange={e => setProjForm({...projForm, desc: e.target.value})} 
            />
            <button type="button" onClick={addProj} className="cursor-pointer col-span-2 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 shadow">
                ➕ Tambah Proyek
            </button>
          </div>

          <div className="mt-6 bg-gray-50 p-4 rounded-xl border">
             <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                Daftar Proyek <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-800">{cvData.Projects.length}</span>
             </h3>
             {cvData.Projects.length === 0 && <p className="text-xs text-gray-400 italic">Belum ada data.</p>}
             <div className="space-y-3">
                {cvData.Projects.map((item, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm flex justify-between items-start hover:shadow-md transition">
                    <div>
                        <h4 className="font-bold text-gray-900">{item.Nama_Proyek}</h4>
                        <p className="text-xs text-purple-600 font-semibold mb-1">{item.Tech_Stack}</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{item.Deskripsi}</p>
                    </div>
                    <button onClick={() => handleDeleteProj(idx)} className="cursor-pointer text-red-500 hover:text-red-700 p-2 ml-2">🗑️</button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* --- CONTENT: SKILLS --- */}
      {activeTab === "skill" && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <label className="block font-bold text-gray-700 mb-2">🛠️ Hard Skills (Pisahkan dengan koma)</label>
            <textarea 
              className="w-full border p-4 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Python, SQL, Machine Learning, Next.js..."
              value={hardSkillsText} 
              onChange={(e) => setHardSkillsText(e.target.value)} 
              onBlur={() => handleSkillsBlur("hard")} 
            />
            <p className="text-xs text-gray-400 mt-1">*Tekan spasi atau koma sebebasnya. Sistem akan merapikan otomatis saat Anda klik di luar kotak.</p>
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-2">🤝 Soft Skills (Pisahkan dengan koma)</label>
            <textarea 
              className="w-full border p-4 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Leadership, Public Speaking, Teamwork..."
              value={softSkillsText} 
              onChange={(e) => setSoftSkillsText(e.target.value)} 
              onBlur={() => handleSkillsBlur("soft")} 
            />
          </div>
        </div>
      )}

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

      {/* RENDER MODAL DI SINI BIAR BISA MUNCUL */}
      <CustomModal {...modalProps} />
    </div>
  );
}