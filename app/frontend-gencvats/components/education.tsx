import { useState, useRef } from "react";
import axios from "axios";
import { StepProps } from "@/types";
import { BuilderLoadingOverlay, useModal, CustomModal } from "./custommodal";
import { ArrowBackwardIcon, ArrowForwardIcon, EditIcon, FileUploadOutline, TrashIcon } from "./icons";
import { buildDuplicateKey, filterUniqueNewItems, formatDuplicateMessage, isDuplicateItem } from "./duplicate-data";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function Step2Education({ cvData, setCvData, apiUrl, nextStep, prevStep }: StepProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const tabs: Array<"upload" | "manual"> = ["upload", "manual"];
  const [manual, setManual] = useState({uni: "", jur: "", gel: "", thn: "", ipk: "", matkul: "", ket: ""});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { modalProps, showAlert, showConfirm, showSuccess } = useModal();

  const getEducationDuplicateKey = (entry: {
    Institusi: string;
    Jurusan: string;
    Gelar: string;
    Tahun_Lulus: string;
  }) => buildDuplicateKey([entry.Institusi, entry.Jurusan, entry.Gelar, entry.Tahun_Lulus]);

  // ================= UPLOAD =================
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    type EducationEntry = {
      Institusi: string;
      Jurusan: string;
      Gelar: string;
      Tahun_Lulus: string;
      IPK: string;
      Matkul: string;
      keterangan: string;
    };

    type WarningCandidate = {
      fileName: string;
      entry: EducationEntry;
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

    setLoading(true);
    let savedCount = 0;
    let processingFailedCount = 0;
    let invalidCount = 0;
    const invalidDetails: string[] = [];
    const processingFailedDetails: string[] = [];
    const acceptedEntries: EducationEntry[] = [];
    const acceptedDocumentNames: string[] = [];
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
        ? `Nama di dokumen sedikit berbeda. Perlu dicek.`
        : `Nama di dokumen tidak sama dengan Profil.`;
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

    try {
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("jenis", "ijazah");
        formData.append("target_name", cvData.Personal_Info.Nama);

        try {
          const res = await axios.post(`${apiUrl}/extract-ocr`, formData);
          const { data, validation } = res.data;
          const status: string = validation?.status || (validation?.is_valid ? "valid" : "invalid");
          const score: number | null =
            typeof validation?.similarity_score === "number" ? validation.similarity_score : null;

          const newEntry: EducationEntry = {
            Institusi: data.Universitas,
            Jurusan: data.Jurusan,
            Gelar: data.Gelar,
            Tahun_Lulus: data.Tahun_Lulus,
            IPK: data.IPK,
            Matkul: "",
            keterangan: "",
          };

          if (status === "warning") {
            warningCandidates.push({
              fileName: file.name,
              entry: newEntry,
              extractedName: formatDocumentName(validation?.extracted_name),
              score,
              message: formatValidationMessage("warning", score, validation?.message),
            });
            continue;
          }

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

          acceptedEntries.push(newEntry);
          acceptedDocumentNames.push(formatDocumentName(validation?.extracted_name));
          savedCount += 1;
        } catch (error) {
          processingFailedCount += 1;
          const reason = axios.isAxiosError(error)
            ? error.response?.data?.detail || error.message || "Gagal OCR."
            : "Gagal OCR.";
          processingFailedDetails.push(`- ${file.name}: ${reason}`);
        }
      }
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.detail || "Gagal OCR"
        : "Gagal OCR";
      showAlert("Error", message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const acceptedUploadRows = acceptedEntries.map((entry, index) => ({
        entry,
        documentName: acceptedDocumentNames[index] || "Tidak terdeteksi",
      }));
      const existingUploadRows = cvData.Education.map((entry) => ({
        entry,
        documentName: "",
      }));
      const uniqueAcceptedUploads = filterUniqueNewItems(
        existingUploadRows,
        acceptedUploadRows,
        (item) => getEducationDuplicateKey(item.entry)
      );
      const uniqueAcceptedEntries = uniqueAcceptedUploads.items.map((item) => item.entry);
      const warningFilterBase = [...cvData.Education, ...uniqueAcceptedEntries];
      const uniqueWarningEntries = filterUniqueNewItems(
        warningFilterBase,
        warningCandidates.map((item) => item.entry),
        getEducationDuplicateKey
      );

      savedCount = uniqueAcceptedEntries.length;
      duplicateCount = uniqueAcceptedUploads.duplicates.length + uniqueWarningEntries.duplicates.length;
      duplicateDetails.push(
        ...uniqueAcceptedUploads.duplicates.map((item) => `- ${item.entry.Institusi} - ${item.entry.Jurusan} (${item.entry.Tahun_Lulus})`),
        ...uniqueWarningEntries.duplicates.map((item) => `- ${item.Institusi} - ${item.Jurusan} (${item.Tahun_Lulus})`)
      );

      if (uniqueAcceptedEntries.length > 0) {
        setCvData((prev) => ({
          ...prev,
          Education: [...prev.Education, ...uniqueAcceptedEntries],
        }));
      }

      const buildDetailLines = (savedWarningCount: number, includeWarningList: boolean) => {
        const lines: string[] = [`Disimpan: ${savedCount + savedWarningCount} file.`];

        if (savedCount > 0) {
          lines.push(`Nama dokumen cocok dengan profil.`);
        }
        if (savedWarningCount > 0) {
          lines.push(`Disimpan setelah konfirmasi: ${savedWarningCount}.`);
        }
        if (warningCandidates.length > 0 && includeWarningList) {
          lines.push(
            "",
            `Perlu kamu cek (${warningCandidates.length}):`,
            ...warningCandidates.map(
              (item) => {
                return formatValidationBlock(item.fileName, item.message, item.extractedName);
              }
            )
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
          lines.push("", `Duplikat dilewati (${duplicateCount}):`, ...duplicateDetails);
        }
        return lines.join("\n");
      };

      if (warningCandidates.length > 0 && uniqueWarningEntries.items.length > 0) {
        const warningMessageLines = [
          buildDetailLines(0, true),
          "",
          "Simpan dokumen meragukan di atas?",
        ];

        showConfirm(
          "Cek dokumen ini",
          warningMessageLines.join("\n"),
          () => {
            setCvData((prev) => ({
              ...prev,
              Education: [...prev.Education, ...uniqueWarningEntries.items],
            }));
            showSuccess("Upload selesai", buildDetailLines(uniqueWarningEntries.items.length, true));
          },
          () => {
            if (savedCount > 0) {
              showSuccess("Upload selesai", buildDetailLines(0, false));
            } else {
        showAlert("Upload selesai", buildDetailLines(0, false));
            }
          }
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

  // ================= ADD / EDIT =================
  const addManual = () => {
    if (!manual.uni || !manual.jur || !manual.thn) {
      return showAlert("Lengkapi pendidikan", "Isi institusi, jurusan, dan tahun lulus.");
    }
    const ipkValue = (manual.ipk ?? "").toString().trim();
    if (ipkValue) {
      const ipkNumber = Number(ipkValue);
      if (Number.isNaN(ipkNumber) || ipkNumber < 0 || ipkNumber > 4) {
        return showAlert("IPK belum valid", "Gunakan angka 0.00 sampai 4.00.");
      }
    }

    const newData = {
      Institusi: manual.uni,
      Jurusan: manual.jur,
      Gelar: manual.gel,
      Tahun_Lulus: manual.thn,
      IPK: ipkValue,
      Matkul: manual.matkul,
      keterangan: manual.ket
    };

    if (isDuplicateItem(cvData.Education, newData, getEducationDuplicateKey, editingIndex)) {
      return showAlert(
        "Data duplikat",
        formatDuplicateMessage("Pendidikan", [`${newData.Institusi} - ${newData.Jurusan} (${newData.Tahun_Lulus})`])
      );
    }

    if (editingIndex !== null) {
      setCvData(prev => ({
        ...prev,
        Education: prev.Education.map((item, i) =>
          i === editingIndex ? newData : item
        )
      }));
      setEditingIndex(null);
    } else {
      setCvData(prev => ({
        ...prev,
        Education: [...prev.Education, newData]
      }));
    }

    setManual({ uni: "", jur: "", gel: "", thn: "", ipk: "", matkul: "", ket: "" });
  };

  const handleEdit = (index: number) => {
    const data = cvData.Education[index];
    setManual({
      uni: data.Institusi,
      jur: data.Jurusan,
      gel: data.Gelar,
      thn: data.Tahun_Lulus,
      ipk: data.IPK || "",
      matkul: data.Matkul || "",
      ket: data.keterangan || ""
    });
    setEditingIndex(index);
    setActiveTab("manual");
  };

  const handleDelete = (index: number) => {
    showConfirm("Hapus pendidikan", "Data ini akan dihapus dari CV.", () => {
      setCvData(prev => ({
        ...prev,
        Education: prev.Education.filter((_, i) => i !== index)
      }));
    });
  };

  return (
    <div>
      <div className="builder-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer px-6 py-3 font-bold text-sm rounded-t-lg transition ${
              activeTab === tab 
                ? "bg-[var(--color-primary)] text-white shadow-lg" 
                : "bg-[color-mix(in_oklab,var(--color-surface)_88%,white)] text-[color-mix(in_oklab,var(--foreground)_92%,white)] hover:bg-[color-mix(in_oklab,var(--color-soft)_45%,white)]"
            }`}
          >
            {tab === "upload" ? "Upload" : tab === "manual" ? "Manual" : ""}
          </button>
        ))}
        </div>
      {/* ================= UPLOAD FORM ================= */}
      {activeTab === "upload" && (
        <div key="tab-upload" className="builder-inner-panel p-8 border-2 border-dashed border-[color-mix(in_oklab,var(--color-soft)_75%,white)] rounded-xl bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] text-center hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] transition relative">
          <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              disabled={loading} 
              multiple
              accept=".pdf,.jpg,.jpeg,.png" 
          />
          <div className="flex flex-col items-center">
            <FileUploadOutline className="mb-3 text-[color-mix(in_oklab,var(--foreground)_55%,white)]" />
            <p className="font-bold text-[color-mix(in_oklab,var(--foreground)_78%,white)]">Upload ijazah</p>
            <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] mt-1">PDF, JPG, PNG. Maks. 5 MB per file.</p>
          </div>
        </div>
      )}
      {/* ================= MANUAL FORM ================= */}
      {activeTab === "manual" && (
        <div className="builder-inner-panel grid grid-cols-1 md:grid-cols-2 gap-5 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-6 rounded-xl border">

          {/* Institusi */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Nama Institusi <span className="text-red-700">*</span>
            </label>
            <input
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-[color-mix(in_oklab,var(--foreground)_55%,white)]"
              placeholder="Universitas Indonesia"
              value={manual.uni || ""}
              onChange={e => setManual({ ...manual, uni: e.target.value })}
            />
          </div>

          {/* Jurusan */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Jurusan <span className="text-red-700">*</span>
            </label>
            <input
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-[color-mix(in_oklab,var(--foreground)_55%,white)]"
              placeholder="Teknik Informatika"
              value={manual.jur || ""}
              onChange={e => setManual({ ...manual, jur: e.target.value })}
            />
          </div>

          {/* Tahun */}
          <div>
            <label className="block text-sm font-bold mb-1">
              Tahun Lulus <span className="text-red-700">*</span>
            </label>
            <input
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-[color-mix(in_oklab,var(--foreground)_55%,white)]"
              placeholder="2020"
              value={manual.thn || ""}
              onChange={e => setManual({ ...manual, thn: e.target.value })}
            />
          </div>

          {/* Gelar */}
          <div>
            <label className="block text-sm font-bold mb-1">Gelar</label>
            <input
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-[color-mix(in_oklab,var(--foreground)_55%,white)]"
              placeholder="S. Kom"
              value={manual.gel || ""}
              onChange={e => setManual({ ...manual, gel: e.target.value })}
            />
          </div>

          {/* IPK */}
          <div>
            <label className="block text-sm font-bold mb-1">IPK</label>
            <input
              type="number"
              min={0}
              max={4}
              step="0.01"
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-[color-mix(in_oklab,var(--foreground)_55%,white)]"
              placeholder="0.00 - 4.00"
              value={manual.ipk || ""}
              onChange={e => setManual({ ...manual, ipk: e.target.value })}
            />
          </div>

          {/* Matkul */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">
              Mata Kuliah Relevan
            </label>
            <textarea
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-[color-mix(in_oklab,var(--foreground)_55%,white)]"
              placeholder="Machine Learning, NLP, Data Mining"
              value={manual.matkul || ""}
              onChange={e => setManual({ ...manual, matkul: e.target.value })}
            />
          </div>


          {/* <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">
              Keterangan
            </label>
            <textarea
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-[color-mix(in_oklab,var(--foreground)_55%,white)]"
              placeholder="Prestasi, organisasi, atau catatan singkat"
              value={manual.ket || ""}
              onChange={e => setManual({ ...manual, ket: e.target.value })}
            />
          </div> */}

          {/* INDICATOR EDIT */}
          {editingIndex !== null && (
            <p className="block text-sm font-bold mb-1">
              Sedang mengedit data pendidikan
            </p>
          )}
          <button
            onClick={addManual}
            className={`cursor-pointer md:col-span-2 py-3 rounded-lg font-bold text-white transition ${
              editingIndex !== null
                ? "bg-[var(--color-accent)] hover:bg-[color-mix(in_oklab,var(--color-accent)_82%,black)]"
                : "bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)]"
            }`}
          >
            {editingIndex !== null ? "Simpan perubahan" : "Tambah pendidikan"}
          </button>
        </div>
      )}

      <div className="builder-list-panel mt-8 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-5 rounded-xl border">
        <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-4 flex items-center gap-2">
          Pendidikan <span className="text-xs bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] px-2 py-1 rounded-full text-[var(--foreground)]">{cvData.Education.length}</span>
        </h3>

        {cvData.Education.length === 0 && (
          <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] italic">Belum ada data</p>
        )}

        <div className="space-y-3">
          {cvData.Education.map((e, i) => (
            <div
              key={i}
              className="builder-list-item bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] border p-4 rounded-lg shadow-sm hover:shadow-md transition"
            >
              <div>
                <p className="font-bold text-[color-mix(in_oklab,var(--foreground)_92%,black)]">{e.Institusi}</p>
                <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_78%,white)]">
                  {e.Gelar && `${e.Gelar} - `} {e.Jurusan} {e.Tahun_Lulus && `(${e.Tahun_Lulus})`}
                </p>

                {e.IPK && (
                  <p className="text-xs text-[var(--color-primary)]">IPK: {e.IPK}</p>
                )}

                {e.Matkul && (
                  <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_78%,white)]">
                    Mata Kuliah Relevan: {e.Matkul}
                  </p>
                )}
                {e.keterangan && (
                  <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_78%,white)]">
                    Keterangan: {e.keterangan}
                  </p>
                )}
              </div>

              <div className="builder-icon-actions">
                <button
                  onClick={() => handleEdit(i)}
                  aria-label="Edit pendidikan"
                  className="cursor-pointer text-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] p-2 rounded-full transition flex items-center justify-center"
                >
                  <EditIcon className="h-5 w-5" />
                </button>

                <button
                  onClick={() => handleDelete(i)}
                  aria-label="Hapus pendidikan"
                  className="cursor-pointer text-[color-mix(in_oklab,var(--color-primary)_70%,black)] hover:bg-[color-mix(in_oklab,var(--color-accent)_25%,white)] p-2 rounded-full transition flex items-center justify-center"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="builder-form-actions mt-8">
        <button
          onClick={prevStep}
          className="cursor-pointer px-6 py-2 bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] rounded-lg font-bold hover:bg-[color-mix(in_oklab,var(--color-soft)_75%,white)] flex items-center gap-2"
        >
          <ArrowBackwardIcon className="h-4 w-4" />
          Kembali
        </button>

        <button
          onClick={nextStep}
          className="cursor-pointer px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] flex items-center gap-2"
        >
          Lanjut
          <ArrowForwardIcon className="h-4 w-4" />
        </button>
      </div>

      {loading && <BuilderLoadingOverlay message="Membaca ijazah..." />}
      <CustomModal {...modalProps} />
    </div>
  );
}


