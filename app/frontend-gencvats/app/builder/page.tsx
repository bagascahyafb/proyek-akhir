"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CVDataState, SelectedCVContent } from "@/types";
import Image from "next/image"; 
import { useMemo } from "react";

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

type CountryCode = { label: string; value: string };

const COUNTRY_CODES: CountryCode[] = [
  { label: "Indonesia (+62)", value: "+62" },
  { label: "United States (+1)", value: "+1" },
  { label: "Singapore (+65)", value: "+65" },
  { label: "Malaysia (+60)", value: "+60" },
  { label: "Japan (+81)", value: "+81" },
  { label: "South Korea (+82)", value: "+82" },
  { label: "India (+91)", value: "+91" },
  { label: "Australia (+61)", value: "+61" },
  { label: "United Kingdom (+44)", value: "+44" },
  { label: "Germany (+49)", value: "+49" },
  { label: "Netherlands (+31)", value: "+31" },
  { label: "France (+33)", value: "+33" },
  { label: "Canada (+1)", value: "+1" },
];

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

  const defaultCode = useMemo(() => inferDefaultCode(), []);
  const parsedPhone = useMemo(
    () => parsePhoneValue(cvData.Personal_Info.HP, defaultCode),
    [cvData.Personal_Info.HP, defaultCode],
  );
  const phoneCode = parsedPhone.code;
  const phoneNumber = parsedPhone.local;

  const updateInfo = (field: keyof typeof cvData.Personal_Info, value: string) => {
    setCvData((prev) => ({
      ...prev,
      Personal_Info: { ...prev.Personal_Info, [field]: value },
    }));
  };

  const updatePhone = (
    nextCode: string,
    nextLocal: string
  ) => {
    const cleanLocal =
      nextLocal.replace(/[^\d]/g, "");
  
    const combined =
      `${nextCode} ${cleanLocal}`.trim();
  
    updateInfo("HP", combined);
  };

  const canNavigateToStep = (targetStep: number) => {
    if (targetStep <= currentStep) {
      return true;
    }
  
    const hasName =
      cvData.Personal_Info?.Nama?.trim();
  
    const hasEmail =
      cvData.Personal_Info?.Email?.trim();
  
    const email = cvData.Personal_Info.Email.trim();
    const linkedInRaw = cvData.Personal_Info.LinkedIn.trim();
    const portfolioRaw = cvData.Personal_Info.Portfolio.trim();
  

      if (!cvData.Personal_Info.Nama || !email) {
        return showAlert("Peringatan", "Nama dan Email wajib diisi sebelum melanjutkan!");
      }
  
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return showAlert("Format Email", "Gunakan format email yang benar, contoh: nama@email.com");
      }
  
      if (phoneNumber && (phoneNumber.length < 6 || phoneNumber.length > 15)) {
        return showAlert("Nomor Telepon", "Nomor telepon harus 6-15 digit angka.");
      }
  
      if (linkedInRaw) {
        let linkedInUrl: URL;
        try {
          linkedInUrl = normalizeUrl(linkedInRaw);
        } catch {
          return showAlert("LinkedIn", "Format LinkedIn URL tidak valid.");
        }
  
        if (!linkedInUrl.hostname.toLowerCase().includes("linkedin.com")) {
          return showAlert("LinkedIn", "Gunakan link LinkedIn yang valid, contoh: https://linkedin.com/in/username");
        }
  
        updateInfo("LinkedIn", linkedInUrl.toString());
      }
  
      if (portfolioRaw) {
        let portfolioUrl: URL;
        try {
          portfolioUrl = normalizeUrl(portfolioRaw);
        } catch {
          return showAlert("GitHub/Portofolio", "Format link GitHub/Portofolio tidak valid.");
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
            <ThemeToggle variant="inline" />
          </div>
        </div>
      </header>
  
      <div className="builder-main-layout">
        {/* SIDEBAR */}
        <aside className="builder-sidebar">
          <div>
            <div className="builder-sidebar-header">
              <h2>CV Progress</h2>
              <span className="builder-step-badge">
                Langkah {currentStep} dari 6
              </span>
            </div>
  
            <div className="builder-steps-list">
              {[
                "Personal info",
                "Education",
                "Experience",
                "Certificates",
                "Review",
                "Finish",
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
              Lengkapi data diri Anda untuk membangun profil
              yang kuat di mata HR dan sistem ATS.
            </p>
          </div>
  
          {/* FORM CARD */}
          <section className="builder-form-card">
            {currentStep === 1 && (
              <Step1Personal
                cvData={cvData}
                setCvData={setCvData}
                apiUrl={apiUrl}
                nextStep={nextStep}
              />
            )}
  
            {currentStep === 2 && (
              <Step2Education
                cvData={cvData}
                setCvData={setCvData}
                nextStep={nextStep}
                apiUrl={apiUrl}
                prevStep={prevStep}
              />
            )}
  
            {currentStep === 3 && (
              <Step3Experience
                cvData={cvData}
                setCvData={setCvData}
                nextStep={nextStep}
                apiUrl={apiUrl}
                prevStep={prevStep}
              />
            )}
  
            {currentStep === 4 && (
              <Step4Certificates
                cvData={cvData}
                setCvData={setCvData}
                nextStep={nextStep}
                apiUrl={apiUrl}
                prevStep={prevStep}
              />
            )}
  
            {currentStep === 5 && (
              <Step5Review 
                cvData={cvData} 
                setCvData={setCvData} 
                apiUrl={apiUrl} 
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
                prevStep={prevStep}
              />
            )}
          </section>
        </main>
      </div>
      <CustomModal {...modalProps} />
    </div>
  )};