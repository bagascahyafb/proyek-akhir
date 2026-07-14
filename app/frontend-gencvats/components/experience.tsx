import { useState, useRef, useEffect } from "react";
import { StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal";
import { ArrowBackwardIcon, ArrowForwardIcon, EditIcon, TrashIcon } from "./icons";
import { buildDuplicateKey, formatDuplicateMessage, isDuplicateItem, uniqueTextList } from "./duplicate-data";

const inputClass =
  "w-full border border-[color-mix(in_oklab,var(--color-soft)_75%,white)] bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] p-3 rounded-lg text-[var(--foreground)] placeholder:text-[color-mix(in_oklab,var(--foreground)_45%,grey)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition"
const selectClass =
  `${inputClass} cursor-pointer [&>option]:bg-[var(--color-surface)] [&>option]:text-[var(--foreground)] [&>option]:placeholder:text-[color-mix(in_oklab,var(--foreground)_45%,grey)]`;

const getDateLocale = (language?: string) =>
  language?.toLowerCase().startsWith("inggris") ? "id-ID" : "en-US";

const normalizeMonthValue = (value: string) => {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  return match ? `${match[1]}-${match[2]}` : "";
};

const parseMonthLabel = (value: string) => {
  const normalized = value.trim().replace(".", "").toLowerCase();
  const match = normalized.match(/^([a-z]+)\s+((?:19|20)\d{2})$/i);
  if (!match) return "";

  const monthMap: Record<string, string> = {
    jan: "01",
    januari: "01",
    january: "01",
    feb: "02",
    februari: "02",
    february: "02",
    mar: "03",
    maret: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    mei: "05",
    jun: "06",
    juni: "06",
    june: "06",
    jul: "07",
    juli: "07",
    july: "07",
    aug: "08",
    agu: "08",
    ags: "08",
    agustus: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    oct: "10",
    okt: "10",
    oktober: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    des: "12",
    desember: "12",
    december: "12",
  };

  const month = monthMap[match[1]];
  return month ? `${match[2]}-${month}` : "";
};

const parseMonthValue = (value: string) => normalizeMonthValue(value) || parseMonthLabel(value);

const formatDateLabel = (value: string, language?: string) => {
  if (!value) return "";
  const monthValue = parseMonthValue(value);
  if (!monthValue) return "";

  const date = new Date(`${monthValue}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(getDateLocale(language), {
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDurationLabel = (duration: string, language?: string) => {
  if (!duration) return "";

  const [startRaw, endRaw] = duration.split(/\s+-\s+/);
  const startLabel = formatDateLabel(startRaw, language);
  if (!startLabel) return duration;
  if (!endRaw) return startLabel;

  const isCurrent = /sekarang|present/i.test(endRaw);
  const endLabel = isCurrent ? (getDateLocale(language) === "id-ID" ? "Sekarang" : "Present") : formatDateLabel(endRaw, language);

  return endLabel ? `${startLabel} - ${endLabel}` : startLabel;
};

type ModernDateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  disabled?: boolean;
  placeholder: string;
  language?: string;
};

function ModernDateField({ value, onChange, min, disabled = false, placeholder, language }: ModernDateFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const normalizedValue = normalizeMonthValue(value);
  const normalizedMin = min ? normalizeMonthValue(min) : undefined;
  const label = formatDateLabel(value, language);

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
        type="month"
        min={normalizedMin}
        disabled={disabled}
        value={normalizedValue}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-label={placeholder}
      />
    </div>
  );
}

const normalizeUrl = (raw: string) => {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error("URL kosong");
  }

  const withProtocol =
    /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

  const parsed = new URL(withProtocol);

  if (!parsed.hostname.includes(".")) {
    throw new Error("Domain tidak valid");
  }

  return parsed;
};

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
    link: "",
    desc: "",
  });
  const [editingExpIndex, setEditingExpIndex] = useState<number | null>(null);
  const [editingProjIndex, setEditingProjIndex] = useState<number | null>(null);
  const { modalProps, showAlert, showConfirm } = useModal();
  const [hardSkillsText, setHardSkillsText] = useState(cvData.Skills_Hard.join(", "));
  const [softSkillsText, setSoftSkillsText] = useState(cvData.Skills_Soft.join(", "));

  const getExperienceDuplicateKey = (entry: {
    Posisi: string;
    Perusahaan: string;
    Durasi: string;
    Tipe: string;
    Jenis: string;
  }) => buildDuplicateKey([entry.Posisi, entry.Perusahaan, entry.Durasi, entry.Tipe, entry.Jenis]);

  const getProjectDuplicateKey = (entry: {
    Nama_Proyek: string;
    Role: string;
    Tech_Stack: string;
    Duration: string;
  }) => buildDuplicateKey([entry.Nama_Proyek, entry.Role, entry.Tech_Stack, entry.Duration]);

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
    const [startRaw, endRaw] = (duration || "").split(/\s+-\s+/);
    const startDate = parseMonthValue(startRaw || "");
    const isCurrent = /sekarang|present/i.test(endRaw || "");
    const endDate = isCurrent ? "" : parseMonthValue(endRaw || "");

    if (!startDate) return { startDate: "", endDate: "", isCurrent: false };

    return {
      startDate,
      endDate,
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
    if (!expForm.pos || !expForm.comp || !expForm.type || !expForm.workMode || !expForm.startDate || !expForm.desc) {
      showAlert("Lengkapi pengalaman", "Isi posisi, perusahaan, tipe, lokasi kerja, tanggal mulai, dan deskripsi.");
      return;
    }
    if (!expForm.isCurrent && !expForm.endDate) {
      showAlert("Tanggal selesai kosong", "Isi tanggal selesai atau centang masih bekerja di sini.");
      return;
    }
    if (!expForm.isCurrent && expForm.endDate < expForm.startDate) {
      showAlert("Tanggal belum valid", "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
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

    if (isDuplicateItem(cvData.Experience, newData, getExperienceDuplicateKey, editingExpIndex)) {
      showAlert(
        "Data duplikat",
        formatDuplicateMessage("Pengalaman", [`${newData.Posisi} - ${newData.Perusahaan} (${formatDurationLabel(newData.Durasi, cvData.Language)})`])
      );
      return;
    }

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
    showConfirm("Hapus pengalaman", "Data ini akan dihapus dari CV.", () => {
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
    const portfolioRaw = projForm.link.trim();

    if (!projForm.name || !projForm.stack || !projForm.desc) {
      showAlert("Lengkapi proyek", "Isi nama proyek, tech stack, dan deskripsi.");
      return;
    }
    if (!projForm.startDate) {
      showAlert("Tanggal mulai kosong", "Pilih tanggal mulai proyek.");
      return;
    }
    if (!projForm.isCurrent && !projForm.endDate) {
      showAlert("Tanggal selesai kosong", "Isi tanggal selesai atau centang proyek masih berjalan.");
      return;
    }
    if (!projForm.isCurrent && projForm.endDate < projForm.startDate) {
      showAlert("Tanggal belum valid", "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }

    if (portfolioRaw) {
      let portfolioUrl: URL;
      try {
        portfolioUrl = normalizeUrl(portfolioRaw);
      } catch {
        return showAlert("Link portofolio belum valid", "Gunakan link GitHub atau portofolio yang bisa dibuka.");
      }

      setProjForm(prev => ({
        ...prev,
        link: portfolioUrl.toString()
      }));
    }

    let normalizedLink = projForm.link;

    if (portfolioRaw) {
      try {
        normalizedLink = normalizeUrl(portfolioRaw).toString();
      } catch {
        return showAlert(
          "GitHub/Portofolio",
          "Gunakan link GitHub atau portofolio yang bisa dibuka."
        );
      }
    }

    const newData = {
      Nama_Proyek: projForm.name,
      Role: projForm.role,
      Tech_Stack: projForm.stack,
      Duration: buildDuration(projForm.startDate, projForm.endDate, projForm.isCurrent),
      link: normalizedLink || "",
      Deskripsi: projForm.desc
    };

    if (isDuplicateItem(cvData.Projects, newData, getProjectDuplicateKey, editingProjIndex)) {
      showAlert(
        "Data duplikat",
        formatDuplicateMessage("Proyek", [`${newData.Nama_Proyek}${newData.Role ? ` - ${newData.Role}` : ""}`])
      );
      return;
    }

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

    setProjForm({ name: "", role: "", stack: "", startDate: "", endDate: "", isCurrent: false, link:"",  desc: "" });
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
      link: data.link || "",
      desc: data.Deskripsi
    });
    setEditingProjIndex(i);
  };

  const handleDeleteProj = (i: number) => {
    showConfirm("Hapus proyek", "Data ini akan dihapus dari CV.", () => {
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
    const parsed = (type === "hard" ? hardSkillsText : softSkillsText)
      .split(",").map(s => s.trim()).filter(Boolean);
    const { items: clean, duplicates } = uniqueTextList(parsed);
    const label = type === "hard" ? "Hard skill" : "Soft skill";

    if (type === "hard") {
      setCvData(prev => ({ ...prev, Skills_Hard: clean }));
      setHardSkillsText(clean.join(", "));
    } else {
        setCvData(prev => ({ ...prev, Skills_Soft: clean }));
        setSoftSkillsText(clean.join(", "));
    }

    if (duplicates.length > 0) {
      showAlert("Data duplikat", formatDuplicateMessage(label, duplicates));
    }
  };


  return (
    <div>
      {/* Tabs */}
      <div className="builder-tabs">
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
            {tab === "exp" ? "Pengalaman" : tab === "proj" ? "Proyek" : "Skill"}
          </button>
        ))}
      </div>

      {/* ================= EXPERIENCE ================= */}
      {activeTab === "exp" && (
        <>
          {/* FORM */}
          <div className="builder-inner-panel grid grid-cols-1 md:grid-cols-2 gap-5 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-6 rounded-xl border">

            <div>
              <label className="block text-sm font-bold mb-1">
                Posisi <span className="text-red-700">*</span>
              </label>
              <input
                className={inputClass}
                placeholder="Data Analyst, Software Engineer, dll"
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
                language={cvData.Language}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                Tanggal Selesai  <span className="text-red-700">*</span>
              </label>
              <ModernDateField
                disabled={expForm.isCurrent}
                min={expForm.startDate || undefined}
                value={expForm.endDate}
                onChange={(value) => setExpForm({ ...expForm, endDate: value })}
                placeholder={expForm.isCurrent ? "Masih bekerja di sini" : "Pilih tanggal selesai"}
                language={cvData.Language}
              />
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-[var(--foreground)] mt-2">
                {/* Checkbox asli disembunyikan total secara visual */}
                <input
                  type="checkbox"
                  checked={expForm.isCurrent}
                  onChange={(e) => setExpForm({ ...expForm, isCurrent: e.target.checked, endDate: e.target.checked ? "" : expForm.endDate })}
                  // Ditambahkan !bg-transparent dan !appearance-none untuk membunuh paksaan dari globals.css
                  className="sr-only peer !bg-transparent !appearance-none"
                />
                
                {/* Kotak Custom Tiruan - Dikontrol penuh lewat Tailwind dan CSS variables */}
                <div className="
                  flex h-4 w-4 shrink-0 items-center justify-center rounded border 
                  border-[color-mix(in_oklab,var(--color-soft)_80%,white)] 
                  bg-[color-mix(in_oklab,var(--color-surface-container)_90%,white)] 
                  transition-all duration-200
                  peer-focus:ring-2 peer-focus:ring-[var(--color-primary)]/40
                  peer-checked:border-[var(--color-primary)] peer-checked:bg-[var(--color-primary)]
                ">
                  {/* Ikon centang internal murni SVG */}
                  <svg
                    className="h-2.5 w-2.5 text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="3.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <span>Masih bekerja di sini</span>
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
                <option value="Temporary">Temporary</option>
                <option value="Volunteer">Volunteer</option>
                <option value="Other">Other</option>
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
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold mb-1">
                Deskripsi <span className="text-red-700">*</span>
              </label>
              <textarea
                ref={expDescRef}
                className={`${inputClass} resize-none overflow-hidden`}
                placeholder="Contoh: Membuat dashboard Tableau yang memangkas waktu analisis 30%."
                value={expForm.desc}
                onChange={e => {
                  setExpForm({ ...expForm, desc: e.target.value });
                  autoResize(e.target);
                }}
              />
            </div>

            {/* INDICATOR EDIT */}
            {editingExpIndex !== null && (
              <p className="block text-sm font-bold mb-1">
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
              {editingExpIndex !== null ? "Simpan perubahan" : "Tambah pengalaman"}
            </button>
          </div>

          {/* LIST */}
          <div className="builder-list-panel mt-8 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-5 rounded-xl border">
            <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-4 flex items-center gap-2">
              Pengalaman
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
                  className="builder-list-item bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] border p-4 rounded-lg shadow-sm hover:shadow-md transition"
                >
                  <div>
                    <p className="font-bold text-[color-mix(in_oklab,var(--foreground)_92%,black)]">{e.Posisi}</p>
                    <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_78%,white)]">
                      {e.Perusahaan} {e.Durasi && `| ${formatDurationLabel(e.Durasi, cvData.Language)}`}
                    </p>
                    <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">
                      {[e.Tipe, e.Jenis].filter(Boolean).join(" | ")}
                    </p>
                  </div>

                  <div className="builder-icon-actions">
                    <button
                      onClick={() => handleEditExp(i)}
                      aria-label="Edit pengalaman"
                      title="Edit pengalaman"
                      className="cursor-pointer text-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] p-2 rounded-full transition"
                    >
                      <EditIcon className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() => handleDeleteExp(i)}
                      aria-label="Hapus pengalaman"
                      title="Hapus pengalaman"
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
        <div className="builder-inner-panel grid grid-cols-1 md:grid-cols-2 gap-5 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-6 rounded-xl border">
          {/* Nama Proyek */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Nama Proyek <span className="text-red-700">*</span>
            </label>
            <input className={inputClass}
              placeholder="Mobile App E-Commerce"
              value={projForm.name}
              onChange={e=>setProjForm({...projForm,name:e.target.value})}></input>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Role
            </label>
            <input className={inputClass}
              placeholder="UI/UX Designer"
              value={projForm.role}
              onChange={e=>setProjForm({...projForm,role:e.target.value})}/>
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
              language={cvData.Language}
            />
          </div>

          {/* Tanggal Selesai */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Tanggal Selesai  <span className="text-red-700">*</span>
            </label>
            <ModernDateField
              disabled={projForm.isCurrent}
              min={projForm.startDate || undefined}
              value={projForm.endDate}
              onChange={(value) => setProjForm({ ...projForm, endDate: value })}
              placeholder={projForm.isCurrent ? "Proyek masih berjalan" : "Pilih tanggal selesai"}
              language={cvData.Language}
            />
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-[var(--foreground)] mt-2">
                {/* Checkbox asli disembunyikan total secara visual */}
                <input
                  type="checkbox"
                  checked={projForm.isCurrent}
                  onChange={(e) => setProjForm({ ...projForm, isCurrent: e.target.checked, endDate: e.target.checked ? "" : projForm.endDate })}
                  // Ditambahkan !bg-transparent dan !appearance-none untuk membunuh paksaan dari globals.css
                  className="sr-only peer !bg-transparent !appearance-none"
                />
                
                {/* Kotak Custom Tiruan - Dikontrol penuh lewat Tailwind dan CSS variables */}
                <div className="
                  flex h-4 w-4 shrink-0 items-center justify-center rounded border 
                  border-[color-mix(in_oklab,var(--color-soft)_80%,white)] 
                  bg-[color-mix(in_oklab,var(--color-surface-container)_90%,white)] 
                  transition-all duration-200
                  peer-focus:ring-2 peer-focus:ring-[var(--color-primary)]/40
                  peer-checked:border-[var(--color-primary)] peer-checked:bg-[var(--color-primary)]
                ">
                  {/* Ikon centang internal murni SVG */}
                  <svg
                    className="h-2.5 w-2.5 text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="3.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <span>Proyek masih Berjalan</span>
              </label>
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Tech Stack <span className="text-red-700">*</span>
            </label>
            <input className={inputClass}
              placeholder="Python, React, dll"
              value={projForm.stack}
              onChange={e=>setProjForm({...projForm,stack:e.target.value})}/>
          </div>

          {/* Link Portofolio */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Link Portofolio
            </label>
            <input
              className={inputClass}
                placeholder="https://github.com/username"
              value={projForm.link || ""}
              onChange={e => {setProjForm({ ...projForm, link: e.target.value });
              }}
            />
          </div>

          {/* Deskripsi */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">
              Deskripsi <span className="text-red-700">*</span>
            </label>
            <textarea
              ref={projDescRef}
              className={`${inputClass} resize-none overflow-hidden`}
                placeholder="Jelaskan tujuan, peran kamu, teknologi, dan hasilnya."
              value={projForm.desc}
              onChange={e => {
                setProjForm({ ...projForm, desc: e.target.value });
                autoResize(e.target);
              }}
            />
          </div>

          {/* INDICATOR EDIT */}
          {editingProjIndex !== null && (
            <p className="block text-sm font-bold mb-1">
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
            {editingProjIndex !== null ? "Simpan perubahan" : "Tambah proyek"}
          </button>
        </div>

        {/* LIST */}
        <div className="builder-list-panel mt-8 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-5 rounded-xl border">
          <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-4 flex items-center gap-2">
            Proyek
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
                className="builder-list-item bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] border p-4 rounded-lg shadow-sm hover:shadow-md transition"
              >
                <div>
                  <p className="font-bold text-[color-mix(in_oklab,var(--foreground)_92%,black)]">
                    {e.Nama_Proyek} {e.Role && `| ${e.Role}`}
                  </p>
                  <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_78%,white)]">
                    {formatDurationLabel(e.Duration, cvData.Language)}
                  </p>
                  <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_78%,white)]">
                    {e.Tech_Stack}
                  </p>
                </div>

                <div className="builder-icon-actions">
                  <button
                    onClick={() => handleEditProj(i)}
                    aria-label="Edit proyek"
                    title="Edit proyek"
                    className="cursor-pointer text-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] p-2 rounded-full transition"
                  >
                    <EditIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => handleDeleteProj(i)}
                    aria-label="Hapus proyek"
                    title="Hapus proyek"
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
        <div className="builder-inner-panel bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-6 rounded-xl border space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">
              Hard Skills
            </label>
            <textarea
              value={hardSkillsText}
              placeholder="Python, SQL, Tableau"
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
              placeholder="Leadership, teamwork, communication"
              onChange={e => setSoftSkillsText(e.target.value)}
              onBlur={() => handleSkillsBlur("soft")}
              className={`${inputClass} min-h-24`}
            />
          </div>
        </div>
      </>
      )}

      <div className="builder-form-actions mt-6">
        <button 
        onClick={prevStep}
        className="cursor-pointer px-6 py-2 bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] rounded-lg font-bold hover:bg-[color-mix(in_oklab,var(--color-soft)_75%,white)] flex items-center gap-2"
        ><ArrowBackwardIcon className="h-4 w-4" />Kembali</button>
        <button 
        onClick={nextStep}
        className="cursor-pointer px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] flex items-center gap-2"
        >Lanjut<ArrowForwardIcon className="h-4 w-4" /></button>
      </div>

      <CustomModal {...modalProps} />
    </div>
  );
}


