"use client";

import { useState } from "react";
import axios from "axios";
import { CVDataState, SelectedCVContent, StepProps } from "@/types";
import { BuilderLoadingOverlay, useModal, CustomModal } from "./custommodal";
import EditableText from "@/components/editabletext";
import { ArrowBackwardIcon, EditIcon, FilePdfIcon, FileWordIcon, WarningIcon } from "./icons";

type FinalizationProps = StepProps & {
  selectedContent: SelectedCVContent;
};

const formatAsBullets = (text: string) => {
  if (!text) return "\u2022 ";
  return text
    .split("\n")
    .map(line => `\u2022 ${line.replace(/^(?:[-*]|\u2022)\s?/, "")}`)
    .join("\n");
};

const parseFromBullets = (text: string) =>
  text
    .split("\n")
    .map(line => line.replace(/^(?:[-*]|\u2022)\s?/, ""))
    .join("\n");

// ── Date helpers (same logic as experience.tsx) ──────────────────────────────
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
    jan:"01",januari:"01",january:"01",feb:"02",februari:"02",february:"02",
    mar:"03",maret:"03",march:"03",apr:"04",april:"04",may:"05",mei:"05",
    jun:"06",juni:"06",june:"06",jul:"07",juli:"07",july:"07",aug:"08",
    agu:"08",ags:"08",agustus:"08",august:"08",sep:"09",sept:"09",september:"09",
    oct:"10",okt:"10",oktober:"10",october:"10",nov:"11",november:"11",
    dec:"12",des:"12",desember:"12",december:"12",
  };
  const month = monthMap[match[1]];
  return month ? `${match[2]}-${month}` : "";
};

const parseMonthValue = (value: string) =>
  normalizeMonthValue(value) || parseMonthLabel(value);

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
  const endLabel = isCurrent
    ? getDateLocale(language) === "id-ID" ? "Sekarang" : "Present"
    : formatDateLabel(endRaw, language);
  return endLabel ? `${startLabel} - ${endLabel}` : startLabel;
};
// ─────────────────────────────────────────────────────────────────────────────

const extractYear = (value?: string | number) => {
  if (!value) return "";
  const match = String(value).match(/\b(?:19|20)\d{2}\b/);
  return match ? match[0] : "";
};

const extractLastYear = (value?: string | number) => {
  if (!value) return "";
  const matches = String(value).match(/\b(?:19|20)\d{2}\b/g);
  return matches ? matches[matches.length - 1] : "";
};

