import { useEffect, useState } from "react";
import axios from "axios";
import { CVDataState, StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal"; // IMPORT HOOK MODAL

export default function Step5Review({ cvData, setCvData, prevStep }: StepProps) {
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

  // PANGGIL HOOK MODAL
  const { modalProps, showAlert, showSuccess } = useModal();

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

  const togglePersonalField = (key: keyof typeof selectedContent.personalInfo) => {
    setSelectedContent(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [key]: !prev.personalInfo[key]
      }
    }));
  };

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

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl text-gray-800 relative overflow-hidden animate-fade-in-up">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
            <p className="font-bold text-lg text-blue-900 animate-pulse text-center">{statusMsg}</p>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-6 border-b pb-4">5. Review & Finalisasi</h2>

      {/* LANGUAGE SELECTOR */}
      <div className="mb-8 bg-blue-50 p-6 rounded-xl border border-blue-100">
        <label className="block font-bold text-gray-700 mb-3 text-lg">Pilih Bahasa CV Output:</label>
        <select 
            value={cvData.Language} 
            onChange={(e) => setCvData({...cvData, Language: e.target.value})}
            className="cursor-pointer w-full border p-4 rounded-lg bg-white text-lg"
        >
            <option value="English">English</option>
            <option value="Indonesia">Indonesia</option>
        </select>
        <p className="text-sm text-gray-500 mt-2">*AI akan menerjemahkan & menyesuaikan gaya bahasa otomatis berdasarkan pilihan ini.</p>
      </div>

      {/* SUMMARY PREVIEW */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-700 mb-2">Preview Summary (About Me)</h3>
        <textarea 
            className="w-full border p-4 rounded-lg bg-gray-50 h-32 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={cvData.Personal_Info.Summary || ""}
            onChange={(e) => setCvData({...cvData, Personal_Info: {...cvData.Personal_Info, Summary: e.target.value}})}
            placeholder="Summary akan otomatis diisi oleh AI saat Anda klik tombol Enhance..."
        />
        <button 
            type="button"
            onClick={handleEnhance}
            className="cursor-pointer w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
        >
            Polish & Rewrite with AI
        </button>
      </div>
      
      {/* DATA STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-center">
        <div className="bg-gray-100 p-3 rounded-lg">
            <div className="text-xl font-bold text-blue-600">{cvData.Education.length}</div>
            <div className="text-xs text-gray-500">Pendidikan</div>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg">
            <div className="text-xl font-bold text-green-600">{cvData.Experience.length}</div>
            <div className="text-xs text-gray-500">Pengalaman</div>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg">
            <div className="text-xl font-bold text-purple-600">{cvData.Projects.length}</div>
            <div className="text-xs text-gray-500">Proyek</div>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg">
            <div className="text-xl font-bold text-orange-600">{cvData.Certifications.length + cvData.Awards.length}</div>
            <div className="text-xs text-gray-500">Sertifikat</div>
        </div>
      </div>

      <div className="mb-8 bg-gray-50 p-6 rounded-xl border">
        <div>
          <h3 className="font-bold text-gray-700 mb-2">Preview Summary (About Me)</h3>
          <p className="text-sm text-gray-500">
            User bisa memilih item tertentu di setiap bagian. Hanya item yang dicentang yang akan ikut saat download.
          </p>
        </div>

        <div className="mt-6 max-h-[28rem] overflow-y-auto pr-2 space-y-4">
          {/* <div className="rounded-xl border bg-white">
            <button
              type="button"
              onClick={() => toggleExpandedSection("personalInfo")}
              className="w-full flex items-center justify-between px-4 py-4 text-left"
            >
              <div>
                <h4 className="font-semibold text-gray-800">Informasi Personal</h4>
                <p className="text-sm text-gray-500">7 field tersedia</p>
              </div>
              <span className="cursor-pointer text-sm font-semibold text-blue-600">
                {expandedSections.personalInfo ? "Sembunyikan" : "Tampilkan"}
              </span>
            </button>
            {expandedSections.personalInfo && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: "nama", label: "Nama", value: cvData.Personal_Info.Nama || "-" },
                    { key: "email", label: "Email", value: cvData.Personal_Info.Email || "-" },
                    { key: "hp", label: "No. HP", value: cvData.Personal_Info.HP || "-" },
                    { key: "linkedIn", label: "LinkedIn", value: cvData.Personal_Info.LinkedIn || "-" },
                    { key: "alamat", label: "Alamat", value: cvData.Personal_Info.Alamat || "-" },
                    { key: "portfolio", label: "Portfolio", value: cvData.Personal_Info.Portfolio || "-" },
                    { key: "summary", label: "Summary", value: cvData.Personal_Info.Summary || "-" }
                  ].map((field) => (
                    <label
                      key={field.key}
                      className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                        selectedContent.personalInfo[field.key as keyof typeof selectedContent.personalInfo]
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContent.personalInfo[field.key as keyof typeof selectedContent.personalInfo]}
                        onChange={() => togglePersonalField(field.key as keyof typeof selectedContent.personalInfo)}
                        className="mt-1 h-4 w-4"
                      />
                      <div>
                        <p className="font-semibold text-gray-800">{field.label}</p>
                        <p className="text-sm text-gray-500 break-words">{field.value}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div> */}

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
            items: cvData.Certifications.map(item => `${item.Nama} - ${item.Penerbit} (${item.Tahun})`),
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
          <div key={section.title} className="rounded-xl border bg-white">
            <button
              type="button"
              onClick={() => toggleExpandedSection(section.expandKey)}
              className="w-full flex items-center justify-between px-4 py-4 text-left"
            >
              <div>
                <h4 className="font-semibold text-gray-800">{section.title}</h4>
                <p className="text-sm text-gray-500">{section.items.length} item</p>
              </div>
              <span className="cursor-pointer text-sm font-semibold text-blue-600">
                {expandedSections[section.expandKey] ? "Sembunyikan" : "Tampilkan"}
              </span>
            </button>
            {expandedSections[section.expandKey] && (
              <div className="px-4 pb-4">
                {section.items.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Belum ada data.</p>
                ) : (
                  <div className="space-y-2">
                    {section.items.map((item, index) => (
                      <label
                        key={`${section.title}-${index}`}
                        className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                          section.selected[index]
                            ? "border-blue-300 bg-blue-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={section.selected[index]}
                          onChange={() => toggleArrayItem(section.keyName, index)}
                          className="mt-1 h-4 w-4"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item || "-"}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col gap-4">        
        <button 
            type="button"
            onClick={handleDownload}
            className="cursor-pointer w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
        >
            Download Result (.docx)
        </button>

        <button type="button" onClick={prevStep} className="cursor-pointer mt-4 text-blue-600 font-bold hover:text-blue-800 underline transition">
          Kembali edit data
        </button>
      </div>

      {/* RENDER MODAL DI BAWAH */}
      <CustomModal {...modalProps} />
    </div>
  );
}



