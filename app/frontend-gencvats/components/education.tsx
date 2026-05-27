import { useState, useRef } from "react";
import axios from "axios";
import { StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal";
import { ArrowBackwardIcon, ArrowForwardIcon, EditIcon, FileUploadOutline, TrashIcon, LoadingTwotoneLoop } from "./icons";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export default function Step2Education({ cvData, setCvData, apiUrl, nextStep, prevStep }: StepProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const tabs: Array<"upload" | "manual"> = ["upload", "manual"];
  const [manual, setManual] = useState({uni: "", jur: "", gel: "", thn: "", ipk: "", matkul: ""});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { modalProps, showAlert, showConfirm, showSuccess } = useModal();

  // ================= UPLOAD =================
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    type EducationEntry = {
      Institusi: string;
      Jurusan: string;
      Gelar: string;
      Tahun_Lulus: string;
      IPK: string;
      Matkul: string;
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
        ? `Data Meragukan dengan kemiripan nama ${score}% terhadap referensi. Perlu konfirmasi.`
        : `Data Tidak sesuai dengan kemiripan nama ${score}% terhadap referensi.`;
    };

    const formatValidationBlock = (
      fileName: string,
      statusMessage: string,
      score: number | null,
      extractedName: string
    ) => {
      const scoreText = score !== null ? `${score}%` : "Tidak tersedia";
      return [
        `${fileName}`,
        `Alasan Ditolak : ${statusMessage}`,
        `Nama dalam Dokumen: "${extractedName}"`,
        `Nama Profil: "${cvData.Personal_Info.Nama}"`,
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
                score,
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

      if (acceptedEntries.length > 0) {
        setCvData((prev) => ({
          ...prev,
          Education: [...prev.Education, ...acceptedEntries],
        }));
      }

      const buildDetailLines = (savedWarningCount: number, includeWarningList: boolean) => {
        const lines: string[] = [`${savedCount + savedWarningCount} file disimpan.`];

        if (savedCount > 0) {
          lines.push(...acceptedDocumentNames.map((documentName) => `- Valid pada dokumen ${documentName}`));
        }
        if (savedWarningCount > 0) {
          lines.push(`- Meragukan disimpan: ${savedWarningCount}.`);
        }
        if (warningCandidates.length > 0 && includeWarningList) {
          lines.push(
            "",
            `Perlu konfirmasi (${warningCandidates.length}):`,
            ...warningCandidates.map(
              (item) => {
                return formatValidationBlock(item.fileName, item.message, item.score, item.extractedName);
              }
            )
          );
        }
        if (warningCandidates.length > 0 && !includeWarningList) {
          lines.push(`- Dokumen meragukan tidak disimpan: ${warningCandidates.length}.`);
        }
        if (invalidCount > 0) {
          lines.push("", `Dokumen ditolak (${invalidCount}):`, ...invalidDetails);
        }
        if (oversizedDetails.length > 0) {
          lines.push("", `Dokumen ditolak ukuran (${oversizedDetails.length}):`, ...oversizedDetails);
        }
        if (processingFailedCount > 0) {
          lines.push("", `Dokumen gagal diproses (${processingFailedCount}):`, ...processingFailedDetails);
        }
        return lines.join("\n");
      };

      if (warningCandidates.length > 0) {
        const warningMessageLines = [
          buildDetailLines(0, true),
          "",
          "Simpan dokumen meragukan di atas?",
        ];

        showConfirm(
          "Konfirmasi Dokumen Meragukan",
          warningMessageLines.join("\n"),
          () => {
            setCvData((prev) => ({
              ...prev,
              Education: [...prev.Education, ...warningCandidates.map((item) => item.entry)],
            }));
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

  // ================= ADD / EDIT =================
  const addManual = () => {
    if (!manual.uni || !manual.jur || !manual.thn) {
      return showAlert("Perhatian", "Institusi, Jurusan, Tahun wajib diisi!");
    }
    const ipkValue = (manual.ipk ?? "").toString().trim();
    if (ipkValue) {
      const ipkNumber = Number(ipkValue);
      if (Number.isNaN(ipkNumber) || ipkNumber < 0 || ipkNumber > 4) {
        return showAlert("Perhatian", "IPK harus berupa angka antara 0.00 sampai 4.00.");
      }
    }

    const newData = {
      Institusi: manual.uni,
      Jurusan: manual.jur,
      Gelar: manual.gel,
      Tahun_Lulus: manual.thn,
      IPK: ipkValue,
      Matkul: manual.matkul
    };

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

    setManual({ uni: "", jur: "", gel: "", thn: "", ipk: "", matkul: "" });
  };

  const handleEdit = (index: number) => {
    const data = cvData.Education[index];
    setManual({
      uni: data.Institusi,
      jur: data.Jurusan,
      gel: data.Gelar,
      thn: data.Tahun_Lulus,
      ipk: data.IPK || "",
      matkul: data.Matkul || ""
    });
    setEditingIndex(index);
    setActiveTab("manual");
  };

  const handleDelete = (index: number) => {
    showConfirm("Hapus", "Yakin hapus?", () => {
      setCvData(prev => ({
        ...prev,
        Education: prev.Education.filter((_, i) => i !== index)
      }));
    });
  };

  return (
    <div>
      <div className="flex gap-2 mt-2 mb-6 border-b">
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
            {tab === "upload" ? "Upload File" : tab === "manual" ? "Manual Input" : ""}
          </button>
        ))}
        </div>
      {/* ================= UPLOAD FORM ================= */}
      {activeTab === "upload" && (
        <div key="tab-upload" className="p-8 border-2 border-dashed border-[color-mix(in_oklab,var(--color-soft)_75%,white)] rounded-xl bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] text-center hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] transition relative">
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
              {loading ? (
                <div className="flex flex-col items-center">
                  <LoadingTwotoneLoop className="mb-3 h-10 w-10 text-[var(--color-primary)] animate-spin"/>
                  <p className="font-bold text-[var(--color-primary)] animate-pulse">
                    Sedang membaca & memvalidasi...
                  </p>
                  <p className="mt-1 text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] animate-pulse">
                    Mohon tunggu sebentar
                  </p>
                </div>                    
              ) : (
                  <>
                    <FileUploadOutline className="mb-3 text-[color-mix(in_oklab,var(--foreground)_55%,white)]" />
                    <p className="font-bold text-[color-mix(in_oklab,var(--foreground)_78%,white)]">Klik atau geser file Ijazah ke sini</p>
                    <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] mt-1">PDF, JPG, PNG (Max 5MB per file)</p>
                  </>
              )}
          </div>
        </div>
      )}
      {/* ================= MANUAL FORM ================= */}
      {activeTab === "manual" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-6 rounded-xl border">

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
              placeholder="Range 0.00 - 4.00"
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
            {editingIndex !== null ? "Update Pendidikan" : "Tambah Pendidikan"}
          </button>
        </div>
      )}

      <div className="mt-8 bg-[color-mix(in_oklab,var(--color-surface)_85%,white)] p-5 rounded-xl border">
        <h3 className="font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-4 flex items-center gap-2">
          Daftar Pendidikan <span className="text-xs bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] px-2 py-1 rounded-full text-[var(--foreground)]">{cvData.Education.length}</span>
        </h3>

        {cvData.Education.length === 0 && (
          <p className="text-xs text-[color-mix(in_oklab,var(--foreground)_55%,white)] italic">Belum ada data</p>
        )}

        <div className="space-y-3">
          {cvData.Education.map((e, i) => (
            <div
              key={i}
              className="bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] border p-4 rounded-lg flex justify-between items-center shadow-sm hover:shadow-md transition"
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
              </div>

              <div className="flex gap-2">
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

      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          className="cursor-pointer px-6 py-2 bg-[color-mix(in_oklab,var(--color-soft)_55%,white)] rounded-lg font-bold hover:bg-[color-mix(in_oklab,var(--color-soft)_75%,white)] flex items-center gap-2"
        >
          <ArrowBackwardIcon className="h-4 w-4" />
          Back
        </button>

        <button
          onClick={nextStep}
          className="cursor-pointer px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg font-bold hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] flex items-center gap-2"
        >
          Next
          <ArrowForwardIcon className="h-4 w-4" />
        </button>
      </div>

      <CustomModal {...modalProps} />
    </div>
  );
}