const formatCertificateYearRange = (startYear?: string | number, expiryYear?: string | number) => {
  const start = extractYear(startYear);
  const expiry = extractLastYear(expiryYear);
  if (start && expiry && start !== expiry) {
    return `${start} - ${expiry}`;
  }
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

export default function Step6Finalization({
  cvData,
  setCvData,
  apiUrl,
  prevStep,
  selectedContent
}: FinalizationProps) {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
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

  const buildDownloadPayload = (): CVDataState => {
    const { Personal_Info, ...rest } = cvData;
    return {
      ...rest,
      Personal_Info: { ...Personal_Info },
      Education: cvData.Education.filter((_, index) => selectedContent.education[index]),
      Experience: cvData.Experience.filter((_, index) => selectedContent.experience[index]),
      Projects: cvData.Projects.filter((_, index) => selectedContent.projects[index]),
      Skills_Hard: cvData.Skills_Hard.filter((_, index) => selectedContent.hardSkills[index]),
      Skills_Soft: cvData.Skills_Soft.filter((_, index) => selectedContent.softSkills[index]),
      Certifications: cvData.Certifications.filter((_, index) => selectedContent.certifications[index]),
      Awards: cvData.Awards.filter((_, index) => selectedContent.awards[index])
    };
  };

  const handleDownload = async () => {
    const downloadPayload = buildDownloadPayload();
    // if (!validateSelectedContent(downloadPayload)) return;

    setLoading(true);
    setStatusMsg("Membuat file DOCX...");

    try {
      const res = await axios.post(`${apiUrl}/generate-docx`, downloadPayload, {
        responseType: "arraybuffer",
        headers: { "ngrok-skip-browser-warning": "true" }
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `CV_${cvData.Personal_Info.Nama.replace(/\s+/g, "_")}_${cvData.Language}.docx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      showSuccess("DOCX siap", "File sudah diunduh.");
    } catch (error) {
      console.error(error);
      showAlert("Gagal mengunduh DOCX", "Coba lagi setelah backend berjalan.");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  const handleDownloadPDF = async () => {
    const downloadPayload = buildDownloadPayload();
    // if (!validateSelectedContent(downloadPayload)) return;

    setLoading(true);
    setStatusMsg("Membuat file PDF...");

    try {
      const res = await axios.post(`${apiUrl}/generate-pdf`, downloadPayload, {
        responseType: "blob",
        headers: { "ngrok-skip-browser-warning": "true" }
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `CV_${cvData.Personal_Info.Nama.replace(/\s+/g, "_")}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      showSuccess("PDF siap", "File sudah diunduh.");
    } catch (error) {
      console.error(error);
      showAlert("Gagal mengunduh PDF", "Coba lagi setelah backend berjalan.");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  const selectedHardSkills = cvData.Skills_Hard
    .map((skill, index) => ({ skill, index }))
    .filter(({ index }) => selectedContent.hardSkills[index]);

  const selectedSoftSkills = cvData.Skills_Soft
    .map((skill, index) => ({ skill, index }))
    .filter(({ index }) => selectedContent.softSkills[index]);

  const selectedCertifications = cvData.Certifications
    .map((certification, index) => ({ certification, index }))
    .filter(({ index }) => selectedContent.certifications[index]);

  const selectedAwards = cvData.Awards
    .map((award, index) => ({ award, index }))
    .filter(({ index }) => selectedContent.awards[index]);

  return (
    <div>
      {loading && <BuilderLoadingOverlay message={statusMsg} />}
      <div className="flex flex-col gap-4 mb-5">
        <p className="mb-1 flex items-center gap-2 p-4 text-sm text-[color-mix(in_oklab,var(--color-accent)_80%,black)] bg-[color-mix(in_oklab,var(--color-accent)_35%,white)] border border-[color-mix(in_oklab,var(--color-accent)_60%,white)] rounded-lg">
          <WarningIcon className="h-5 w-5 shrink-0" />
          <span>Cek lagi sebelum mengunduh.</span>
        </p>

        <div className="flex flex-col md:flex-row gap-4">
          <button
            type="button"
            onClick={handleDownload}
            className="cursor-pointer w-full bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <FileWordIcon className="h-5 w-5" />
            Download DOCX
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="cursor-pointer w-full bg-[var(--color-accent)] hover:bg-[color-mix(in_oklab,var(--color-accent)_82%,black)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <FilePdfIcon className="h-5 w-5" />
            Download PDF
          </button>
        </div>
      </div>
      <div className="builder-inner-panel bg-[color-mix(in_oklab,var(--color-surface)_94%,white)] border rounded-2xl shadow p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-lg">Preview CV</h3>
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--color-primary)_25%,white)] bg-[color-mix(in_oklab,var(--color-primary)_8%,transparent)] px-3 py-1 text-xs font-medium">
            <EditIcon className="h-3.5 w-3.5" />
            <span>Klik teks untuk edit</span>
          </div>
        </div>
        <div className="builder-document-preview bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] border rounded-lg p-8 text-[14px] leading-relaxed">
          {/* HEADER */}
          <div className="text-center mb-4 space-y-1">
            <h1 className="text-xl font-bold uppercase text-[var(--foreground)]/50">{cvData.Personal_Info.Nama}</h1>
            <p className="text-sm text-[var(--foreground)]/70">
              {[
                cvData.Personal_Info.HP,
                cvData.Personal_Info.Email,
                cvData.Personal_Info.LinkedIn,
                cvData.Personal_Info.Alamat,
                cvData.Personal_Info.Portfolio
              ]
                .filter(Boolean)
                .join(" | ")}
            </p>
          </div>

          {/* SUMMARY */}
          {cvData.Personal_Info.Summary && (
            <div className="mb-4">
              <h3 className="font-bold border-b border-black text-sm mb-1 text-[var(--foreground)]/50">Professional Summary</h3>
              <EditableText
                value={cvData.Personal_Info.Summary}
                onChange={val =>
                  setCvData({
                    ...cvData,
                    Personal_Info: { ...cvData.Personal_Info, Summary: val }
                  })
                }
                className={`text-sm text-justify`}
              />
            </div>
          )}

          {/* EXPERIENCE */}
          {cvData.Experience.some((_, index) => selectedContent.experience[index]) && (
            <div className="mb-4">
              <h3 className="font-bold border-b border-black text-xl mb-1 text-[var(--foreground)]/50">Work Experience</h3>
              {cvData.Experience.map(
                (exp, i) =>
                  selectedContent.experience[i] && (
                    <div key={i} className="mb-3">
                      {/* Baris 1: Posisi | Perusahaan  (Tipe · Jenis) */}
                      <div className="flex flex-row items-baseline gap-1 content-start flex-wrap">
                        <EditableText
                          value={exp.Posisi}
                          onChange={val => {
                            const updated = [...cvData.Experience];
                            updated[i].Posisi = val;
                            setCvData({ ...cvData, Experience: updated });
                          }}
                          className={`font-semibold text-sm`}
                          inline
                        />
                        <span className="font-semibold text-sm shrink-0 text-[var(--foreground)]/40">|</span>
                        <EditableText
                          value={exp.Perusahaan}
                          onChange={val => {
                            const updated = [...cvData.Experience];
                            updated[i].Perusahaan = val;
                            setCvData({ ...cvData, Experience: updated });
                          }}
                          className={`font-semibold text-sm`}
                          inline
                        />
                        {(exp.Tipe || exp.Jenis) && (
                          <span className="text-sm text-[var(--foreground)]/45 shrink-0 ml-1">
                            ({[exp.Tipe, exp.Jenis].filter(Boolean).join(" · ")})
                          </span>
                        )}
                      </div>
                      {/* Baris 2: Durasi */}
                      <p className="text-sm text-[var(--foreground)]/50 mt-0.5">
                        {formatDurationLabel(exp.Durasi, cvData.Language)}
                      </p>
                      {/* Baris 3: Deskripsi */}
                      <EditableText
                        value={formatAsBullets(exp.Deskripsi)}
                        onChange={val => {
                          const updated = [...cvData.Experience];
                          updated[i].Deskripsi = parseFromBullets(val);
                          setCvData({ ...cvData, Experience: updated });
                        }}
                        onKeyDown={handleBulletKeyDown(nextPlain => {
                          const updated = [...cvData.Experience];
                          updated[i].Deskripsi = nextPlain;
                          setCvData({ ...cvData, Experience: updated });
                        })}
                        className={`text-sm mt-0.5`}
                      />
                    </div>
                  )
              )}
            </div>
          )}

          {/* PROJECTS */}
          {cvData.Projects.some((_, index) => selectedContent.projects[index]) && (
            <div className="mb-4">
              <h3 className="font-bold border-b border-black text-xl mb-1 text-[var(--foreground)]/50">Projects</h3>
              {cvData.Projects.map(
                (proj, i) =>
                  selectedContent.projects[i] && (
                    <div key={i} className="mb-3">
                      {/* Baris 1: Nama Proyek | Role  (Tech Stack) */}
                      <div className="flex flex-row items-baseline gap-1 content-start flex-wrap">
                        <EditableText
                          value={proj.Nama_Proyek}
                          onChange={val => {
                            const updated = [...cvData.Projects];
                            updated[i].Nama_Proyek = val;
                            setCvData({ ...cvData, Projects: updated });
                          }}
                          className={`font-semibold text-sm`}
                          inline
                        />
                        {/* MODIFIKASI: Menurunkan warna separator | */}
                        <span className="font-semibold text-sm shrink-0 text-[var(--foreground)]/40">|</span>
                        <EditableText
                          value={proj.Role}
                          onChange={val => {
                            const updated = [...cvData.Projects];
                            updated[i].Role = val;
                            setCvData({ ...cvData, Projects: updated });
                          }}
                          className={`font-semibold text-sm`}
                          inline
                        />
                        {proj.Tech_Stack && (
                          <span className="text-sm text-[var(--foreground)]/45 shrink-0 ml-1">
                            ({proj.Tech_Stack})
                          </span>
                        )}
                      </div>
                      {/* Baris 2: Duration */}
                      <p className="text-sm text-[var(--foreground)]/50 mt-0.5">
                        {formatDurationLabel(proj.Duration, cvData.Language)}
                      </p>
                      {/* Baris 3: Deskripsi */}
                      <EditableText
                        value={formatAsBullets(proj.Deskripsi)}
                        onChange={val => {
                          const updated = [...cvData.Projects];
                          updated[i].Deskripsi = parseFromBullets(val);
                          setCvData({ ...cvData, Projects: updated });
                        }}
                        onKeyDown={handleBulletKeyDown(nextPlain => {
                          const updated = [...cvData.Projects];
                          updated[i].Deskripsi = nextPlain;
                          setCvData({ ...cvData, Projects: updated });
                        })}
                        className={`text-sm mt-0.5`}
                      />
                    </div>
                  )
              )}
            </div>
          )}

          {/* EDUCATION */}
          {cvData.Education.some((_, index) => selectedContent.education[index]) && (
            <div className="mb-4">
              <h3 className="font-bold border-b border-black text-xl mb-1 text-[var(--foreground)]/50">Education</h3>
              {cvData.Education.map(
                (edu, i) =>
                  selectedContent.education[i] && (
                    <div key={i} className="mb-3">
                      <div className="flex flex-row items-baseline gap-1 content-start flex-wrap">
                        <EditableText
                          value={edu.Institusi}
                          onChange={val => {
                            const updated = [...cvData.Education];
                            updated[i].Institusi = val;
                            setCvData({ ...cvData, Education: updated });
                          }}
                          className={`font-semibold text-sm`}
                          inline
                        />
                        {edu.Tahun_Lulus && (
                          <span className="font-semibold text-sm text-[var(--foreground)]/50">
                            ({edu.Tahun_Lulus})
                          </span>
                        )}
                      </div>
                      <div className="flex flex-row items-baseline gap-1 content-start flex-wrap">
                        <EditableText
                          value={edu.Jurusan}
                          onChange={val => {
                            const updated = [...cvData.Education];
                            updated[i].Jurusan = val;
                            setCvData({ ...cvData, Education: updated });
                          }}
                          className={`text-sm italic`}
                          inline
                        />
                        {edu.IPK && (
                          <span className="text-sm text-[var(--foreground)]/50">
                            | GPA: {edu.IPK}
                          </span>
                        )}
                      </div>
                      {edu.Matkul && (
                        <div className="mt-1">
                          <p className="text-sm font-semibold text-[var(--foreground)]/55">Related Course :</p>
                          <EditableText
                            value={edu.Matkul}
                            onChange={val => {
                              const updated = [...cvData.Education];
                              updated[i].Matkul = val;
                              setCvData({ ...cvData, Education: updated });
                            }}
                            className={`text-sm mt-0.5`}
                          />
                        </div>
                      )}
                      {edu.keterangan && (
                        <div className="mt-1">
                          <p className="text-sm font-semibold text-[var(--foreground)]/55">Description :</p>
                          <EditableText
                            value={formatAsBullets(edu.keterangan)}
                            onChange={val => {
                              const updated = [...cvData.Education];
                              updated[i].keterangan = parseFromBullets(val);
                              setCvData({ ...cvData, Education: updated });
                            }}
                            onKeyDown={handleBulletKeyDown(nextPlain => {
                              const updated = [...cvData.Education];
                              updated[i].keterangan = nextPlain;
                              setCvData({ ...cvData, Education: updated });
                            })}
                            className={`text-sm mt-0.5`}
                          />
                        </div>
                      )}
                    </div>
                  )
              )}
            </div>
          )}

        {/* SKILLS */}
        {(selectedHardSkills.length > 0 || selectedSoftSkills.length > 0) && (
          <div className="mb-4">
            <h3 className="font-bold border-b border-black text-xl mb-1 text-[var(--foreground)]/50">Skills</h3>
            
            {/* Hard Skills Section */}
            {selectedHardSkills.length > 0 && (
              <div className="text-sm mt-1 flex flex-row items-baseline content-start flex-wrap gap-1">
                {/* Label abu-abu */}
                <span className="font-semibold text-[var(--foreground)]/55 shrink-0 mr-1">Hard Skills :</span>
                
                {/* Menggunakan EditableText untuk Hard Skills */}
                <div className="w-full">
                  <EditableText
                    value={selectedHardSkills.map(({ skill }) => skill).join(", ")}
                    onChange={(val) => {
                      // 1. Pecah string berdasarkan koma dan bersihkan spasi murni menjadi string[]
                      const updatedHard = val.split(",").map(s => s.trim());
                      
                      // 2. Langsung masukkan ke state utama tanpa struktur objek
                      setCvData({ ...cvData, Skills_Hard: updatedHard });
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
            
            {/* Soft Skills Section */}
            {selectedSoftSkills.length > 0 && (
              <div className="text-sm mt-1 flex flex-row items-baseline content-start flex-wrap gap-1">
                {/* Label abu-abu */}
                <span className="font-semibold text-[var(--foreground)]/55 shrink-0 mr-1">Soft Skills :</span>
                
                {/* Menggunakan EditableText untuk Soft Skills */}
                <div className="w-full">
                  <EditableText
                    value={selectedSoftSkills.map(({ skill }) => skill).join(", ")}
                    onChange={(val) => {
                      // 1. Pecah string berdasarkan koma dan bersihkan spasi murni menjadi string[]
                      const updatedSoft = val.split(",").map(s => s.trim());
                      
                      // 2. Langsung masukkan ke state utama tanpa struktur objek
                      setCvData({ ...cvData, Skills_Soft: updatedSoft });
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        )}

          {/* CERTIFICATIONS & AWARDS */}
          {(selectedCertifications.length > 0 || selectedAwards.length > 0) && (
            <div className="mb-4">
              <h3 className="font-bold border-b border-black text-xl mb-1">Certifications & Awards</h3>
              {selectedCertifications.map(({ certification, index }) => {
                const yearRange = formatCertificateYearRange(certification.Tahun, certification.Masa_Berlaku);
                return (
                  <p
                    key={`cert-${index}`}
                    className="text-sm ml-3 text-[var(--foreground)]/70"
                  >
                    {`${certification.Nama} - ${certification.Penerbit}${yearRange ? ` (${yearRange})` : ""}`}
                  </p>
                );
              })}
              {selectedAwards.map(({ award, index }) => (
                <p
                  key={`award-${index}`}
                  className="text-sm ml-3 text-[var(--foreground)]/70"
                >
                  {`Award: ${award.Nama_Award} - ${award.Pemberi} (${award.Tahun})`}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-2">
        <button
          type="button"
          onClick={prevStep}
          className="cursor-pointer mt-4 text-[var(--color-primary)] font-bold hover:text-[color-mix(in_oklab,var(--foreground)_85%,black)] underline transition flex items-center justify-center gap-2"
        >
          <ArrowBackwardIcon className="h-4 w-4" />
          Kembali ke Review
        </button>
      </div>

      <CustomModal {...modalProps} />
    </div>
  );
}
