import { useState, useRef, useEffect } from "react";
import { StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal";
import { ArrowBackwardIcon, ArrowForwardIcon, EditIcon, TrashIcon } from "./icons";

const inputClass =
  "w-full border border-[color-mix(in_oklab,var(--color-soft)_75%,white)] bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] p-3 rounded-lg text-[var(--foreground)] placeholder:text-[color-mix(in_oklab,var(--foreground)_45%,grey)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition"
const selectClass =
  `${inputClass} cursor-pointer [&>option]:bg-[var(--color-surface)] [&>option]:text-[var(--foreground)] [&>option]:placeholder:text-[color-mix(in_oklab,var(--foreground)_45%,grey)]`;

const formatDateLabel = (value: string) => {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

type ModernDateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
  placeholder: string;
};

function ModernDateField({ value, onChange, min, disabled = false, placeholder }: ModernDateFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const label = formatDateLabel(value);

  const openPicker = () => {
    if (disabled) return;

    const input = inputRef.current;
    input?.focus();

    if (typeof input?.showPicker === "function") {
      input.showPicker();
      return;
    }

    input?.click();
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      className={`relative flex min-h-[50px] w-full cursor-pointer items-center justify-between rounded-lg border border-[color-mix(in_oklab,var(--color-soft)_75%,white)] bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] px-3 py-2.5 text-left text-[var(--foreground)] transition focus-within:ring-2 focus-within:ring-[var(--color-primary)] ${
        disabled ? "cursor-not-allowed opacity-55" : "hover:border-[color-mix(in_oklab,var(--color-primary)_65%,var(--color-soft))]"
      }`}
    >
      <span className={label ? "font-medium" : "text-[color-mix(in_oklab,var(--foreground)_48%,white)]"}>
        {label || placeholder}
      </span>
      <input
        ref={inputRef}
        type="date"
        min={min}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-label={placeholder}
      />
    </div>
  );
}

export default function Step3Experience({ cvData, setCvData, nextStep, prevStep }: StepProps) {
  const tabs: Array<"exp" | "proj" | "skill"> = ["exp", "proj", "skill"];
  const [activeTab, setActiveTab] = useState<"exp" | "proj" | "skill">("exp");
  const [expForm, setExpForm] = useState({
    pos: "",
    comp: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    desc: "",
    type: "",
    workMode: "",
  });
  const [projForm, setProjForm] = useState({
    name: "",
    role: "",
    stack: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    desc: "",
  });
  const [editingExpIndex, setEditingExpIndex] = useState<number | null>(null);
  const [editingProjIndex, setEditingProjIndex] = useState<number | null>(null);
  const { modalProps, showAlert, showConfirm } = useModal();
  const [hardSkillsText, setHardSkillsText] = useState(cvData.Skills_Hard.join(", "));
  const [softSkillsText, setSoftSkillsText] = useState(cvData.Skills_Soft.join(", "));

  // ================= AUTO RESIZE =================
  const expDescRef = useRef<HTMLTextAreaElement | null>(null);
  const projDescRef = useRef<HTMLTextAreaElement | null>(null);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const buildDuration = (startDate: string, endDate: string, isCurrent: boolean) => {
    if (!startDate) return "";
    if (isCurrent) return `${startDate} - Sekarang`;
    return endDate ? `${startDate} - ${endDate}` : startDate;
  };

  const parseDuration = (duration: string) => {
    const match = (duration || "").match(/^(\d{4}-\d{2}-\d{2})\s-\s(\d{4}-\d{2}-\d{2}|Sekarang|Present)$/i);
    if (!match) {
      return { startDate: "", endDate: "", isCurrent: false };
    }
    const isCurrent = /sekarang|present/i.test(match[2]);
    return {
      startDate: match[1],
      endDate: isCurrent ? "" : match[2],
      isCurrent,
    };
  };

  useEffect(() => {
    if (expDescRef.current) autoResize(expDescRef.current);
  }, [expForm.desc]);

  useEffect(() => {
    if (projDescRef.current) autoResize(projDescRef.current);
  }, [projForm.desc]);

  // ================= AUTO SKILL =================
  const extractSkills = (experience = cvData.Experience, projects = cvData.Projects) => {
    const hardKeywords = ["python","sql","machine learning","react","next.js","node","docker","tensorflow"];
    const softKeywords = ["leadership","teamwork","communication","problem solving","adaptability"];

    const hardSet = new Set<string>();
    const softSet = new Set<string>();

    const allText = [
      ...experience.map(e => e.Deskripsi || ""),
      ...projects.map(p => (p.Tech_Stack || "") + " " + (p.Deskripsi || ""))
    ].join(" ").toLowerCase();

    hardKeywords.forEach(s => allText.includes(s) && hardSet.add(s));
    softKeywords.forEach(s => allText.includes(s) && softSet.add(s));

    return {
      Skills_Hard: Array.from(hardSet),
      Skills_Soft: Array.from(softSet),
    };
  };

  // ================= EXPERIENCE =================
  const addExp = () => {
    if (!expForm.pos || !expForm.comp || !expForm.type || !expForm.workMode || !expForm.startDate) {
      showAlert("Perhatian", "Posisi, Perusahaan, Tipe Pekerjaan, Jenis Pekerjaan, dan Tanggal Mulai wajib diisi!");
      return;
    }
    if (!expForm.isCurrent && !expForm.endDate) {
      showAlert("Perhatian", "Isi Tanggal Selesai atau centang 'Masih bekerja di sini'.");
      return;
    }
    if (!expForm.isCurrent && expForm.endDate < expForm.startDate) {
      showAlert("Perhatian", "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    const newData = {
      Posisi: expForm.pos,
      Perusahaan: expForm.comp,
      Durasi: buildDuration(expForm.startDate, expForm.endDate, expForm.isCurrent),
      Tipe: expForm.type,
      Jenis: expForm.workMode,
      Deskripsi: expForm.desc
    };

    const nextExperience =
      editingExpIndex !== null
        ? cvData.Experience.map((item, i) => (i === editingExpIndex ? newData : item))
        : [...cvData.Experience, newData];
    const derivedSkills = extractSkills(nextExperience, cvData.Projects);
    setHardSkillsText(derivedSkills.Skills_Hard.join(", "));
    setSoftSkillsText(derivedSkills.Skills_Soft.join(", "));

    if (editingExpIndex !== null) {
      setCvData(prev => ({
        ...prev,
        Experience: nextExperience,
        ...derivedSkills
      }));
      setEditingExpIndex(null);
    } else {
      setCvData(prev => ({
        ...prev,
        Experience: nextExperience,
        ...derivedSkills
      }));
    }

    setExpForm({ pos: "", comp: "", startDate: "", endDate: "", isCurrent: false, desc: "", type: "", workMode: "" });
  };

  const handleEditExp = (index: number) => {
    const data = cvData.Experience[index];
    const parsedDuration = parseDuration(data.Durasi);
    setExpForm({
      pos: data.Posisi,
      comp: data.Perusahaan,
      startDate: parsedDuration.startDate,
      endDate: parsedDuration.endDate,
      isCurrent: parsedDuration.isCurrent,
      type: data.Tipe,
      workMode: data.Jenis || "",
      desc: data.Deskripsi
    });
    setEditingExpIndex(index);
  };

  const handleDeleteExp = (idx: number) => {
    showConfirm("Konfirmasi Hapus", "Hapus pengalaman ini?", () => {
      const nextExperience = cvData.Experience.filter((_, i) => i !== idx);
      const derivedSkills = extractSkills(nextExperience, cvData.Projects);
      setHardSkillsText(derivedSkills.Skills_Hard.join(", "));
      setSoftSkillsText(derivedSkills.Skills_Soft.join(", "));
      setCvData(prev => ({
        ...prev,
        Experience: nextExperience,
        ...derivedSkills
      }));
    });
  };

  // ================= PROJECT =================
  const addProj = () => {
    if (!projForm.name || !projForm.stack ) {
      showAlert("Perhatian", "Nama proyek dan Tech Stack wajib diisi!");
      return;
    }
    if (!projForm.startDate) {
      showAlert("Perhatian", "Tanggal mulai proyek wajib diisi!");
      return;
    }
    if (!projForm.isCurrent && !projForm.endDate) {
      showAlert("Perhatian", "Isi tanggal selesai proyek atau centang proyek masih berjalan.");
      return;
    }
    if (!projForm.isCurrent && projForm.endDate < projForm.startDate) {
      showAlert("Perhatian", "Tanggal selesai proyek tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    const newData = {
      Nama_Proyek: projForm.name,
      Role: projForm.role,
      Tech_Stack: projForm.stack,
      Duration: buildDuration(projForm.startDate, projForm.endDate, projForm.isCurrent),
      Deskripsi: projForm.desc
    };

    const nextProjects =
      editingProjIndex !== null
        ? cvData.Projects.map((project, i) => (i === editingProjIndex ? newData : project))
        : [...cvData.Projects, newData];
    const derivedSkills = extractSkills(cvData.Experience, nextProjects);
    setHardSkillsText(derivedSkills.Skills_Hard.join(", "));
    setSoftSkillsText(derivedSkills.Skills_Soft.join(", "));

    if (editingProjIndex !== null) {
      setCvData(prev => ({
        ...prev,
        Projects: nextProjects,
        ...derivedSkills
      }));
      setEditingProjIndex(null);
    } else {
      setCvData(prev => ({
        ...prev,
        Projects: nextProjects,
        ...derivedSkills
      }));
    }

    setProjForm({ name: "", role: "", stack: "", startDate: "", endDate: "", isCurrent: false, desc: "" });
  };

  const handleEditProj = (i: number) => {
    const data = cvData.Projects[i];
    const parsedDuration = parseDuration(data.Duration);
    setProjForm({
      name: data.Nama_Proyek,
      role: data.Role,
      stack: data.Tech_Stack,
      startDate: parsedDuration.startDate,
      endDate: parsedDuration.endDate,
      isCurrent: parsedDuration.isCurrent,
      desc: data.Deskripsi
    });
    setEditingProjIndex(i);
  };

  const handleDeleteProj = (i: number) => {
    showConfirm("Hapus", "Yakin hapus proyek?", () => {
      const nextProjects = cvData.Projects.filter((_, idx) => idx !== i);
      const derivedSkills = extractSkills(cvData.Experience, nextProjects);
      setHardSkillsText(derivedSkills.Skills_Hard.join(", "));
      setSoftSkillsText(derivedSkills.Skills_Soft.join(", "));
      setCvData(prev => ({
        ...prev,
        Projects: nextProjects,
        ...derivedSkills
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
    <div className="bg-[color-mix(in_oklab,var(--color-surface)_94%,white)] p-8 rounded-2xl shadow-xl text-[var(--foreground)]">
      <h2 className="text-2xl font-bold mb-6 border-b pb-4">3. Pengalaman & Keahlian</h2>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer px-6 py-3 font-bold text-sm rounded-t-lg ${
              activeTab === tab
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[color-mix(in_oklab,var(--color-surface)_88%,white)] text-[color-mix(in_oklab,var(--foreground)_92%,white)] hover:bg-[color-mix(in_oklab,var(--color-soft)_45%,white)]"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-6 rounded-xl border">

            <div>
              <label className="block text-sm font-bold mb-1">
                Posisi <span className="text-red-700">*</span>
              </label>
              <input
                className={inputClass}
                placeholder="Posisi (Data Analyst, Software Engineer, dll)"
                value={expForm.pos}
                onChange={e => setExpForm({ ...expForm, pos: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Perusahaan <span className="text-red-700">*</span>
              </label>
              <input
                className={inputClass}
                placeholder="Perusahaan (PT ABC, Startup XYZ)"
                value={expForm.comp}
                onChange={e => setExpForm({ ...expForm, comp: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Tanggal Mulai <span className="text-red-700">*</span>
              </label>
              <ModernDateField
                value={expForm.startDate}
                onChange={(value) => setExpForm({ ...expForm, startDate: value })}
                placeholder="Pilih tanggal mulai"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Tanggal Selesai
              </label>
              <ModernDateField
                disabled={expForm.isCurrent}
                min={expForm.startDate || undefined}
                value={expForm.endDate}
                onChange={(value) => setExpForm({ ...expForm, endDate: value })}
                placeholder={expForm.isCurrent ? "Masih bekerja di sini" : "Pilih tanggal selesai"}
              />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={expForm.isCurrent}
                  onChange={(e) => setExpForm({ ...expForm, isCurrent: e.target.checked, endDate: e.target.checked ? "" : expForm.endDate })}
                />
                Masih bekerja di sini
              </label>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Tipe Pekerjaan <span className="text-red-700">*</span>
              </label>
              <select
                className={selectClass}
                value={expForm.type}
                onChange={e => setExpForm({ ...expForm, type: e.target.value })}
              >
                <option value="">Pilih tipe pekerjaan</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Internship">Internship</option>
                <option value="Contract">Contract</option>
                <option value="Freelance">Freelance</option>
                <option value="Apprenticeship">Apprenticeship</option>
                <option value="Volunteer">Volunteer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Jenis Pekerjaan <span className="text-red-700">*</span>
              </label>
              <select
                className={selectClass}
                value={expForm.workMode}
                onChange={e => setExpForm({ ...expForm, workMode: e.target.value })}
              >
                <option value="">Pilih jenis pekerjaan</option>
                <option value="On-site">On-site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">
                Deskripsi
              </label>
              <textarea
                ref={expDescRef}
                className={`${inputClass} resize-none overflow-hidden`}
                placeholder="Menaikan efisiensi dengan membuat dashboard interaktif menggunakan Tableau, yang mengurangi waktu analisis sebesar 30%"
                value={expForm.desc}
                onChange={e => {
                  setExpForm({ ...expForm, desc: e.target.value });
                  autoResize(e.target);
                }}
              />
            </div>

            {/* INDICATOR EDIT */}
            {editingExpIndex !== null && (
              <p className="md:col-span-2 text-[color-mix(in_oklab,var(--color-accent)_68%,black)] text-sm font-semibold">
                Sedang mengedit pengalaman
              </p>
            )}

            {/* BUTTON */}
            <button
              onClick={addExp}
              className={`cursor-pointer md:col-span-2 py-3 rounded-lg text-white font-bold transition ${
                editingExpIndex !== null
                  ? "bg-[var(--color-accent)] hover:bg-[color-mix(in_oklab,var(--color-accent)_82%,black)]"
                  : "bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)]"
              }`}
            >
              {editingExpIndex !== null ? "Update Pengalaman" : "Tambah Pengalaman"}
            </button>
          </div>

          {/* LIST */}
          <div className="mt-8 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-5 rounded-xl border">
            <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-4 flex items-center gap-2">
              Daftar Pengalaman
              <span className="text-xs bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] px-2 py-1 rounded-full">
                {cvData.Experience.length}
              </span>
            </h3>

            {cvData.Experience.length === 0 && (
              <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] italic">Belum ada data</p>
            )}

            <div className="space-y-3">
              {cvData.Experience.map((e, i) => (
                <div
                  key={i}
                  className="bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] border p-4 rounded-lg flex justify-between items-center shadow-sm hover:shadow-md transition"
                >
                  <div>
                    <p className="font-bold text-[color-mix(in_oklab,var(--foreground)_92%,black)]">{e.Posisi}</p>
                    <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_78%,white)]">
                      {e.Perusahaan} {e.Durasi && `| ${e.Durasi}`}
                    </p>
                    <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">
                      {[e.Tipe, e.Jenis].filter(Boolean).join(" | ")}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditExp(i)}
                      aria-label="Edit pengalaman"
                      className="cursor-pointer text-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] p-2 rounded-full transition"
                    >
                      <EditIcon className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() => handleDeleteExp(i)}
                      aria-label="Hapus pengalaman"
                      className="cursor-pointer text-[color-mix(in_oklab,var(--color-primary)_70%,black)] hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)] p-2 rounded-full transition"
                    >
                      <TrashIcon className="h-5 w-5" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-6 rounded-xl border">
          {/* Nama Proyek */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Nama Proyek <span className="text-red-700">*</span>
            </label>
            <input className={inputClass}
              placeholder="Nama Proyek"
              value={projForm.name}
              onChange={e=>setProjForm({...projForm,name:e.target.value})}></input>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Role
            </label>
            <input className={inputClass}
              placeholder="Role"
              value={projForm.role}
              onChange={e=>setProjForm({...projForm,role:e.target.value})}/>
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Tech Stack <span className="text-red-700">*</span>
            </label>
            <input className={inputClass}
              placeholder="Tech Stack"
              value={projForm.stack}
              onChange={e=>setProjForm({...projForm,stack:e.target.value})}/>
          </div>

          {/* Tanggal Mulai */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Tanggal Mulai <span className="text-red-700">*</span>
            </label>
            <ModernDateField
              value={projForm.startDate}
              onChange={(value) => setProjForm({ ...projForm, startDate: value })}
              placeholder="Pilih tanggal mulai"
            />
          </div>

          {/* Tanggal Selesai */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Tanggal Selesai
            </label>
            <ModernDateField
              disabled={projForm.isCurrent}
              min={projForm.startDate || undefined}
              value={projForm.endDate}
              onChange={(value) => setProjForm({ ...projForm, endDate: value })}
              placeholder={projForm.isCurrent ? "Proyek masih berjalan" : "Pilih tanggal selesai"}
            />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={projForm.isCurrent}
                onChange={(e) => setProjForm({ ...projForm, isCurrent: e.target.checked, endDate: e.target.checked ? "" : projForm.endDate })}
              />
              Proyek masih berjalan
            </label>
          </div>

          {/* Deskripsi */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">
              Deskripsi
            </label>
            <textarea
              ref={projDescRef}
              className={`${inputClass} resize-none overflow-hidden`}
              placeholder="Memberikan deskripsi singkat tentang proyek, seperti tujuan, teknologi yang digunakan, dan hasilnya"
              value={projForm.desc}
              onChange={e => {
                setProjForm({ ...projForm, desc: e.target.value });
                autoResize(e.target);
              }}
            />
          </div>

          {/* INDICATOR EDIT */}
          {editingProjIndex !== null && (
            <p className="md:col-span-2 text-[color-mix(in_oklab,var(--color-accent)_68%,black)] text-sm font-semibold">
              Sedang mengedit proyek
            </p>
          )}

          {/* BUTTON */}
          <button
            onClick={addProj}
            className={`cursor-pointer md:col-span-2 py-3 rounded-lg text-white font-bold transition ${
              editingProjIndex !== null
                ? "bg-[var(--color-accent)] hover:bg-[color-mix(in_oklab,var(--color-accent)_82%,black)]"
                : "bg-[var(--color-accent)] hover:bg-[color-mix(in_oklab,var(--color-accent)_82%,black)]"
            }`}
          >
            {editingProjIndex !== null ? "Update Proyek" : "Tambah Proyek"}
          </button>
        </div>

        {/* LIST */}
        <div className="mt-8 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-5 rounded-xl border">
          <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-4 flex items-center gap-2">
            Daftar Proyek
            <span className="text-xs bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] px-2 py-1 rounded-full">
              {cvData.Projects.length}
            </span>
          </h3>

          {cvData.Projects.length === 0 && (
            <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] italic">Belum ada data</p>
          )}

          <div className="space-y-3">
            {cvData.Projects.map((e, i) => (
              <div
                key={i}
                className="bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] border p-4 rounded-lg flex justify-between items-center shadow-sm hover:shadow-md transition"
              >
                <div>
                  <p className="font-bold text-[color-mix(in_oklab,var(--foreground)_92%,black)]">
                    {e.Nama_Proyek} {e.Role && `| ${e.Role}`}
                  </p>
                  <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_78%,white)]">
                    {e.Duration}
                  </p>
                  <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_78%,white)]">
                    {e.Tech_Stack}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditProj(i)}
                    aria-label="Edit proyek"
                    className="cursor-pointer text-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] p-2 rounded-full transition"
                  >
                    <EditIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => handleDeleteProj(i)}
                    aria-label="Hapus proyek"
                    className="cursor-pointer text-[color-mix(in_oklab,var(--color-primary)_70%,black)] hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)] p-2 rounded-full transition"
                  >
                    <TrashIcon className="h-5 w-5" />
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
        <div className="bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-6 rounded-xl border space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">
              Hard Skills
            </label>
            <textarea
              value={hardSkillsText}
              placeholder="Python, SQL, R Language"
              onChange={e => setHardSkillsText(e.target.value)}
              onBlur={() => handleSkillsBlur("hard")}
              className={`${inputClass} min-h-24`}
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
              className={`${inputClass} min-h-24`}
            />
          </div>
        </div>
      </>
      )}

      <div className="flex justify-between mt-6">
        <button 
        onClick={prevStep}
        className="cursor-pointer px-6 py-2 bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] rounded-lg font-bold hover:bg-[color-mix(in_oklab,var(--color-soft)_75%,white)] flex items-center gap-2"
        ><ArrowBackwardIcon className="h-4 w-4" />Back</button>
        <button 
        onClick={nextStep}
        className="cursor-pointer px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] flex items-center gap-2"
        >Next<ArrowForwardIcon className="h-4 w-4" /></button>
      </div>

      <CustomModal {...modalProps} />
    </div>
  );
}


