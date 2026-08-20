import { useState, useRef } from "react";
import axios from "axios";
import { StepProps, UploadedDocument } from "@/types";
import { BuilderLoadingOverlay, useModal, CustomModal } from "./custommodal";
import { ArrowBackwardIcon, ArrowForwardIcon, EditIcon, EyeIcon, FileUploadOutline, TrashIcon } from "./icons";
import {
  buildDuplicateKey,
  filterUniqueNewItems,
  formatDuplicateMessage,
  isDuplicateItem,
  normalizeDuplicateValue,
} from "./duplicate-data";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const capitalizeEachWord = (
  text?: string
) => {
  if (!text) return "";

  return text
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
};

const normalizeYearInput = (value: string) => value.replace(/\D/g, "").slice(0, 4);

const isFourDigitYear = (value: string) => /^\d{4}$/.test(value);

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

  if (start && expiry && start !== expiry) return `${start} - ${expiry}`;
  return start || expiry || "";
};

export default function Step4Certificates({ cvData, setCvData, apiUrl, llmProvider = "local", nextStep, prevStep }: StepProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; label: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadCategory, setUploadCategory] = useState<"Keahlian" | "Penghargaan">("Keahlian");
  const [manualForm, setManualForm] = useState({
    kategori: "Keahlian",
    nama: "",
    judulKompetisi: "",
    penerbit: "",
    tahun: "",
    masaBerlaku: "",
  });
  const [editingState, setEditingState] = useState<{ type: "Keahlian" | "Kompetisi"; index: number } | null>(null);

  const { modalProps, showAlert, showConfirm, showSuccess } = useModal();

  const getCertificationDuplicateKey = (entry: { Nama: string; Penerbit: string; Tahun: string | number }) =>
    buildDuplicateKey([entry.Nama, entry.Penerbit, entry.Tahun]);

  const getAwardDuplicateKey = (entry: { Nama_Award: string; Judul_Kompetisi?: string; Pemberi: string; Tahun: string }) =>
    buildDuplicateKey([entry.Nama_Award, entry.Judul_Kompetisi, entry.Pemberi, entry.Tahun]);

  const resolveDocumentUrl = (document?: UploadedDocument) => {
    if (!document?.fileUrl) return "";
    return document.fileUrl.startsWith("http") ? document.fileUrl : `${apiUrl}${document.fileUrl}`;
  };

  const openDocumentPreview = async (document?: UploadedDocument) => {
    const url = resolveDocumentUrl(document);
    if (!url) return showAlert("Preview belum tersedia", "File preview tidak ditemukan untuk data ini.");

    try {
      const response = await axios.get(url, {
        responseType: "blob",
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      });
      const blobUrl = URL.createObjectURL(response.data);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.detail || error.message || "File tidak bisa dibuka."
        : "File tidak bisa dibuka.";
      showAlert("Preview gagal", message);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    type UploadResult = {
      certification?: { Nama: string; Penerbit: string; Tahun: string; Masa_Berlaku?: string; Document?: UploadedDocument };
      award?: { Nama_Award: string; Pemberi: string; Tahun: string; Document?: UploadedDocument };
      skillsHard: string[];
      skillsSoft: string[];
    };

    type WarningCandidate = {
      fileName: string;
      result: UploadResult;
      extractedName: string;
      score: number | null;
      message: string;
    };

    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const oversized = files.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
    const oversizedDetails = oversized.map(
      (file) => `- ${file.name}: ukuran ${(file.size / (1024 * 1024)).toFixed(2)} MB (maksimal 5 MB).`
    );
    const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE_BYTES);
    if (!validFiles.length) {
      const oversizedText =
        oversizedDetails.length > 0
          ? `Semua file ditolak karena ukuran melebihi batas:\n${oversizedDetails.join("\n")}`
          : "Tidak ada file valid yang bisa diproses.";
      showAlert("Upload gagal", oversizedText);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!cvData.Personal_Info.Nama) {
      showAlert("Isi nama dulu", "Nama lengkap diperlukan untuk cek dokumen.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLoading(true);
    setUploadProgress({ percent: 0, label: "Menyiapkan upload..." });
    let savedCount = 0;
    let processingFailedCount = 0;
    let invalidCount = 0;
    const invalidDetails: string[] = [];
    const processingFailedDetails: string[] = [];

    const acceptedResults: UploadResult[] = [];
    const warningCandidates: WarningCandidate[] = [];
    let duplicateCount = 0;
    const duplicateDetails: string[] = [];

    const formatDocumentName = (value?: string) => {
      const cleanValue = value?.trim();
      return cleanValue && cleanValue !== "-" ? cleanValue : "Tidak terdeteksi";
    };

    const formatValidationMessage = (
      status: "warning" | "invalid",
      score: number | null,
      fallbackMessage?: string
    ) => {
      if (score === null) {
        return fallbackMessage || "Nama tidak terdeteksi pada dokumen.";
      }

      return status === "warning"
        ? `Nama pada data dokumen meragukan terhadap profil. Perlu konfirmasi.`
        : `Nama pada data dokumen tidak sesuai terhadap profil.`;
    };

    const formatValidationBlock = (
      fileName: string,
      statusMessage: string,
      extractedName: string
    ) => {
      return [
        `${fileName}`,
        `Catatan: ${statusMessage}`,
        `Nama dokumen: "${extractedName}"`,
        `Nama profil: "${cvData.Personal_Info.Nama}"`,
      ].join("\n");
    };

    const buildResultFromOcr = (data: Record<string, string>): UploadResult => {
      const result: UploadResult = {
        skillsHard: [],
        skillsSoft: [],
      };

      if (uploadCategory === "Penghargaan") {
        result.award = {
          Nama_Award: capitalizeEachWord(data.Judul_Sertifikat) || "Tanpa Judul",
          Pemberi: data.Lembaga_Penerbit || "Penyelenggara Tidak Terdeteksi",
          Tahun: data.Tahun_Sertifikat || "-",
        };
      } else {
        result.certification = {
          Nama: capitalizeEachWord(data.Judul_Sertifikat) || "Tanpa Judul",
          Penerbit: data.Lembaga_Penerbit || "Penerbit Tidak Terdeteksi",
          Tahun: data.Tahun_Sertifikat || "-",
          Masa_Berlaku: data.Masa_Berlaku || "",
        };
      }

      if (data.Skill && data.Skill !== "Tidak Ditemukan") {
        const parsedSkills = data.Skill.split(",").map((skill: string) => skill.trim()).filter(Boolean);
        if (data.Tipe_Skill && data.Tipe_Skill.includes("Soft")) {
          result.skillsSoft = parsedSkills;
        } else {
          result.skillsHard = parsedSkills;
        }
      }

      return result;
    };

    const attachDocumentToResult = (result: UploadResult, document?: UploadedDocument): UploadResult => ({
      ...result,
      certification: result.certification ? { ...result.certification, Document: document } : undefined,
      award: result.award ? { ...result.award, Document: document } : undefined,
    });

    const formatRelevanceMessage = (relevance?: { status?: string; reason?: string }) => {
      if (!relevance || relevance.status === "relevant") return "";
      const reason = relevance.reason || "AI menilai dokumen ini belum berkaitan jelas dengan IT & Data Science.";
      return `File tampaknya tidak terkait IT & Data Science. ${reason}`;
    };

    const filterDuplicateUploadResults = (results: UploadResult[]) => {
      const certifications = [...cvData.Certifications];
      const awards = [...cvData.Awards];
      const hardSkillKeys = new Set(cvData.Skills_Hard.map(normalizeDuplicateValue).filter(Boolean));
      const softSkillKeys = new Set(cvData.Skills_Soft.map(normalizeDuplicateValue).filter(Boolean));
      const uniqueResults: UploadResult[] = [];
      const duplicates: string[] = [];

      for (const result of results) {
        const nextResult: UploadResult = { skillsHard: [], skillsSoft: [] };

        if (result.certification) {
          if (isDuplicateItem(certifications, result.certification, getCertificationDuplicateKey)) {
            duplicates.push(`Sertifikat: ${result.certification.Nama} - ${result.certification.Penerbit} (${result.certification.Tahun})`);
          } else {
            nextResult.certification = result.certification;
            certifications.push(result.certification);
          }
        }

        if (result.award) {
          if (isDuplicateItem(awards, result.award, getAwardDuplicateKey)) {
            duplicates.push(`Penghargaan: ${result.award.Nama_Award} - ${result.award.Pemberi} (${result.award.Tahun})`);
          } else {
            nextResult.award = result.award;
            awards.push(result.award);
          }
        }

        for (const skill of result.skillsHard) {
          const key = normalizeDuplicateValue(skill);
          if (!key || hardSkillKeys.has(key)) {
            duplicates.push(`Hard skill: ${skill}`);
          } else {
            hardSkillKeys.add(key);
            nextResult.skillsHard.push(skill);
          }
        }

        for (const skill of result.skillsSoft) {
          const key = normalizeDuplicateValue(skill);
          if (!key || softSkillKeys.has(key)) {
            duplicates.push(`Soft skill: ${skill}`);
          } else {
            softSkillKeys.add(key);
            nextResult.skillsSoft.push(skill);
          }
        }

        if (nextResult.certification || nextResult.award || nextResult.skillsHard.length || nextResult.skillsSoft.length) {
          uniqueResults.push(nextResult);
        }
      }

      return { uniqueResults, duplicates };
    };

    const applyUploadResults = (results: UploadResult[]) => {
      if (!results.length) return;
      setCvData((prev) => {
        const certifications = results.flatMap((result) => result.certification ? [result.certification] : []);
        const awards = results.flatMap((result) => result.award ? [result.award] : []);
        const hardSkills = results.flatMap((result) => result.skillsHard);
        const softSkills = results.flatMap((result) => result.skillsSoft);
        const uniqueCertifications = filterUniqueNewItems(prev.Certifications, certifications, getCertificationDuplicateKey).items;
        const uniqueAwards = filterUniqueNewItems(prev.Awards, awards, getAwardDuplicateKey).items;
        const uniqueHardSkills = filterUniqueNewItems(prev.Skills_Hard, hardSkills, normalizeDuplicateValue).items;
        const uniqueSoftSkills = filterUniqueNewItems(prev.Skills_Soft, softSkills, normalizeDuplicateValue).items;
        const newData = {
          ...prev,
          Certifications: [...prev.Certifications, ...uniqueCertifications],
          Awards: [...prev.Awards, ...uniqueAwards],
          Skills_Hard: [...prev.Skills_Hard, ...uniqueHardSkills],
          Skills_Soft: [...prev.Skills_Soft, ...uniqueSoftSkills],
        };

        return newData;
      });
    };

    try {
      for (const [fileIndex, file] of validFiles.entries()) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("jenis", "sertifikat");
        formData.append("target_name", cvData.Personal_Info.Nama);
        formData.append("llm_provider", llmProvider);
        setUploadProgress({
          percent: Math.round((fileIndex / validFiles.length) * 100),
          label: `Mengupload ${file.name}...`,
        });
        try {
          const res = await axios.post(`${apiUrl}/extract-ocr`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
              "ngrok-skip-browser-warning": "true",
            },
            onUploadProgress: (event) => {
              const loaded = event.total ? event.loaded / event.total : 0;
              const overall = ((fileIndex + loaded) / validFiles.length) * 100;
              setUploadProgress({
                percent: Math.min(95, Math.round(overall)),
                label: `Mengupload ${file.name}...`,
              });
            },
          });
          const { data, validation, relevance, document } = res.data;
          const status: string = validation?.status || (validation?.is_valid ? "valid" : "invalid");
          const score: number | null =
            typeof validation?.similarity_score === "number" ? validation.similarity_score : null;
          const result = attachDocumentToResult(buildResultFromOcr(data), document);
          const relevanceMessage = formatRelevanceMessage(relevance);

          if (status === "invalid" || (validation && !validation.is_valid)) {
            invalidCount += 1;
            invalidDetails.push(
              formatValidationBlock(
                file.name,
                formatValidationMessage("invalid", score, validation?.message),
                formatDocumentName(validation?.extracted_name)
              )
            );
            continue;
          }

          if (status === "warning" || relevanceMessage) {
            warningCandidates.push({
              fileName: file.name,
              result,
              extractedName: formatDocumentName(validation?.extracted_name),
              score,
              message: [status === "warning" ? formatValidationMessage("warning", score, validation?.message) : "", relevanceMessage]
                .filter(Boolean)
                .join("\n"),
            });
            continue;
          }

          acceptedResults.push(result);
          savedCount += 1;
          setUploadProgress({
            percent: Math.round(((fileIndex + 1) / validFiles.length) * 100),
            label: `Selesai memproses ${file.name}.`,
          });
        } catch (error) {
          processingFailedCount += 1;
          const reason = axios.isAxiosError(error)
            ? error.response?.data?.detail || error.message || "Gagal memproses OCR."
            : "Gagal memproses OCR.";
          processingFailedDetails.push(`- ${file.name}: ${reason}`);
        }
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.detail || "Gagal memproses file. Pastikan server berjalan."
        : "Gagal memproses file. Pastikan server berjalan.";
      showAlert("Error", message);
    } finally {
      setLoading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const uniqueAccepted = filterDuplicateUploadResults(acceptedResults);
      const uniqueWarning = filterDuplicateUploadResults([...uniqueAccepted.uniqueResults, ...warningCandidates.map((item) => item.result)]);
      const uniqueWarningResults = uniqueWarning.uniqueResults.slice(uniqueAccepted.uniqueResults.length);
      savedCount = uniqueAccepted.uniqueResults.length;
      duplicateDetails.push(...uniqueAccepted.duplicates, ...uniqueWarning.duplicates);
      duplicateCount = duplicateDetails.length;

      applyUploadResults(uniqueAccepted.uniqueResults);

      const buildDetailLines = (savedWarningCount: number, includeWarningList: boolean) => {
        const lines: string[] = [`Disimpan: ${savedCount + savedWarningCount} file.`];

        if (savedCount > 0) {
          lines.push(`Kategori: ${uploadCategory}.`);
        }
        if (savedWarningCount > 0) {
          lines.push(`Disimpan setelah konfirmasi: ${savedWarningCount}.`);
        }
        if (warningCandidates.length > 0 && includeWarningList) {
          lines.push(
            "",
            `Perlu kamu cek (${warningCandidates.length}):`,
            ...warningCandidates.map((item) => {
              return formatValidationBlock(item.fileName, item.message, item.extractedName);
            })
          );
        }
        if (warningCandidates.length > 0 && !includeWarningList) {
          lines.push(`Dokumen yang meragukan tidak disimpan: ${warningCandidates.length}.`);
        }
        if (invalidCount > 0) {
          lines.push("", `Ditolak (${invalidCount}):`, ...invalidDetails);
        }
        if (oversizedDetails.length > 0) {
          lines.push("", `Ukuran di atas 5 MB (${oversizedDetails.length}):`, ...oversizedDetails);
        }
        if (processingFailedCount > 0) {
          lines.push("", `Gagal diproses (${processingFailedCount}):`, ...processingFailedDetails);
        }
        if (duplicateCount > 0) {
          lines.push("", `Duplikat dilewati (${duplicateCount}):`, ...duplicateDetails.map((item) => `- ${item}`));
        }
        return lines.join("\n");
      };

      if (warningCandidates.length > 0 && uniqueWarningResults.length > 0) {
        const warningMessageLines = [
          buildDetailLines(0, true),
          "",
          "Simpan dokumen meragukan di atas?",
        ];

        showConfirm(
          "Cek dokumen ini",
          warningMessageLines.join("\n"),
          () => {
            applyUploadResults(uniqueWarningResults);
            showSuccess("Upload selesai", buildDetailLines(uniqueWarningResults.length, true));
          },
          () => {
            if (savedCount > 0) {
              showSuccess("Upload selesai", buildDetailLines(0, false));
            } else {
              showAlert("Upload selesai", buildDetailLines(0, false));
            }
          },
          { confirmLabel: "Tetap lanjutkan", cancelLabel: "Upload file lain" }
        );
        return;
      }

      if (savedCount > 0) {
        showSuccess("Upload selesai", buildDetailLines(0, true));
      } else if (processingFailedCount > 0 || invalidCount > 0 || oversizedDetails.length > 0 || duplicateCount > 0) {
        showAlert("Upload gagal", buildDetailLines(0, true));
      }
    }
  };

  const addManual = () => {
    const nama = manualForm.nama.trim();
    const judulKompetisi = manualForm.judulKompetisi.trim();
    const penerbit = manualForm.penerbit.trim();
    const tahun = manualForm.tahun.trim();
    const masaBerlaku = manualForm.masaBerlaku.trim();

    if (manualForm.kategori === "Keahlian" && (!nama || !penerbit || !tahun)) {
      return showAlert("Lengkapi sertifikat", "Isi judul, penerbit, dan tahun.");
    }

    if (!isFourDigitYear(tahun)) {
      return showAlert("Tahun belum valid", "Gunakan 4 digit, misalnya 2025.");
    }

    if (masaBerlaku && !isFourDigitYear(masaBerlaku)) {
      return showAlert("Tahun belum valid", "Gunakan 4 digit, misalnya 2026.");
    }

    if (manualForm.kategori === "Kompetisi" && (!nama || !judulKompetisi || !penerbit || !tahun)) {
      return showAlert("Lengkapi penghargaan", "Isi penghargaan, kompetisi, penyelenggara, dan tahun.");
    }

    if (manualForm.kategori === "Kompetisi") {
      const awardData = {
        Nama_Award: nama,
        Judul_Kompetisi: judulKompetisi,
        Pemberi: penerbit,
        Tahun: tahun,
      };

      if (isDuplicateItem(cvData.Awards, awardData, getAwardDuplicateKey, editingState?.type === "Kompetisi" ? editingState.index : null)) {
        return showAlert(
          "Data duplikat",
          formatDuplicateMessage("Penghargaan", [`${awardData.Nama_Award} - ${awardData.Pemberi} (${awardData.Tahun})`])
        );
      }
    } else {
      const certData = {
        Nama: nama,
        Penerbit: penerbit,
        Tahun: Number(tahun),
        Masa_Berlaku: masaBerlaku ? Number(masaBerlaku) : "",
      };

      if (isDuplicateItem(cvData.Certifications, certData, getCertificationDuplicateKey, editingState?.type === "Keahlian" ? editingState.index : null)) {
        return showAlert(
          "Data duplikat",
          formatDuplicateMessage("Sertifikat", [`${certData.Nama} - ${certData.Penerbit} (${certData.Tahun})`])
        );
      }
    }

    setCvData((prev) => {
      const newData = { ...prev };

      if (manualForm.kategori === "Kompetisi") {
        const awardData = {
          Nama_Award: nama,
          Judul_Kompetisi: judulKompetisi,
          Pemberi: penerbit,
          Tahun: tahun,
        };

        if (isDuplicateItem(prev.Awards, awardData, getAwardDuplicateKey, editingState?.type === "Kompetisi" ? editingState.index : null)) {
          showAlert(
            "Data duplikat",
            formatDuplicateMessage("Penghargaan", [`${awardData.Nama_Award} - ${awardData.Pemberi} (${awardData.Tahun})`])
          );
          return prev;
        }

        if (editingState?.type === "Kompetisi") {
          newData.Awards = prev.Awards.map((item, i) => (i === editingState.index ? awardData : item));
        } else {
          newData.Awards = [...prev.Awards, awardData];
        }
      } else {
        const certData = {
          Nama: nama,
          Penerbit: penerbit,
          Tahun: Number(tahun),
          Masa_Berlaku: masaBerlaku ? Number(masaBerlaku) : "",
        };

        if (isDuplicateItem(prev.Certifications, certData, getCertificationDuplicateKey, editingState?.type === "Keahlian" ? editingState.index : null)) {
          showAlert(
            "Data duplikat",
            formatDuplicateMessage("Sertifikat", [`${certData.Nama} - ${certData.Penerbit} (${certData.Tahun})`])
          );
          return prev;
        }

        if (editingState?.type === "Keahlian") {
          newData.Certifications = prev.Certifications.map((item, i) => (i === editingState.index ? certData : item));
        } else {
          newData.Certifications = [...prev.Certifications, certData];
        }
      }

      return newData;
    });

    setEditingState(null);
    setManualForm({ kategori: "Keahlian", nama: "", judulKompetisi: "", penerbit: "", tahun: "", masaBerlaku: "" });
  };

  const handleEditCert = (idx: number) => {
    const cert = cvData.Certifications[idx];
    setManualForm({
      kategori: "Keahlian",
      nama: cert.Nama || "",
      judulKompetisi: "",
      penerbit: cert.Penerbit || "",
      tahun: String(cert.Tahun || ""),
      masaBerlaku: String(cert.Masa_Berlaku || ""),
    });
    setEditingState({ type: "Keahlian", index: idx });
    setActiveTab("manual");
  };

  const handleEditAward = (idx: number) => {
    const award = cvData.Awards[idx];
    setManualForm({
      kategori: "Kompetisi",
      nama: award.Nama_Award || "",
      judulKompetisi: award.Judul_Kompetisi || "",
      penerbit: award.Pemberi || "",
      tahun: award.Tahun || "",
      masaBerlaku: "",
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
    <div>
      <div className="builder-tabs">
        {["upload", "manual"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "upload" | "manual")}
            className={`cursor-pointer px-6 py-3 font-bold text-sm rounded-t-lg transition ${
              activeTab === tab ? "bg-[var(--color-primary)] text-white shadow-lg" : "bg-[color-mix(in_oklab,var(--color-surface)_88%,white)] text-[color-mix(in_oklab,var(--foreground)_92%,white)] hover:bg-[color-mix(in_oklab,var(--color-soft)_45%,white)]"
            }`}
          >
            {tab === "upload" ? "Upload" : "Manual"}
          </button>
        ))}
      </div>

      {activeTab === "upload" ? (
        <div className="space-y-4">
          <div className="builder-inner-panel bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] p-4 rounded-xl border border-[color-mix(in_oklab,var(--color-soft)_55%,white)]">
            <p className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-3 text-sm">Pilih jenis dokumen</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={`flex-1 cursor-pointer border p-3 rounded-lg flex items-center gap-2 transition ${uploadCategory === "Keahlian" ? "bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] border-[var(--color-primary)] ring-2 ring-[color-mix(in_oklab,var(--color-accent)_55%,white)]" : "bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] border-[color-mix(in_oklab,var(--color-soft)_55%,white)]"}`}>
                <input
                  type="radio"
                  name="cat"
                  value="Keahlian"
                  checked={uploadCategory === "Keahlian"}
                  onChange={() => setUploadCategory("Keahlian")}
                  className="w-4 h-4 text-[var(--color-primary)]"
                />
                <div>
                  <span className="block font-bold text-sm">Sertifikat Keahlian</span>
                  <span className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">Course, bootcamp, lisensi</span>
                </div>
              </label>

              <label className={`flex-1 cursor-pointer border p-3 rounded-lg flex items-center gap-2 transition ${uploadCategory === "Penghargaan" ? "bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] border-[var(--color-accent)] ring-2 ring-[color-mix(in_oklab,var(--color-accent)_55%,white)]" : "bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] border-[color-mix(in_oklab,var(--color-soft)_55%,white)]"}`}>
                <input
                  type="radio"
                  name="cat"
                  value="Penghargaan"
                  checked={uploadCategory === "Penghargaan"}
                  onChange={() => setUploadCategory("Penghargaan")}
                  className="w-4 h-4 text-[color-mix(in_oklab,var(--color-accent)_72%,black)]"
                />
                <div>
                  <span className="block font-bold text-sm">Penghargaan / Lomba</span>
                  <span className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">Juara, finalis, best project</span>
                </div>
              </label>
            </div>
          </div>

          <div className="builder-inner-panel p-8 border-2 border-dashed border-[color-mix(in_oklab,var(--color-soft)_75%,white)] rounded-xl bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] text-center hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] transition relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              disabled={loading}
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center">
              <FileUploadOutline className="mb-3 text-[color-mix(in_oklab,var(--foreground)_55%,white)]" />
              <p className="font-bold text-[color-mix(in_oklab,var(--foreground)_78%,white)]">Upload dokumen</p>
              <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] mt-1">PDF, JPG, PNG. Maks. 5 MB per file.</p>
              <p className="text-xs font-semibold text-[var(--color-primary)] mt-2 bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] px-2 py-1 rounded">
                Masuk ke {uploadCategory === "Keahlian" ? "Sertifikat" : "Penghargaan"}
              </p>
              {uploadProgress && (
                <div className="mt-4 w-full max-w-sm">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[color-mix(in_oklab,var(--foreground)_68%,white)]">
                    <span>{uploadProgress.label}</span>
                    <span>{uploadProgress.percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-soft)_55%,white)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="builder-inner-panel grid grid-cols-1 md:grid-cols-2 gap-4 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-6 rounded-xl border">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">Kategori</label>
            <select
              value={manualForm.kategori || "Keahlian"}
              onChange={(e) => setManualForm({ ...manualForm, kategori: e.target.value, judulKompetisi: "" })}
              className="w-full p-3 border rounded-lg bg-[color-mix(in_oklab,var(--color-surface)_96%,white)]"
            >
              <option value="Keahlian">Sertifikat Keahlian / Kompetensi</option>
              <option value="Kompetisi">Sertifikat Penghargaan / Kompetisi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">
              {manualForm.kategori === "Keahlian" ? "Judul Sertifikat Keahlian" : "Judul Penghargaan"} <span className="text-red-700">*</span>
            </label>
            <input
              placeholder={manualForm.kategori === "Keahlian" ? "Data Science, Dll" : "Juara 1, Best Capstone, Dll"}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              value={manualForm.nama || ""}
              onChange={(e) => setManualForm({ ...manualForm, nama: e.target.value })}
            />
          </div>
          {manualForm.kategori === "Kompetisi" && (
            <div>
              <label className="block text-sm font-bold mb-1">
                Judul Kompetisi <span className="text-red-700">*</span>
              </label>
              <input
                placeholder="Data Science Olympiad, Dll"
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                value={manualForm.judulKompetisi || ""}
                onChange={(e) => setManualForm({ ...manualForm, judulKompetisi: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold mb-1">
              {manualForm.kategori === "Keahlian" ? "Penerbit" : "Penyelenggara"}
              {manualForm.kategori === "Keahlian"  && <span className="text-red-700"> *</span>}
              {manualForm.kategori === "Kompetisi"  && <span className="text-red-700"> *</span>}
            </label>
            <input
              placeholder={manualForm.kategori === "Keahlian" ? "Digicamp, Dll" : "KMIPN, Himpunan Mahasiswa, Dll"}
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              value={manualForm.penerbit || ""}
              onChange={(e) => setManualForm({ ...manualForm, penerbit: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">
              Tahun Terbit <span className="text-red-700">*</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="1000"
              max="9999"
              placeholder="2025"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              value={manualForm.tahun || ""}
              onChange={(e) => setManualForm({ ...manualForm, tahun: normalizeYearInput(e.target.value) })}
            />
          </div>
          {manualForm.kategori === "Keahlian" && (
            <div>
              <label className="block text-sm font-bold mb-1">Tahun Kadaluarsa</label>
              <input
                type="number"
                inputMode="numeric"
                min="1000"
                max="9999"
                placeholder="2025 (opsional)"
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                value={manualForm.masaBerlaku || ""}
                onChange={(e) => setManualForm({ ...manualForm, masaBerlaku: normalizeYearInput(e.target.value) })}
              />
            </div>
          )}
          {editingState !== null && (
            <p className="block text-sm font-bold mb-1">
              Sedang mengedit {editingState.type === "Keahlian" ? "sertifikat keahlian" : "penghargaan / lomba"}
            </p>
          )}
          <button
            onClick={addManual}
            className={`cursor-pointer md:col-span-2 py-3 rounded-lg text-white font-bold shadow transition ${
              editingState !== null ? "bg-[var(--color-accent)] hover:bg-[color-mix(in_oklab,var(--color-accent)_82%,black)]" : "bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)]"
            }`}
          >
            {editingState !== null ? "Simpan perubahan" : "Tambah data"}
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="builder-list-panel bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-4 rounded-xl border">
          <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_85%,black)] mb-4 flex items-center gap-2">
            Sertifikat Keahlian 
            <span className="text-xs bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] px-2 py-1 rounded-full">
              {cvData.Certifications.length}
            </span>
          </h3>
          {cvData.Certifications.length === 0 && <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] italic">Belum ada data.</p>}
          <ul className="space-y-2">
            {cvData.Certifications.map((certificate, i) => (
              <li key={i} className="builder-list-item bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] p-3 rounded border text-sm shadow-sm">
                <div>
                  <p className="font-bold text-[var(--foreground)]">{certificate.Nama}</p>
                  <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">
                    {certificate.Penerbit} {formatCertificateYearRange(certificate.Tahun, certificate.Masa_Berlaku) && `(${formatCertificateYearRange(certificate.Tahun, certificate.Masa_Berlaku)})`}
                  </p>
                </div>
                <div className="builder-icon-actions">
                  {certificate.Document && (
                    <button onClick={() => openDocumentPreview(certificate.Document)} className="cursor-pointer text-[var(--color-primary)] hover:text-[color-mix(in_oklab,var(--color-primary)_80%,black)] p-2 rounded-full hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] transition" aria-label="Preview sertifikat" title="Preview sertifikat"><EyeIcon className="h-5 w-5" /></button>
                  )}
                  <button onClick={() => handleEditCert(i)} className="cursor-pointer text-[var(--color-primary)] hover:text-[color-mix(in_oklab,var(--color-primary)_80%,black)] p-2 rounded-full hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] transition" aria-label="Edit sertifikat"><EditIcon className="h-5 w-5" /></button>
                  <button onClick={() => handleDeleteCert(i)} className="cursor-pointer text-[color-mix(in_oklab,var(--color-primary)_70%,black)] hover:text-[color-mix(in_oklab,var(--color-primary)_82%,black)] p-2 rounded-full hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)] transition" aria-label="Hapus sertifikat"><TrashIcon className="h-5 w-5" /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="builder-list-panel bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-4 rounded-xl border">
          <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-4 flex items-center gap-2">
            Penghargaan / Lomba 
            <span className="text-xs bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] px-2 py-1 rounded-full">
              {cvData.Awards.length}
            </span>
          </h3>
          {cvData.Awards.length === 0 && <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] italic">Belum ada data.</p>}
          <ul className="space-y-2">
            {cvData.Awards.map((award, i) => (
              <li key={i} className="builder-list-item bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] p-3 rounded border text-sm shadow-sm">
                <div>
                  <p className="font-bold text-[var(--foreground)]">{award.Nama_Award}</p>
                  <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">
                    {award.Judul_Kompetisi && `${award.Judul_Kompetisi} - `}
                    {award.Pemberi} {award.Tahun && `(${award.Tahun})`}
                  </p>
                </div>
                <div className="builder-icon-actions">
                  {award.Document && (
                    <button onClick={() => openDocumentPreview(award.Document)} className="cursor-pointer text-[var(--color-primary)] hover:text-[color-mix(in_oklab,var(--color-primary)_80%,black)] p-2 rounded-full hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] transition" aria-label="Preview penghargaan" title="Preview penghargaan"><EyeIcon className="h-5 w-5" /></button>
                  )}
                  <button onClick={() => handleEditAward(i)} 
                  className="cursor-pointer text-[var(--color-primary)] hover:text-[color-mix(in_oklab,var(--color-primary)_80%,black)] p-2 rounded-full hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] transition" 
                  aria-label="Edit penghargaan"
                  title="Edit penghargaan"
                  >
                    <EditIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDeleteAward(i)} 
                  className="cursor-pointer text-[color-mix(in_oklab,var(--color-primary)_70%,black)] hover:text-[color-mix(in_oklab,var(--color-primary)_82%,black)] p-2 rounded-full hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)] transition" 
                  aria-label="Hapus penghargaan"
                  title="Hapus penghargaan"
                  >
                    <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

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
      {loading && <BuilderLoadingOverlay message="Membaca dokumen..." progress={uploadProgress} />}
      <CustomModal {...modalProps} />
    </div>
  );
}


