import { useState, useEffect } from "react";
import { StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal";

export default function Step3Experience({ cvData, setCvData, nextStep, prevStep }: StepProps) {

  const [activeTab, setActiveTab] = useState<"exp" | "proj" | "skill">("exp");

  const [expForm, setExpForm] = useState({ pos: "", comp: "", dur: "", desc: "", type: "" });
  const [projForm, setProjForm] = useState({ name: "", role: "", stack: "", duration: "", desc: "" });

  const [editingExpIndex, setEditingExpIndex] = useState<number | null>(null);
  const [editingProjIndex, setEditingProjIndex] = useState<number | null>(null);

  const { modalProps, showAlert, showConfirm } = useModal();

  const [hardSkillsText, setHardSkillsText] = useState("");
  const [softSkillsText, setSoftSkillsText] = useState("");

  // ================= AUTO SKILL =================
  const extractSkills = () => {
    const hardKeywords = ["python","sql","machine learning","react","next.js","node","docker","tensorflow"];
    const softKeywords = ["leadership","teamwork","communication","problem solving","adaptability"];

    let hardSet = new Set<string>();
    let softSet = new Set<string>();

    const allText = [
      ...cvData.Experience.map(e => e.Deskripsi || ""),
      ...cvData.Projects.map(p => (p.Tech_Stack || "") + " " + (p.Deskripsi || ""))
    ].join(" ").toLowerCase();

    hardKeywords.forEach(s => allText.includes(s) && hardSet.add(s));
    softKeywords.forEach(s => allText.includes(s) && softSet.add(s));

    setCvData(prev => ({
      ...prev,
      Skills_Hard: Array.from(hardSet),
      Skills_Soft: Array.from(softSet)
    }));
  };

  useEffect(() => {
    extractSkills();
  }, [cvData.Experience, cvData.Projects]);

  useEffect(() => {
    setHardSkillsText(cvData.Skills_Hard.join(", "));
    setSoftSkillsText(cvData.Skills_Soft.join(", "));
  }, [cvData.Skills_Hard, cvData.Skills_Soft]);

  // ================= EXPERIENCE =================
  const addExp = () => {
    if (!expForm.pos || !expForm.comp || !expForm.type) {
      showAlert("Perhatian", "Posisi, Perusahaan, & Tipe Pekerjaan wajib diisi!");
      return;
    }

    const newData = {
      Posisi: expForm.pos,
      Perusahaan: expForm.comp,
      Durasi: expForm.dur,
      Tipe: expForm.type,
      Deskripsi: expForm.desc
    };

    if (editingExpIndex !== null) {
      setCvData(prev => ({
        ...prev,
        Experience: prev.Experience.map((item, i) =>
          i === editingExpIndex ? newData : item
        )
      }));
      setEditingExpIndex(null);
    } else {
      setCvData(prev => ({
        ...prev,
        Experience: [...prev.Experience, newData]
      }));
    }

    setExpForm({ pos: "", comp: "", dur: "", desc: "", type: "" });
  };

  const handleEditExp = (index: number) => {
    const data = cvData.Experience[index];
    setExpForm({
      pos: data.Posisi,
      comp: data.Perusahaan,
      dur: data.Durasi,
      type: data.Tipe,
      desc: data.Deskripsi
    });
    setEditingExpIndex(index);
  };

  const handleDeleteExp = (idx: number) => {
    showConfirm("Konfirmasi Hapus", "Hapus pengalaman ini?", () => {
      setCvData(prev => ({
        ...prev,
        Experience: prev.Experience.filter((_, i) => i !== idx)
      }));
    });
  };

  // ================= PROJECT =================
  const addProj = () => {
    if (!projForm.name || !projForm.stack ) {
      showAlert("Perhatian", "Nama proyek dan Tech Stack wajib diisi!");
      return;
    }

    const newData = {
      Nama_Proyek: projForm.name,
      Role: projForm.role,
      Tech_Stack: projForm.stack,
      Duration: projForm.duration,
      Deskripsi: projForm.desc
    };

    if (editingProjIndex !== null) {
      setCvData(prev => ({
        ...prev,
        Projects: prev.Projects.map((p, i) =>
          i === editingProjIndex ? newData : p
        )
      }));
      setEditingProjIndex(null);
    } else {
      setCvData(prev => ({
        ...prev,
        Projects: [...prev.Projects, newData]
      }));
    }

    setProjForm({ name: "", role: "", stack: "", duration: "", desc: "" });
  };

  const handleEditProj = (i: number) => {
    const data = cvData.Projects[i];
    setProjForm({
      name: data.Nama_Proyek,
      role: data.Role,
      stack: data.Tech_Stack,
      duration: data.Duration,
      desc: data.Deskripsi
    });
    setEditingProjIndex(i);
  };

  const handleDeleteProj = (i: number) => {
    showConfirm("Hapus", "Yakin hapus proyek?", () => {
      setCvData(prev => ({
        ...prev,
        Projects: prev.Projects.filter((_, idx) => idx !== i)
      }));
    });
  };

  // ================= SKILLS =================
  const handleSkillsBlur = (type: "hard" | "soft") => {
    const clean = (type === "hard" ? hardSkillsText : softSkillsText)
      .split(",").map(s => s.trim()).filter(Boolean);

    if (type === "hard") {
      setCvData(prev => ({ ...prev, Skills_Hard: clean }));
      setHardSkillsText(clean.join(", "));
    } else {
      setCvData(prev => ({ ...prev, Skills_Soft: clean }));
      setSoftSkillsText(clean.join(", "));
    }
  };


  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl text-gray-800">
      <h2 className="text-2xl font-bold mb-6 border-b pb-4">3. Pengalaman & Keahlian</h2>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {["exp", "proj", "skill"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`cursor-pointer px-6 py-3 font-bold text-sm rounded-t-lg ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {tab === "exp" ? "Work Experience" : tab === "proj" ? "Projects" : "Skills"}
          </button>
        ))}
      </div>

      {/* ================= EXPERIENCE ================= */}
      {activeTab === "exp" && (
        <>
          {/* FORM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 p-6 rounded-xl border">

            <div>
              <label className="block text-sm font-bold mb-1">
                Posisi <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Posisi (Data Analyst, Software Engineer, dll)"
                value={expForm.pos}
                onChange={e => setExpForm({ ...expForm, pos: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Perusahaan <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Perusahaan (PT ABC, Startup XYZ)"
                value={expForm.comp}
                onChange={e => setExpForm({ ...expForm, comp: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Durasi
              </label>
              <input
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Jan 2020 - Des 2021"
                value={expForm.dur}
                onChange={e => setExpForm({ ...expForm, dur: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Tipe Pekerjaan <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Fulltime, Internship, Freelance"
                value={expForm.type}
                onChange={e => setExpForm({ ...expForm, type: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">
                Deskripsi
              </label>
              <textarea
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Meningkatkan performa sistem sebesar 30%..."
                value={expForm.desc}
                onChange={e => setExpForm({ ...expForm, desc: e.target.value })}
              />
            </div>

            {/* INDICATOR EDIT */}
            {editingExpIndex !== null && (
              <p className="md:col-span-2 text-yellow-600 text-sm font-semibold">
                Sedang mengedit pengalaman
              </p>
            )}

            {/* BUTTON */}
            <button
              onClick={addExp}
              className={`cursor-pointer md:col-span-2 py-3 rounded-lg text-white font-bold transition ${
                editingExpIndex !== null
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {editingExpIndex !== null ? "Update Pengalaman" : "Tambah Pengalaman"}
            </button>
          </div>

          {/* LIST */}
          <div className="mt-8 bg-gray-50 p-5 rounded-xl border">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              Daftar Pengalaman
              <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                {cvData.Experience.length}
              </span>
            </h3>

            {cvData.Experience.length === 0 && (
              <p className="text-xs text-gray-400 italic">Belum ada data</p>
            )}

            <div className="space-y-3">
              {cvData.Experience.map((e, i) => (
                <div
                  key={i}
                  className="bg-white border p-4 rounded-lg flex justify-between items-center shadow-sm hover:shadow-md transition"
                >
                  <div>
                    <p className="font-bold text-gray-900">{e.Posisi}</p>
                    <p className="text-sm text-gray-600">
                      {e.Perusahaan} {e.Durasi && `| ${e.Durasi}`}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditExp(i)}
                      className="cursor-pointer text-blue-500 hover:bg-blue-50 p-2 rounded-full transition"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => handleDeleteExp(i)}
                      className="cursor-pointer text-red-500 hover:bg-red-50 p-2 rounded-full transition"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ================= PROJECT ================= */}
      {activeTab==="proj" && (
      <>
        {/* FORM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 p-6 rounded-xl border">
          {/* Nama Proyek */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Nama Proyek <span className="text-red-500">*</span>
            </label>
            <input className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nama Proyek"
              value={projForm.name}
              onChange={e=>setProjForm({...projForm,name:e.target.value})}></input>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Role
            </label>
            <input className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Role"
              value={projForm.role}
              onChange={e=>setProjForm({...projForm,role:e.target.value})}/>
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Tech Stack <span className="text-red-500">*</span>
            </label>
            <input className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Tech Stack"
              value={projForm.stack}
              onChange={e=>setProjForm({...projForm,stack:e.target.value})}/>
          </div>

          {/* Deskripsi */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">
              Deskripsi
            </label>
              <textarea className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Deskripsi Proyek"
                value={projForm.desc}
                onChange={e=>setProjForm({...projForm,desc:e.target.value})}/>
          </div>

          {/* INDICATOR EDIT */}
          {editingProjIndex !== null && (
            <p className="md:col-span-2 text-yellow-600 text-sm font-semibold">
              Sedang mengedit proyek
            </p>
          )}

          {/* BUTTON */}
          <button
            onClick={addProj}
            className={`cursor-pointer md:col-span-2 py-3 rounded-lg text-white font-bold transition ${
              editingProjIndex !== null
                ? "bg-yellow-500 hover:bg-yellow-600"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {editingProjIndex !== null ? "Update Proyek" : "Tambah Proyek"}
          </button>
        </div>

        {/* LIST */}
        <div className="mt-8 bg-gray-50 p-5 rounded-xl border">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            Daftar Proyek
            <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
              {cvData.Projects.length}
            </span>
          </h3>

          {cvData.Projects.length === 0 && (
            <p className="text-xs text-gray-400 italic">Belum ada data</p>
          )}

          <div className="space-y-3">
            {cvData.Projects.map((e, i) => (
              <div
                key={i}
                className="bg-white border p-4 rounded-lg flex justify-between items-center shadow-sm hover:shadow-md transition"
              >
                <div>
                  <p className="font-bold text-gray-900">
                    {e.Nama_Proyek} {e.Role && `| ${e.Role}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {e.Tech_Stack}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditProj(i)}
                    className="cursor-pointer text-blue-500 hover:bg-blue-50 p-2 rounded-full transition"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() => handleDeleteProj(i)}
                    className="cursor-pointer text-red-500 hover:bg-red-50 p-2 rounded-full transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    )}

      {/* ================= SKILLS ================= */}
      {activeTab === "skill" && (
      <>
        <div className="bg-gray-50 p-6 rounded-xl border space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">
              Hard Skills
            </label>
            <textarea
              value={hardSkillsText}
              placeholder="Python, SQL, R Language"
              onChange={e => setHardSkillsText(e.target.value)}
              onBlur={() => handleSkillsBlur("hard")}
              className="w-full border p-3 rounded-lg"
            />
          </div>

          <div>
          <label className="block text-sm font-bold mb-1">
              Soft Skills
            </label>
            <textarea
              value={softSkillsText}
              placeholder="Leadership, Team Work, Work Under Pressure"
              onChange={e => setSoftSkillsText(e.target.value)}
              onBlur={() => handleSkillsBlur("soft")}
              className="w-full border p-3 rounded-lg"
            />
          </div>
        </div>
      </>
      )}

      <div className="flex justify-between mt-6">
        <button 
        onClick={prevStep}
        className="cursor-pointer px-6 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300"
        >Back</button>
        <button 
        onClick={nextStep}
        className="cursor-pointer px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
        >Next</button>
      </div>

      <CustomModal {...modalProps} />
    </div>
  );
}

