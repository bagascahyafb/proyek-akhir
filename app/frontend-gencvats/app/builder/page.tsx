"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CVDataState, LLMProvider, SelectedCVContent } from "@/types";
import Image from "next/image"; 

// Import Components
import Step1Personal from "@/components/personal";
import Step2Education from "@/components/education";
import Step3Experience from "@/components/experience";
import Step4Certificates from "@/components/certificates";
import Step5Review from "@/components/review";
import Step6Finalization from "@/components/finalization";
import ThemeToggle from "@/components/themetoggle";
import { useModal, CustomModal } from "@/components/custommodal";

const createSelectedContent = (cvData: CVDataState): SelectedCVContent => ({
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
});

const inferDefaultCode = () => {
  if (typeof window === "undefined") return "+62";
  const lang = (navigator.language || "").toLowerCase();
  if (lang.includes("id")) return "+62";
  if (lang.includes("en-us")) return "+1";
  if (lang.includes("en-gb")) return "+44";
  if (lang.includes("ja")) return "+81";
  if (lang.includes("ko")) return "+82";
  return "+62";
};

const parsePhoneValue = (raw: string, fallbackCode: string) => {
  const value = (raw || "").trim();
  const matched = value.match(/^(\+\d{1,4})\s*(.*)$/);
  if (!matched) {
    return { code: fallbackCode, local: value.replace(/[^\d]/g, "") };
  }

  return {
    code: matched[1],
    local: matched[2].replace(/[^\d]/g, ""),
  };
};

const normalizeUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("URL kosong");
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol);
};

