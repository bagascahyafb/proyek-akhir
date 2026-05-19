import { useEffect, useState } from "react";
import axios from "axios";
import { CVDataState, StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal"; // IMPORT HOOK MODAL
import EditableText from "@/components/editabletext";
import { ArrowBackwardIcon, AutoEnhanceIcon, FilePdfIcon, FileWordIcon, WarningIcon } from "./icons";

const formatAsBullets = (text: string) => {
  if (!text) return "\u2022 ";
  return text
    .split("\n")
    .map((line) => `\u2022 ${line.replace(/^(?:[-*]|\u2022)\s?/, "")}`)
    .join("\n");
};

const parseFromBullets = (text: string) =>
  text
    .split("\n")
    .map((line) => line.replace(/^(?:[-*]|\u2022)\s?/, ""))
    .join("\n");

const extractYear = (value?: string) => {
  if (!value) return "";
  const match = value.match(/\b(?:19|20)\d{2}\b/);
  return match ? match[0] : "";
};

const extractLastYear = (value?: string) => {
  if (!value) return "";
  const matches = value.match(/\b(?:19|20)\d{2}\b/g);
  return matches ? matches[matches.length - 1] : "";
};

const formatCertificateYearRange = (startYear?: string, expiryYear?: string) => {
  const start = extractYear(startYear);
  const expiry = extractLastYear(expiryYear);

  if (start && expiry && start !== expiry) return `${start} - ${expiry}`;
  return start || expiry || "";
};

const removeEmptyBulletLine = (displayValue: string, cursorPos: number) => {
  const currentLineStart = displayValue.lastIndexOf("\n", Math.max(cursorPos - 1, 0)) + 1;
  const nextNewLine = displayValue.indexOf("\n", cursorPos);
  const currentLineEnd = nextNewLine === -1 ? displayValue.length : nextNewLine;

  if (currentLineStart === 0 && currentLineEnd === displayValue.length) {
    return { value: "\u2022 ", cursor: 2 };
  }

  let nextValue: string;
  let nextCursor: number;

  if (currentLineStart === 0) {
    const cutTo = currentLineEnd < displayValue.length ? currentLineEnd + 1 : currentLineEnd;
    nextValue = displayValue.slice(cutTo);
    nextCursor = 0;
  } else {
    const cutFrom = currentLineStart - 1;
    const cutTo = currentLineEnd < displayValue.length ? currentLineEnd + 1 : currentLineEnd;
    nextValue = displayValue.slice(0, cutFrom) + displayValue.slice(cutTo);
    nextCursor = cutFrom;
  }

  if (!nextValue) {
    return { value: "\u2022 ", cursor: 2 };
  }

  return { value: nextValue, cursor: Math.max(0, nextCursor) };
};

export default function Step5Review({ cvData, setCvData, apiUrl, prevStep }: StepProps) {
  const [loading, setLoading] = useState(false);

  const [statusMsg, setStatusMsg] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    personalInfo: false,
    education: false,
    experience: false,
    projects: false,
    hardSkills: false,
    softSkills: false,
    certifications: false,
    awards: false
  });
  const [selectedContent, setSelectedContent] = useState(() => ({
    personalInfo: {
      nama: true,
      email: true,
      hp: true,
      linkedIn: true,
      alamat: true,
      portfolio: true,
      summary: true
    },
    education: cvData.Education.map(() => true),
    experience: cvData.Experience.map(() => true),
    projects: cvData.Projects.map(() => true),
    hardSkills: cvData.Skills_Hard.map(() => true),
    softSkills: cvData.Skills_Soft.map(() => true),
    certifications: cvData.Certifications.map(() => true),
    awards: cvData.Awards.map(() => true)
  }));

  const { modalProps, showAlert, showSuccess } = useModal();

  
  const handleBulletKeyDown =
    (onPlainTextChange: (nextPlain: string) => void) =>
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter" && e.key !== "Backspace") return;

      const textarea = e.currentTarget;
      const displayValue = textarea.value;
      const cursorPos = textarea.selectionStart;
      const currentLineStart = displayValue.lastIndexOf("\n", Math.max(cursorPos - 1, 0)) + 1;
      const nextNewLine = displayValue.indexOf("\n", cursorPos);
      const currentLineEnd = nextNewLine === -1 ? displayValue.length : nextNewLine;
      const currentLine = displayValue.slice(currentLineStart, currentLineEnd);
      const currentWithoutBullet = currentLine.replace(/^(?:[-*]|\u2022)\s?/, "");
      const isEmptyBullet = currentWithoutBullet.length === 0;

      if (!isEmptyBullet) return;

      e.preventDefault();
      const removed = removeEmptyBulletLine(displayValue, cursorPos);
      onPlainTextChange(parseFromBullets(removed.value));

      requestAnimationFrame(() => {
        textarea.selectionStart = removed.cursor;
        textarea.selectionEnd = removed.cursor;
      });
    };

  const toggleExpandedSection = (key: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  useEffect(() => {
    setSelectedContent(prev => ({
      ...prev,
      education: cvData.Education.map((_, index) => prev.education[index] ?? true),
      experience: cvData.Experience.map((_, index) => prev.experience[index] ?? true),
      projects: cvData.Projects.map((_, index) => prev.projects[index] ?? true),
      hardSkills: cvData.Skills_Hard.map((_, index) => prev.hardSkills[index] ?? true),
      softSkills: cvData.Skills_Soft.map((_, index) => prev.softSkills[index] ?? true),
      certifications: cvData.Certifications.map((_, index) => prev.certifications[index] ?? true),
      awards: cvData.Awards.map((_, index) => prev.awards[index] ?? true)
    }));
  }, [
    cvData.Education,
    cvData.Experience,
    cvData.Projects,
    cvData.Skills_Hard,
    cvData.Skills_Soft,
    cvData.Certifications,
    cvData.Awards
  ]);

  const toggleArrayItem = (
    key: "education" | "experience" | "projects" | "hardSkills" | "softSkills" | "certifications" | "awards",
    index: number
  ) => {
    setSelectedContent(prev => ({
      ...prev,
      [key]: prev[key].map((item, i) => (i === index ? !item : item))
    }));
  };

  const buildDownloadPayload = (): CVDataState => {
    const { Personal_Info, ...rest } = cvData;

    return {
      ...rest,
      Personal_Info: {
        Nama: selectedContent.personalInfo.nama ? Personal_Info.Nama : "",
        Email: selectedContent.personalInfo.email ? Personal_Info.Email : "",
        HP: selectedContent.personalInfo.hp ? Personal_Info.HP : "",
        LinkedIn: selectedContent.personalInfo.linkedIn ? Personal_Info.LinkedIn : "",
        Alamat: selectedContent.personalInfo.alamat ? Personal_Info.Alamat : "",
        Portfolio: selectedContent.personalInfo.portfolio ? Personal_Info.Portfolio : "",
        Summary: selectedContent.personalInfo.summary ? Personal_Info.Summary : ""
      },
      Education: cvData.Education.filter((_, index) => selectedContent.education[index]),
      Experience: cvData.Experience.filter((_, index) => selectedContent.experience[index]),
      Projects: cvData.Projects.filter((_, index) => selectedContent.projects[index]),
      Skills_Hard: cvData.Skills_Hard.filter((_, index) => selectedContent.hardSkills[index]),
      Skills_Soft: cvData.Skills_Soft.filter((_, index) => selectedContent.softSkills[index]),
      Certifications: cvData.Certifications.filter((_, index) => selectedContent.certifications[index]),
      Awards: cvData.Awards.filter((_, index) => selectedContent.awards[index])
    };
  };

  // Handler Enhance AI
  const handleEnhance = async () => {
    if (!cvData.Personal_Info.Nama) return showAlert("Perhatian", "Data kosong! Isi Nama Lengkap dulu di Step 1.");
    
    setLoading(true);
    setStatusMsg("Sedang menghubungi AI untuk memoles CV Anda... (Bisa memakan waktu 10-20 detik)");

    try {
        const res = await axios.post(`${apiUrl}/enhance-cv`, cvData,  {
          headers: { 
            "ngrok-skip-browser-warning": "true"
        } 
        });
        setCvData(res.data);
        showSuccess("Enhance selesai", "Sistem berhasil memoles isi CV Anda. Bahasa sudah disesuaikan dan kalimatnya sudah diperbaiki.");
    } catch (error) {
        console.error(error);
        showAlert("Error", "Gagal menghubungi server AI. Pastikan backend Python sedang berjalan.");
    } finally {
        setLoading(false);
        setStatusMsg("");
    }
  };

  // Handler Download
  const handleDownload = async () => {
    const downloadPayload = buildDownloadPayload();
    const hasSelectedContent =
      Object.values(downloadPayload.Personal_Info).some(value => String(value).trim() !== "") ||
      downloadPayload.Education.length > 0 ||
      downloadPayload.Experience.length > 0 ||
      downloadPayload.Projects.length > 0 ||
      downloadPayload.Skills_Hard.length > 0 ||
      downloadPayload.Skills_Soft.length > 0 ||
      downloadPayload.Certifications.length > 0 ||
      downloadPayload.Awards.length > 0;

    if (!hasSelectedContent) {
      return showAlert("Perhatian", "Pilih minimal satu isi data yang ingin dimasukkan ke CV.");
    }

    setLoading(true);
    setStatusMsg("Sedang men-generate file .docx...");
    
    try {
      // 1. UBAH responseType JADI arraybuffer
      const res = await axios.post(`${apiUrl}/generate-docx`, downloadPayload, {
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
      
      showSuccess("File berhasil dibuat", "Sistem berhasil generate dan mengunduh CV Anda. Silakan cek folder Download.");

    } catch (error) {
      console.error(error);
      showAlert("Error", "Gagal mengunduh file. Terjadi kesalahan pada server.");
    } finally {
        setLoading(false);
        setStatusMsg("");
    }
  };

  const handleDownloadPDF = async () => {
    const downloadPayload = buildDownloadPayload();
  
    const hasSelectedContent =
      Object.values(downloadPayload.Personal_Info).some(value => String(value).trim() !== "") ||
      downloadPayload.Education.length > 0 ||
      downloadPayload.Experience.length > 0 ||
      downloadPayload.Projects.length > 0 ||
      downloadPayload.Skills_Hard.length > 0 ||
      downloadPayload.Skills_Soft.length > 0 ||
      downloadPayload.Certifications.length > 0 ||
      downloadPayload.Awards.length > 0;
  
    if (!hasSelectedContent) {
      return showAlert("Perhatian", "Pilih minimal satu isi data yang ingin dimasukkan ke CV.");
    }
  
    setLoading(true);
    setStatusMsg("Sedang men-generate file PDF...");
  
    try {
      const res = await axios.post(`${apiUrl}/generate-pdf`, downloadPayload, {
        responseType: "blob",
        headers: { 
          "ngrok-skip-browser-warning": "true"
        }
      });
  
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
  
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `CV_${cvData.Personal_Info.Nama.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
  
      showSuccess("File berhasil dibuat", "PDF berhasil diunduh.");
  
    } catch (error) {
      console.error(error);
      showAlert("Error", "Gagal mengunduh PDF.");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  // AUTO RESIZE TEXTAREA SUMMARY
  useEffect(() => {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [cvData.Personal_Info.Summary]);

  return (
    <div className="bg-[color-mix(in_oklab,var(--color-surface)_94%,white)] p-8 rounded-2xl shadow-xl text-[var(--foreground)] relative overflow-hidden animate-fade-in-up">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-surface)_92%,white)] z-50 flex flex-col items-center justify-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[var(--color-primary)] mb-4"></div>
            <p className="font-bold text-lg text-[color-mix(in_oklab,var(--foreground)_90%,black)] animate-pulse text-center">{statusMsg}</p>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-6 border-b pb-4">5. Review & Finalisasi</h2>
      <div className="space-y-8">
    {/* ===== TOP SECTION ===== */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
      {/* ===== LEFT (DATA) ===== */}
      <div className="space-y-6 h-full flex flex-col">
        {/* LANGUAGE */}
        <div className="bg-[color-mix(in_oklab,var(--color-surface)_94%,white)] border rounded-2xl shadow p-6">
          <label className="block font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-3 text-lg">
            Pilih Bahasa CV Output
          </label>
          <select 
            value={cvData.Language} 
            onChange={(e) => setCvData({...cvData, Language: e.target.value})}
            className="w-full border p-4 rounded-lg bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] text-lg"
          >
            <option value="English">English</option>
            <option value="Indonesia">Indonesia</option>
          </select>
        </div>
        <div>
        <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-2">Preview Summary (About Me)</h3>
        <textarea 
            className="w-full border p-4 rounded-lg bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] h-32 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
            value={cvData.Personal_Info.Summary || ""}
            onChange={(e) => setCvData({...cvData, Personal_Info: {...cvData.Personal_Info, Summary: e.target.value}})}
            placeholder="Summary akan otomatis diisi oleh AI saat Anda klik tombol Enhance..."
        />
        {/* AI BUTTON */}
        <button 
          type="button"
          onClick={handleEnhance}
          className="cursor-pointer w-full bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <AutoEnhanceIcon className="h-5 w-5" />
          Enhance with AI
        </button>      
        </div>
        {/* STATS */}
        {/* <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] p-3 rounded-lg">
            <div className="text-xl font-bold text-[var(--color-primary)]">{cvData.Education.length}</div>
            <div className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">Pendidikan</div>
          </div>
          <div className="bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] p-3 rounded-lg">
            <div className="text-xl font-bold text-[var(--color-primary)]">{cvData.Experience.length}</div>
            <div className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">Pengalaman</div>
          </div>
          <div className="bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] p-3 rounded-lg">
            <div className="text-xl font-bold text-[var(--color-accent)]">{cvData.Projects.length}</div>
            <div className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">Proyek</div>
          </div>
          <div className="bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] p-3 rounded-lg">
            <div className="text-xl font-bold text-[color-mix(in_oklab,var(--color-accent)_72%,black)]">
              {cvData.Certifications.length + cvData.Awards.length}
            </div>
            <div className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">Sertifikat</div>
          </div>
        </div> */}
      </div>

      {/* ===== RIGHT (CHECKLIST PREVIEW = SUMMARY LO) ===== */}
      <div className="bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-6 rounded-xl border h-full">

        <div>
          <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-2">Preview Summary (About Me)</h3>
          <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,white)]">
            User bisa memilih item tertentu. Yang dicentang akan masuk ke CV.
          </p>
        </div>

        <div className="mt-6 max-h-[400px] overflow-y-auto pr-2 space-y-4">

          {[
            {
              title: "Pendidikan",
              items: cvData.Education.map(item => `${item.Institusi} - ${item.Jurusan} (${item.Tahun_Lulus})`),
              selected: selectedContent.education,
              keyName: "education" as const,
              expandKey: "education" as const
            },
            {
              title: "Pengalaman",
              items: cvData.Experience.map(item => `${item.Posisi} - ${item.Perusahaan} (${item.Durasi})`),
              selected: selectedContent.experience,
              keyName: "experience" as const,
              expandKey: "experience" as const
            },
            {
              title: "Proyek",
              items: cvData.Projects.map(item => `${item.Nama_Proyek} - ${item.Role}`),
              selected: selectedContent.projects,
              keyName: "projects" as const,
              expandKey: "projects" as const
            },
            {
              title: "Hard Skills",
              items: cvData.Skills_Hard,
              selected: selectedContent.hardSkills,
              keyName: "hardSkills" as const,
              expandKey: "hardSkills" as const
            },
            {
              title: "Soft Skills",
              items: cvData.Skills_Soft,
              selected: selectedContent.softSkills,
              keyName: "softSkills" as const,
              expandKey: "softSkills" as const
            },
            {
              title: "Sertifikat",
              items: cvData.Certifications.map(item => {
                const yearRange = formatCertificateYearRange(item.Tahun, item.Masa_Berlaku);
                return `${item.Nama} - ${item.Penerbit}${yearRange ? ` (${yearRange})` : ""}`;
              }),
              selected: selectedContent.certifications,
              keyName: "certifications" as const,
              expandKey: "certifications" as const
            },
            {
              title: "Penghargaan",
              items: cvData.Awards.map(item => `${item.Nama_Award} - ${item.Pemberi} (${item.Tahun})`),
              selected: selectedContent.awards,
              keyName: "awards" as const,
              expandKey: "awards" as const
            }
          ].map((section) => (
            <div key={section.title} className="rounded-xl border bg-[color-mix(in_oklab,var(--color-surface)_96%,white)]">
              <button
                type="button"
                onClick={() => toggleExpandedSection(section.expandKey)}
                className="w-full flex items-center justify-between px-4 py-4 text-left"
              >
                <div>
                  <h4 className="font-semibold text-[var(--foreground)]">{section.title}</h4>
                  <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,white)]">{section.items.length} item</p>
                </div>
                <span className="text-sm font-semibold text-[var(--color-primary)]">
                  {expandedSections[section.expandKey] ? "Sembunyikan" : "Tampilkan"}
                </span>
              </button>

              {expandedSections[section.expandKey] && (
                <div className="px-4 pb-4 space-y-2">
                  {section.items.map((item, index) => (
                    <label
                      key={index}
                      className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer ${
                        section.selected[index]
                          ? "border-[var(--color-accent)] bg-[color-mix(in_oklab,var(--color-soft)_35%,white)]"
                          : "border-[color-mix(in_oklab,var(--color-soft)_55%,white)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={section.selected[index]}
                        onChange={() => toggleArrayItem(section.keyName, index)}
                      />
                      <p className="text-sm">{item}</p>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

        </div>
      </div>
    </div>
      {/* ===== BOTTOM (CV PREVIEW) ===== */}
      <div className="bg-[color-mix(in_oklab,var(--color-surface)_94%,white)] border rounded-2xl shadow p-6">
        <h3 className="font-bold text-lg mb-4">CV Preview (Editable)</h3>

        <div className="bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] border rounded-lg p-8 max-h-[600px] overflow-y-auto text-[14px] leading-relaxed">

          {/* HEADER */}
          <div className="text-center mb-1 space-y-1">
            <EditableText
              value={cvData.Personal_Info.Nama}
              onChange={(val) =>
                setCvData({
                  ...cvData,
                  Personal_Info: { ...cvData.Personal_Info, Nama: val }
                })
              }
              className="text-xl font-bold uppercase text-center"
            />
            <EditableText
              value={[
                cvData.Personal_Info.HP,
                cvData.Personal_Info.Email,
                cvData.Personal_Info.LinkedIn,
                cvData.Personal_Info.Alamat,
                cvData.Personal_Info.Portfolio
              ].filter(Boolean).join(" | ")}
              onChange={(val) => {
                const parts = val.split("|").map(v => v.trim());
                setCvData({
                  ...cvData,
                  Personal_Info: {
                    ...cvData.Personal_Info,
                    HP: parts[0] || "",
                    Email: parts[1] || "",
                    LinkedIn: parts[2] || "",
                    Alamat: parts[3] || "",
                    Portfolio: parts[4] || ""
                  }
                });
              }}
              className="text-xs text-[color-mix(in_oklab,var(--foreground)_78%,white)] text-center"
            />

          </div>

          {/* SUMMARY */}
          <div className="mb-1">
            <h4 className="font-bold border-b border-black text-sm mb-1">
              Professional Summary
            </h4>
            <EditableText
              value={cvData.Personal_Info.Summary}
              onChange={(val) =>
                setCvData({
                  ...cvData,
                  Personal_Info: { ...cvData.Personal_Info, Summary: val }
                })
              }
              className="text-sm text-justify hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
            />
          </div>

          {/* EXPERIENCE */}
          {cvData.Experience.length > 0 && (
            <div className="mb-1">
              <h4 className="font-bold border-b border-black text-sm mb-1">
                Work Experience
              </h4>

              {cvData.Experience.map((exp, i) => (
                <div key={i} className="mb-1 space-y-1">

                  <EditableText
                    value={`${exp.Posisi} | ${exp.Perusahaan}`}
                    onChange={(val) => {
                      const [pos, comp] = val.split("|");
                      const updated = [...cvData.Experience];
                      updated[i].Posisi = pos?.trim() || "";
                      updated[i].Perusahaan = comp?.trim() || "";
                      setCvData({ ...cvData, Experience: updated });
                    }}
                    className="font-semibold text-sm hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
                  />

                  <EditableText
                    value={exp.Durasi}
                    onChange={(val) => {
                      const updated = [...cvData.Experience];
                      updated[i].Durasi = val;
                      setCvData({ ...cvData, Experience: updated });
                    }}
                    className="text-xs italic text-[color-mix(in_oklab,var(--foreground)_65%,white)] hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
                  />

                  <EditableText
                    value={formatAsBullets(exp.Deskripsi)}
                    onChange={(val) => {
                      const updated = [...cvData.Experience];
                      updated[i].Deskripsi = parseFromBullets(val);
                      setCvData({ ...cvData, Experience: updated });
                    }}
                    onKeyDown={handleBulletKeyDown((nextPlain) => {
                      const updated = [...cvData.Experience];
                      updated[i].Deskripsi = nextPlain;
                      setCvData({ ...cvData, Experience: updated });
                    })}
                    className="text-sm ml-3 hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
                  />

                </div>
              ))}
            </div>
          )}

          {/* PROJECTS */}
          {cvData.Projects.length > 0 && (
            <div className="mb-1">
              <h4 className="font-bold border-b border-black text-sm mb-1">
                Projects
              </h4>

              {cvData.Projects.map((proj, i) => (
                <div key={i} className="mb-1 space-y-1">

                  <EditableText
                    value={proj.Nama_Proyek}
                    onChange={(val) => {
                      const updated = [...cvData.Projects];
                      updated[i].Nama_Proyek = val;
                      setCvData({ ...cvData, Projects: updated });
                    }}
                    className="font-semibold text-sm hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
                  />

                  <EditableText
                    value={proj.Duration}
                    onChange={(val) => {
                      const updated = [...cvData.Projects];
                      updated[i].Duration = val;
                      setCvData({ ...cvData, Projects: updated });
                    }}
                    className="text-xs italic text-[color-mix(in_oklab,var(--foreground)_65%,white)] hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
                  />

                  <EditableText
                    value={proj.Tech_Stack}
                    onChange={(val) => {
                      const updated = [...cvData.Projects];
                      updated[i].Tech_Stack = val;
                      setCvData({ ...cvData, Projects: updated });
                    }}
                    className="text-xs text-[color-mix(in_oklab,var(--foreground)_78%,white)] hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
                  />

                  <EditableText
                    value={formatAsBullets(proj.Deskripsi)}
                    onChange={(val) => {
                      const updated = [...cvData.Projects];
                      updated[i].Deskripsi = parseFromBullets(val);
                      setCvData({ ...cvData, Projects: updated });
                    }}
                    onKeyDown={handleBulletKeyDown((nextPlain) => {
                      const updated = [...cvData.Projects];
                      updated[i].Deskripsi = nextPlain;
                      setCvData({ ...cvData, Projects: updated });
                    })}
                    className="text-sm ml-3 hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
                  />

                </div>
              ))}
            </div>
          )}

          {/* EDUCATION */}
          {cvData.Education.length > 0 && (
            <div className="mb-1">
              <h4 className="font-bold border-b border-black text-sm mb-1">
                Education
              </h4>

              {cvData.Education.map((edu, i) => (
                <div key={i} className="mb-1 space-y-1">

                  <EditableText
                    value={`${edu.Institusi} (${edu.Tahun_Lulus})`}
                    onChange={(val) => {
                      const updated = [...cvData.Education];
                      const [inst, year] = val.split("(");
                      updated[i].Institusi = inst?.trim() || "";
                      updated[i].Tahun_Lulus = year?.replace(")", "").trim() || "";
                      setCvData({ ...cvData, Education: updated });
                    }}
                    className="font-semibold text-sm hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
                  />

                  <EditableText
                    value={`${edu.Gelar || ""} ${edu.Jurusan ? `in ${edu.Jurusan}` : ""}`}
                    onChange={(val) => {
                      const updated = [...cvData.Education];
                      updated[i].Jurusan = val;
                      setCvData({ ...cvData, Education: updated });
                    }}
                    className="text-sm italic hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
                  />

                </div>
              ))}
            </div>
          )}

          {/* SKILLS */}
          {(cvData.Skills_Hard.length > 0 || cvData.Skills_Soft.length > 0) && (
            <div className="mb-1">
              <h4 className="font-bold border-b border-black text-sm mb-1">
                Skills
              </h4>

              <EditableText
                value={cvData.Skills_Hard.join(", ")}
                onChange={(val) =>
                  setCvData({
                    ...cvData,
                    Skills_Hard: val.split(",").map(v => v.trim())
                  })
                }
                className="text-sm hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
              />

              <EditableText
                value={cvData.Skills_Soft.join(", ")}
                onChange={(val) =>
                  setCvData({
                    ...cvData,
                    Skills_Soft: val.split(",").map(v => v.trim())
                  })
                }
                className="text-sm hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
              />

            </div>
          )}

          {/* CERTIFICATIONS & AWARDS */}
          {(cvData.Certifications.length > 0 || cvData.Awards.length > 0) && (
            <div>
              <h4 className="font-bold border-b border-black text-sm mb-1">
                Certifications & Awards
              </h4>

              {[...cvData.Certifications.map(c => {
                const yearRange = formatCertificateYearRange(c.Tahun, c.Masa_Berlaku);
                return `${c.Nama} - ${c.Penerbit}${yearRange ? ` (${yearRange})` : ""}`;
              }),
                ...cvData.Awards.map(a => `Award: ${a.Nama_Award} - ${a.Pemberi} (${a.Tahun})`)
              ].map((item, i) => (
                <EditableText
                  key={i}
                  value={item}
                  onChange={() => {}}
                  className="text-sm ml-3 hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)]"
                />
              ))}

            </div>
          )}

        </div>
      </div>
    </div>

      {/* ACTION BUTTONS */}
    <div className="flex flex-col gap-4 mt-5">   
      <p className="mb-1 flex items-center gap-2 p-4 text-sm text-[color-mix(in_oklab,var(--color-accent)_80%,black)] bg-[color-mix(in_oklab,var(--color-accent)_35%,white)] border border-[color-mix(in_oklab,var(--color-accent)_60%,white)] rounded-lg">
        <WarningIcon className="h-5 w-5 shrink-0" />
        <span>Pastikan hasil CV sudah benar sebelum mengunduh.</span>
      </p> 
      <div className="flex flex-col md:flex-row gap-4">
        {/* DOCX (yang lama) */}
        <button 
          type="button"
          onClick={handleDownload}
          className="cursor-pointer w-full bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <FileWordIcon className="h-5 w-5" />
          Download DOCX
        </button>

        {/* PDF (baru) */}
        <button 
          type="button"
          onClick={handleDownloadPDF}
          className="cursor-pointer w-full bg-[var(--color-accent)] hover:bg-[color-mix(in_oklab,var(--color-accent)_82%,black)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <FilePdfIcon className="h-5 w-5" />
          Download PDF
        </button> 
      </div>
        <button type="button" onClick={prevStep} className="cursor-pointer mt-4 text-[var(--color-primary)] font-bold hover:text-[color-mix(in_oklab,var(--foreground)_85%,black)] underline transition flex items-center justify-center gap-2">
          <ArrowBackwardIcon className="h-4 w-4" />
          Kembali edit data
        </button>
      </div>

      {/* RENDER MODAL DI BAWAH */}
      <CustomModal {...modalProps} />
    </div>
  );
}










