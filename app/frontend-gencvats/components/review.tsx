"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { SelectedCVContent, StepProps } from "@/types";
import { BuilderLoadingOverlay, useModal, CustomModal } from "./custommodal";
import { ArrowBackwardIcon, AutoEnhanceIcon, ArrowForwardIcon } from "./icons";

type ReviewSelectionProps = StepProps & {
  selectedContent: SelectedCVContent;
  setSelectedContent: React.Dispatch<React.SetStateAction<SelectedCVContent>>;
};

type ArraySelectionKey = Exclude<keyof SelectedCVContent, "personalInfo">;

const isArraySelectionKey = (key: keyof SelectedCVContent): key is ArraySelectionKey =>
  key !== "personalInfo";

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

export default function Step5Review({
  cvData,
  setCvData,
  apiUrl,
  llmProvider = "local",
  nextStep,
  prevStep,
  selectedContent,
  setSelectedContent
}: ReviewSelectionProps) {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    education: false,
    experience: false,
    projects: false,
    hardSkills: false,
    softSkills: false,
    certifications: false,
    awards: false
  });

  const { modalProps, showAlert, showSuccess } = useModal();

  const toggleExpandedSection = (key: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleArrayItem = (key: ArraySelectionKey, index: number) => {
    setSelectedContent(prev => ({
      ...prev,
      [key]: prev[key].map((item, i) => (i === index ? !item : item))
    }));
  };

  const handleEnhance = async () => {
    if (!cvData.Personal_Info.Nama) {
      return showAlert("Isi nama dulu", "Nama lengkap diperlukan sebelum AI memoles CV.");
    }

    setLoading(true);
    setStatusMsg("AI sedang memoles CV...");

    try {
      const res = await axios.post(`${apiUrl}/enhance-cv`, {
        ...cvData,
        LLM_Provider: llmProvider,
      }, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      setCvData({
        ...res.data,
        Education: res.data.Education.map((item: typeof cvData.Education[number], index: number) => ({
          ...item,
          Document: cvData.Education[index]?.Document,
        })),
        Certifications: res.data.Certifications.map((item: typeof cvData.Certifications[number], index: number) => ({
          ...item,
          Document: cvData.Certifications[index]?.Document,
        })),
        Awards: res.data.Awards.map((item: typeof cvData.Awards[number], index: number) => ({
          ...item,
          Document: cvData.Awards[index]?.Document,
        })),
      });
      showSuccess(
        "CV sudah dipoles",
        "Cek lagi hasilnya sebelum lanjut."
      );
    } catch (error) {
      console.error(error);
      showAlert("AI belum bisa dipakai", "Pastikan backend sedang berjalan, lalu coba lagi.");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };

  useEffect(() => {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [cvData.Personal_Info.Summary]);

  return (
    <div>
      {loading && <BuilderLoadingOverlay message={statusMsg} />}
      <div className="space-y-8">
        <div className="space-y-6">
          {/* LANGUAGE */}
          <div className="builder-inner-panel bg-[color-mix(in_oklab,var(--color-surface)_94%,white)] border rounded-2xl shadow p-6">
            <label className="block font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-3 text-lg">
              Bahasa CV
            </label>
            <select
              value={cvData.Language}
              onChange={(e) => setCvData({ ...cvData, Language: e.target.value })}
              className="cursor-pointer w-full border p-4 rounded-lg bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] text-lg"
            >
              <option value="English">English</option>
              <option value="Indonesia">Indonesia</option>
            </select>
          </div>

          {/* SUMMARY */}
          <div className="builder-inner-panel bg-[color-mix(in_oklab,var(--color-surface)_94%,white)] border rounded-2xl shadow p-6">
            <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-3 text-lg">
              Summary
            </h3>
            <textarea
              className="w-full border p-4 rounded-lg bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] h-32 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              value={cvData.Personal_Info.Summary || ""}
              onChange={(e) =>
                setCvData({
                  ...cvData,
                  Personal_Info: { ...cvData.Personal_Info, Summary: e.target.value }
                })
              }
              placeholder="Tulis sendiri atau biarkan AI bantu poles."
            />
            <button
              type="button"
              onClick={handleEnhance}
              disabled={loading}
              className="cursor-pointer w-full bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] disabled:cursor-not-allowed disabled:opacity-70 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 mt-4"
            >
              <AutoEnhanceIcon className={`h-5 w-5 ${loading ? "animate-pulse" : ""}`} />
              {loading ? "Memproses..." : "Poles dengan AI"}
            </button>
          </div>

          {/* CONTENT SELECTION */}
          <div className="builder-list-panel bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-6 rounded-xl border h-full">
            <div>
              <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-2">
                Isi yang masuk CV
              </h3>
              <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,white)]">
                Centang item yang ingin ditampilkan.
              </p>
            </div>

            <div className="builder-scroll-panel mt-6 space-y-4">
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
                  title: "Skills",
                  items: [...cvData.Skills_Hard, ...cvData.Skills_Soft],
                  selected: [...selectedContent.hardSkills, ...selectedContent.softSkills],
                  keyName: "hardSkills" as const,
                  expandKey: "hardSkills" as const
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
              ].map(section => (
                <div
                  key={section.title}
                  className="rounded-xl border bg-[color-mix(in_oklab,var(--color-surface)_96%,white)]"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpandedSection(section.expandKey)}
                    className="cursor-pointer w-full flex items-center justify-between px-4 py-4 text-left"
                  >
                    <div>
                      <h4 className="font-semibold text-[var(--foreground)]">{section.title}</h4>
                      <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_65%,white)]">
                        {section.items.length} item
                      </p>
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
                            onChange={() => {
                              if (isArraySelectionKey(section.keyName)) {
                                toggleArrayItem(section.keyName, index);
                              }
                            }}
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

        {/* ACTION BUTTONS */}
        <div className="builder-form-actions mt-8 pt-6">
          <button
            type="button"
            onClick={prevStep}
            className="cursor-pointer px-6 py-2 rounded-lg font-bold text-[color-mix(in_oklab,var(--foreground)_78%,white)] bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] hover:bg-[color-mix(in_oklab,var(--color-soft)_75%,white)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <ArrowBackwardIcon className="h-4 w-4" />
            Kembali
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="cursor-pointer px-6 py-2 rounded-lg font-bold text-white bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center gap-2"
          >
            Lanjut
            <ArrowForwardIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <CustomModal {...modalProps} />
    </div>
  );
}