export default function BuilderPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [llmProvider, setLlmProvider] = useState<LLMProvider>("local");
  const [cvData, setCvData] = useState<CVDataState>({
    Personal_Info: { Nama: "", Email: "", HP: "", LinkedIn: "", Alamat: "", Portfolio: "", Summary: "" },
    Education: [], Experience: [], Projects: [],
    Skills_Hard: [], Skills_Soft: [],
    Certifications: [], Awards: [], Language: "English"
  });
  const [selectedContent, setSelectedContent] = useState<SelectedCVContent>(() =>
    createSelectedContent(cvData)
  );

  const { modalProps, showAlert } = useModal();

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  useEffect(() => {
    queueMicrotask(() => {
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
    });
  }, [
    cvData.Education,
    cvData.Experience,
    cvData.Projects,
    cvData.Skills_Hard,
    cvData.Skills_Soft,
    cvData.Certifications,
    cvData.Awards
  ]);

  const defaultCode = useMemo(() => inferDefaultCode(), []);
  const parsedPhone = useMemo(
    () => parsePhoneValue(cvData.Personal_Info.HP, defaultCode),
    [cvData.Personal_Info.HP, defaultCode],
  );
  const phoneNumber = parsedPhone.local;

  const updateInfo = (field: keyof typeof cvData.Personal_Info, value: string) => {
    setCvData((prev) => ({
      ...prev,
      Personal_Info: { ...prev.Personal_Info, [field]: value },
    }));
  };

  const canNavigateToStep = (targetStep: number) => {
    if (targetStep <= currentStep) {
      return true;
    }
  
    const email = cvData.Personal_Info.Email.trim();
    const linkedInRaw = cvData.Personal_Info.LinkedIn.trim();
    const portfolioRaw = cvData.Personal_Info.Portfolio.trim();
  

      if (!cvData.Personal_Info.Nama || !email) {
        return showAlert("Lengkapi data utama", "Isi nama dan email dulu.");
      }
  
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return showAlert("Email belum valid", "Contoh yang benar: nama@email.com");
      }
  
      if (phoneNumber && (phoneNumber.length < 6 || phoneNumber.length > 15)) {
        return showAlert("Nomor HP belum valid", "Gunakan 6-15 digit angka.");
      }
  
      if (linkedInRaw) {
        let linkedInUrl: URL;
        try {
          linkedInUrl = normalizeUrl(linkedInRaw);
        } catch {
          return showAlert("Link LinkedIn belum valid", "Contoh: https://linkedin.com/in/username");
        }
  
        if (!linkedInUrl.hostname.toLowerCase().includes("linkedin.com")) {
          return showAlert("Link LinkedIn belum valid", "Gunakan link profil LinkedIn kamu.");
        }
  
        updateInfo("LinkedIn", linkedInUrl.toString());
      }
  
      if (portfolioRaw) {
        let portfolioUrl: URL;
        try {
          portfolioUrl = normalizeUrl(portfolioRaw);
        } catch {
          return showAlert("Link portofolio belum valid", "Gunakan link GitHub atau portofolio yang bisa dibuka.");
        }
  
        updateInfo("Portfolio", portfolioUrl.toString());
      }
    return true;
  };

  return (
    <div className="builder-layout-root">
      {/* TOP NAVBAR */}
      <header className="builder-topbar">
        <div className="builder-topbar-inner">
          <div className="builder-topbar-left">
            <Link href="/" className="builder-logo-group">
              <Image
                src="/logo.png"
                alt="Logo GenCVATS"
                width={42}
                height={42}
              />  
              <span className="text-[var(--foreground)]">GenCVATS</span>
            </Link>
          </div>
          <div className="builder-topbar-right">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <span>AI</span>
              <select
                value={llmProvider}
                onChange={(event) => setLlmProvider(event.target.value as LLMProvider)}
                className="cursor-pointer rounded-lg border px-3 py-2 bg-[color-mix(in_oklab,var(--color-surface)_96%,white)] text-[var(--foreground)]"
              >
                <option value="local">Local LM Studio</option>
                <option value="groq">Groq API</option>
              </select>
            </label>
            <ThemeToggle variant="inline" />
          </div>
        </div>
      </header>
  
      <div className="builder-main-layout">
        {/* SIDEBAR */}
        <aside className="builder-sidebar">
          <div>
            <div className="builder-sidebar-header">
              <h2>Progres CV</h2>
              <span className="builder-step-badge">
                Langkah {currentStep} dari 6
              </span>
            </div>
  
            <div className="builder-steps-list">
              {[
                "Profil",
                "Pendidikan",
                "Pengalaman",
                "Sertifikat",
                "Review",
                "Selesai",
              ].map((step, index) => {
                const stepNumber = index + 1;
                const isActive = currentStep === stepNumber;
  
                return (
                  <button
                    key={step}
                    onClick={() => {if (canNavigateToStep(stepNumber)) {setCurrentStep(stepNumber);}}}
                    className={`builder-step-item ${
                      isActive ? "active" : ""}`}>
                    <span className="builder-step-number">
                      {stepNumber}
                    </span>
                    <span>{step}</span>
                  </button>
                );
              })}
            </div>
          </div>  
        </aside>
  
        {/* CONTENT */}
        <main className="builder-content-area">
          <div className="builder-content-header">
            <h1>
              {
                [
                  "Informasi Pribadi",
                  "Pendidikan",
                  "Pengalaman",
                  "Sertifikat",
                  "Review CV",
                  "Finalisasi",
                ][currentStep - 1]
              }
            </h1>
  
            <p>
              {[
                "Isi data yang wajib dulu. Detail lain bisa ditambah nanti.",
                "Masukkan riwayat pendidikan dari ijazah atau manual.",
                "Tambahkan pengalaman, proyek, dan skill yang relevan.",
                "Tambahkan sertifikat atau penghargaan yang mendukung CV.",
                "Pilih isi CV dan poles summary bila perlu.",
                "Cek hasil akhir, lalu unduh CV kamu.",
              ][currentStep - 1]}
            </p>
          </div>
  
          {/* FORM CARD */}
          <section className="builder-form-card">
            {currentStep === 1 && (
              <Step1Personal
                cvData={cvData}
                setCvData={setCvData}
                apiUrl={apiUrl}
                llmProvider={llmProvider}
                nextStep={nextStep}
              />
            )}
  
            {currentStep === 2 && (
              <Step2Education
                cvData={cvData}
                setCvData={setCvData}
                nextStep={nextStep}
                apiUrl={apiUrl}
                llmProvider={llmProvider}
                prevStep={prevStep}
              />
            )}
  
            {currentStep === 3 && (
              <Step3Experience
                cvData={cvData}
                setCvData={setCvData}
                nextStep={nextStep}
                apiUrl={apiUrl}
                llmProvider={llmProvider}
                prevStep={prevStep}
              />
            )}
  
            {currentStep === 4 && (
              <Step4Certificates
                cvData={cvData}
                setCvData={setCvData}
                nextStep={nextStep}
                apiUrl={apiUrl}
                llmProvider={llmProvider}
                prevStep={prevStep}
              />
            )}
  
            {currentStep === 5 && (
              <Step5Review 
                cvData={cvData} 
                setCvData={setCvData} 
                apiUrl={apiUrl} 
                llmProvider={llmProvider}
                nextStep={nextStep} 
                prevStep={prevStep} 
                selectedContent={selectedContent} 
                setSelectedContent={setSelectedContent}
              />
            )}
  
            {currentStep === 6 && (
              <Step6Finalization
                cvData={cvData}
                setCvData={setCvData}
                selectedContent={selectedContent}
                apiUrl={apiUrl}
                llmProvider={llmProvider}
                prevStep={prevStep}
              />
            )}
          </section>
        </main>
      </div>
      <CustomModal {...modalProps} />
    </div>
  )};
