import { useState, useRef } from "react";
import axios from "axios";
import { StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal";
import { ArrowBackwardIcon, ArrowForwardIcon, EditIcon, FileUploadOutline, TrashIcon } from "./icons";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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

export default function Step4Certificates({ cvData, setCvData, apiUrl, nextStep, prevStep }: StepProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadCategory, setUploadCategory] = useState<"Keahlian" | "Penghargaan">("Keahlian");
  const [manualForm, setManualForm] = useState({ kategori: "Keahlian", nama: "", penerbit: "", tahun: "", masaBerlaku: "" });
  const [editingState, setEditingState] = useState<{ type: "Keahlian" | "Kompetisi"; index: number } | null>(null);

  const { modalProps, showAlert, showConfirm, showSuccess } = useModal();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    type UploadResult = {
      certification?: { Nama: string; Penerbit: string; Tahun: string; Masa_Berlaku?: string };
      award?: { Nama_Award: string; Pemberi: string; Tahun: string };
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
      showAlert("Perhatian", "Mohon isi Nama Lengkap dulu di Step 1.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setLoading(true);
    let savedCount = 0;
    let processingFailedCount = 0;
    let invalidCount = 0;
    const invalidDetails: string[] = [];
    const processingFailedDetails: string[] = [];

    const acceptedResults: UploadResult[] = [];
    const warningCandidates: WarningCandidate[] = [];

    const formatValidationBlock = (
      fileName: string,
      statusMessage: string,
      score: number | null,
      extractedName: string
    ) => {
      const scoreText = score !== null ? `${score}%` : "Tidak tersedia";
      return [
        `- ${fileName}`,
        `  Alasan: ${statusMessage}`,
        `  Skor: ${scoreText}`,
        `  Dokumen: "${extractedName}"`,
        `  Profil: "${cvData.Personal_Info.Nama}"`,
      ].join("\n");
    };

    const buildResultFromOcr = (data: Record<string, string>): UploadResult => {
      const result: UploadResult = {
        skillsHard: [],
        skillsSoft: [],
      };

      if (uploadCategory === "Penghargaan") {
        result.award = {
          Nama_Award: data.Judul_Sertifikat || "Tanpa Judul",
          Pemberi: data.Lembaga_Penerbit || "Penyelenggara Tidak Terdeteksi",
          Tahun: data.Tahun_Sertifikat || "-",
        };
      } else {
        result.certification = {
          Nama: data.Judul_Sertifikat || "Tanpa Judul",
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

    const applyUploadResults = (results: UploadResult[]) => {
      if (!results.length) return;
      setCvData((prev) => {
        const newData = {
          ...prev,
          Certifications: [...prev.Certifications],
          Awards: [...prev.Awards],
          Skills_Hard: [...prev.Skills_Hard],
          Skills_Soft: [...prev.Skills_Soft],
        };

        for (const result of results) {
          if (result.certification) newData.Certifications.push(result.certification);
          if (result.award) newData.Awards.push(result.award);
          if (result.skillsHard.length) newData.Skills_Hard.push(...result.skillsHard);
          if (result.skillsSoft.length) newData.Skills_Soft.push(...result.skillsSoft);
        }

        return newData;
      });
    };

    try {
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("jenis", "sertifikat");
        formData.append("target_name", cvData.Personal_Info.Nama);
        try {
          const res = await axios.post(`${apiUrl}/extract-ocr`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
              "ngrok-skip-browser-warning": "true",
            },
          });
          const { data, validation } = res.data;
          const status: string = validation?.status || (validation?.is_valid ? "valid" : "invalid");
          const score: number | null =
            typeof validation?.similarity_score === "number" ? validation.similarity_score : null;
          const result = buildResultFromOcr(data);

          if (status === "warning") {
            warningCandidates.push({
              fileName: file.name,
              result,
              extractedName: validation?.extracted_name || "Tidak terdeteksi",
              score,
              message: validation?.message || "Meragukan",
            });
            continue;
          }

          if (status === "invalid" || (validation && !validation.is_valid)) {
            invalidCount += 1;
            invalidDetails.push(
              formatValidationBlock(
                file.name,
                validation?.message || "Tidak valid",
                score,
                validation?.extracted_name || "Tidak terdeteksi"
              )
            );
            continue;
          }

          acceptedResults.push(result);
          savedCount += 1;
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
      if (fileInputRef.current) fileInputRef.current.value = "";

      applyUploadResults(acceptedResults);

      const buildDetailLines = (savedWarningCount: number, includeWarningList: boolean) => {
        const lines: string[] = [`${savedCount + savedWarningCount} file disimpan ke kategori ${uploadCategory}.`];

        if (savedCount > 0) {
          lines.push(`- Valid: ${savedCount} (skor > 70%).`);
        }
        if (savedWarningCount > 0) {
          lines.push(`- Meragukan disimpan: ${savedWarningCount} (skor 50-70%).`);
        }
        if (warningCandidates.length > 0 && includeWarningList) {
          lines.push(
            "",
            `Perlu konfirmasi (${warningCandidates.length}):`,
            ...warningCandidates.map((item) => {
              return formatValidationBlock(item.fileName, item.message, item.score, item.extractedName);
            })
          );
        }
        if (warningCandidates.length > 0 && !includeWarningList) {
          lines.push(`- Meragukan tidak disimpan: ${warningCandidates.length} (skor 50-70%).`);
        }
        if (invalidCount > 0) {
          lines.push("", `Ditolak (${invalidCount}) - skor < 50% / nama tidak terbaca:`, ...invalidDetails);
        }
        if (oversizedDetails.length > 0) {
          lines.push("", `Ditolak ukuran (${oversizedDetails.length}):`, ...oversizedDetails);
        }
        if (processingFailedCount > 0) {
          lines.push("", `Gagal diproses (${processingFailedCount}):`, ...processingFailedDetails);
        }
        return lines.join("\n");
      };

      if (warningCandidates.length > 0) {
        const warningMessageLines = [
          `${warningCandidates.length} file perlu konfirmasi (skor 50-70%).`,
          "Simpan file berikut?",
          "",
          ...warningCandidates.map((item) => {
            return formatValidationBlock(item.fileName, item.message, item.score, item.extractedName);
          }),
        ];

        showConfirm(
          "Konfirmasi Dokumen Meragukan",
          warningMessageLines.join("\n"),
          () => {
            applyUploadResults(warningCandidates.map((item) => item.result));
            showSuccess("Upload selesai", buildDetailLines(warningCandidates.length, true));
          },
          () => {
            if (savedCount > 0) {
              showSuccess("Upload selesai", buildDetailLines(0, false));
            } else {
              showAlert("Upload selesai dengan penolakan", buildDetailLines(0, false));
            }
          }
        );
        return;
      }

      if (savedCount > 0) {
        showSuccess("Upload selesai", buildDetailLines(0, true));
      } else if (processingFailedCount > 0 || invalidCount > 0 || oversizedDetails.length > 0) {
        showAlert("Upload gagal", buildDetailLines(0, true));
      }
    }
  };

  const addManual = () => {
    if (!manualForm.nama) return showAlert("Perhatian", "Isi nama sertifikat terlebih dahulu!");

    setCvData((prev) => {
      const newData = { ...prev };

      if (manualForm.kategori === "Kompetisi") {
        const awardData = {
          Nama_Award: manualForm.nama,
          Pemberi: manualForm.penerbit,
          Tahun: manualForm.tahun,
        };

        if (editingState?.type === "Kompetisi") {
          newData.Awards = prev.Awards.map((item, i) => (i === editingState.index ? awardData : item));
        } else {
          newData.Awards = [...prev.Awards, awardData];
        }
      } else {
        const certData = {
          Nama: manualForm.nama,
          Penerbit: manualForm.penerbit,
          Tahun: manualForm.tahun,
          Masa_Berlaku: manualForm.masaBerlaku,
        };

        if (editingState?.type === "Keahlian") {
          newData.Certifications = prev.Certifications.map((item, i) => (i === editingState.index ? certData : item));
        } else {
          newData.Certifications = [...prev.Certifications, certData];
        }
      }

      return newData;
    });

    setEditingState(null);
    setManualForm({ kategori: "Keahlian", nama: "", penerbit: "", tahun: "", masaBerlaku: "" });
  };

  const handleEditCert = (idx: number) => {
    const cert = cvData.Certifications[idx];
    setManualForm({
      kategori: "Keahlian",
      nama: cert.Nama || "",
      penerbit: cert.Penerbit || "",
      tahun: cert.Tahun || "",
      masaBerlaku: cert.Masa_Berlaku || "",
    });
    setEditingState({ type: "Keahlian", index: idx });
    setActiveTab("manual");
  };

  const handleEditAward = (idx: number) => {
    const award = cvData.Awards[idx];
    setManualForm({
      kategori: "Kompetisi",
      nama: award.Nama_Award || "",
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
    <div className="bg-[color-mix(in_oklab,var(--color-surface)_94%,white)] p-8 rounded-2xl shadow-xl text-[var(--foreground)] animate-fade-in-up relative">
      <h2 className="text-2xl font-bold mb-6 border-b pb-2">3. Sertifikat & Prestasi</h2>
      <div className="flex gap-2 mb-6 border-b">
        {["upload", "manual"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "upload" | "manual")}
            className={`cursor-pointer px-6 py-3 font-bold text-sm rounded-t-lg transition ${
              activeTab === tab ? "bg-[var(--color-primary)] text-white shadow-lg" : "bg-[color-mix(in_oklab,var(--color-surface)_88%,white)] text-[color-mix(in_oklab,var(--foreground)_92%,white)] hover:bg-[color-mix(in_oklab,var(--color-soft)_45%,white)]"
            }`}
          >
            {tab === "upload" ? "Upload File" : "Manual Input"}
          </button>
        ))}
      </div>

      {activeTab === "upload" ? (
        <div className="space-y-4">
          <div className="bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] p-4 rounded-xl border border-[color-mix(in_oklab,var(--color-soft)_55%,white)]">
            <p className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-3 text-sm">Jenis dokumen yang akan diupload:</p>
            <div className="flex gap-4">
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
                  <span className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">Contoh: Course, Bootcamp</span>
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
                  <span className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">Contoh: Juara 1, Best Capstone</span>
                </div>
              </label>
            </div>
          </div>

          <div className="p-8 border-2 border-dashed border-[color-mix(in_oklab,var(--color-soft)_75%,white)] rounded-xl bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] text-center hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] transition relative">
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
              <FileUploadOutline className="mb-3 h-16 w-16 text-[color-mix(in_oklab,var(--foreground)_55%,white)]" />
              {loading ? (
                <p className="text-[var(--color-primary)] font-bold animate-pulse">Sedang membaca & memvalidasi...</p>
              ) : (
                <>
                  <p className="font-bold text-[color-mix(in_oklab,var(--foreground)_78%,white)]">Klik atau geser file ke sini</p>
                  <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] mt-1">PDF, JPG, PNG, JPEG (Max 5MB per file)</p>
                  <p className="text-xs font-semibold text-[var(--color-primary)] mt-2 bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] px-2 py-1 rounded">
                    Masuk bagian {uploadCategory === "Keahlian" ? "Sertifikat Keahlian" : "Penghargaan"}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-6 rounded-xl border">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">Kategori</label>
            <select
              value={manualForm.kategori || "Keahlian"}
              onChange={(e) => setManualForm({ ...manualForm, kategori: e.target.value })}
              className="w-full p-3 border rounded-lg bg-[color-mix(in_oklab,var(--color-surface)_96%,white)]"
            >
              <option value="Keahlian">Sertifikat Keahlian / Kompetensi</option>
              <option value="Kompetisi">Juara Kompetisi / Penghargaan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Nama Sertifikat <span className="text-red-700">*</span></label>
            <input
              placeholder="Nama Sertifikat / Lomba"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              value={manualForm.nama || ""}
              onChange={(e) => setManualForm({ ...manualForm, nama: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Penerbit / Penyelenggara</label>
            <input
              placeholder="Penerbit / Penyelenggara"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              value={manualForm.penerbit || ""}
              onChange={(e) => setManualForm({ ...manualForm, penerbit: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Tahun</label>
            <input
              placeholder="Tahun"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              value={manualForm.tahun || ""}
              onChange={(e) => setManualForm({ ...manualForm, tahun: e.target.value })}
            />
          </div>
          {manualForm.kategori === "Keahlian" && (
            <div>
              <label className="block text-sm font-bold mb-1">Tahun Kadaluarsa</label>
              <input
                placeholder="Contoh: 2022"
                className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                value={manualForm.masaBerlaku || ""}
                onChange={(e) => setManualForm({ ...manualForm, masaBerlaku: e.target.value })}
              />
            </div>
          )}
          {editingState !== null && (
            <p className="text-sm text-[color-mix(in_oklab,var(--color-accent)_68%,black)] font-semibold md:col-span-2">
              Sedang mengedit {editingState.type === "Keahlian" ? "sertifikat keahlian" : "penghargaan / lomba"}
            </p>
          )}
          <button
            onClick={addManual}
            className={`cursor-pointer md:col-span-2 py-3 rounded-lg text-white font-bold shadow transition ${
              editingState !== null ? "bg-[var(--color-accent)] hover:bg-[color-mix(in_oklab,var(--color-accent)_82%,black)]" : "bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)]"
            }`}
          >
            {editingState !== null ? "Update Data" : "Tambahkan Manual"}
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-4 rounded-xl border">
          <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_85%,black)] mb-4 flex items-center gap-2">
            Sertifikat Keahlian 
            <span className="text-xs bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] px-2 py-1 rounded-full">
              {cvData.Certifications.length}
            </span>
          </h3>
          {cvData.Certifications.length === 0 && <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] italic">Belum ada data.</p>}
          <ul className="space-y-2">
            {cvData.Certifications.map((certificate, i) => (
              <li key={i} className="bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] p-3 rounded border flex justify-between items-start text-sm shadow-sm">
                <div>
                  <p className="font-bold text-[var(--foreground)]">{certificate.Nama}</p>
                  <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">
                    {certificate.Penerbit} {formatCertificateYearRange(certificate.Tahun, certificate.Masa_Berlaku) && `(${formatCertificateYearRange(certificate.Tahun, certificate.Masa_Berlaku)})`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEditCert(i)} className="cursor-pointer text-[var(--color-primary)] hover:text-[color-mix(in_oklab,var(--color-primary)_80%,black)] p-2 rounded-full hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] transition" aria-label="Edit sertifikat"><EditIcon className="h-5 w-5" /></button>
                  <button onClick={() => handleDeleteCert(i)} className="cursor-pointer text-[color-mix(in_oklab,var(--color-primary)_70%,black)] hover:text-[color-mix(in_oklab,var(--color-primary)_82%,black)] p-2 rounded-full hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)] transition" aria-label="Hapus sertifikat"><TrashIcon className="h-5 w-5" /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-4 rounded-xl border">
          <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-4 flex items-center gap-2">
            Penghargaan / Lomba 
            <span className="text-xs bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] px-2 py-1 rounded-full">
              {cvData.Awards.length}
            </span>
          </h3>
          {cvData.Awards.length === 0 && <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] italic">Belum ada data.</p>}
          <ul className="space-y-2">
            {cvData.Awards.map((award, i) => (
              <li key={i} className="bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] p-3 rounded border flex justify-between items-start text-sm shadow-sm">
                <div>
                  <p className="font-bold text-[var(--foreground)]">{award.Nama_Award}</p>
                  <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_65%,white)]">{award.Pemberi} {award.Tahun && `(${award.Tahun})`}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEditAward(i)} className="cursor-pointer text-[var(--color-primary)] hover:text-[color-mix(in_oklab,var(--color-primary)_80%,black)] p-2 rounded-full hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] transition" aria-label="Edit penghargaan"><EditIcon className="h-5 w-5" /></button>
                  <button onClick={() => handleDeleteAward(i)} className="cursor-pointer text-[color-mix(in_oklab,var(--color-primary)_70%,black)] hover:text-[color-mix(in_oklab,var(--color-primary)_82%,black)] p-2 rounded-full hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)] transition" aria-label="Hapus penghargaan"><TrashIcon className="h-5 w-5" /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex justify-between mt-8 pt-6">
        <button
          type="button"
          onClick={prevStep}
          className="cursor-pointer px-6 py-2 rounded-lg font-bold text-[color-mix(in_oklab,var(--foreground)_78%,white)] bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] hover:bg-[color-mix(in_oklab,var(--color-soft)_75%,white)] transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <ArrowBackwardIcon className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="cursor-pointer px-6 py-2 rounded-lg font-bold text-white bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center gap-2"
        >
          Next
          <ArrowForwardIcon className="h-4 w-4" />
        </button>
      </div>
      <CustomModal {...modalProps} />
    </div>
  );
}


