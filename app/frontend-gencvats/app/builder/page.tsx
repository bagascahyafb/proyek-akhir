"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CVDataState } from "@/types";
import Image from "next/image"; 

// Import Components
import Step1Personal from "@/components/personal";
import Step2Education from "@/components/education";
import Step3Experience from "@/components/experience";
import Step4Certificates from "@/components/certificates";
import Step5Review from "@/components/review";
import ThemeToggle from "@/components/themetoggle";

export default function BuilderPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [cvData, setCvData] = useState<CVDataState>({
    Personal_Info: { Nama: "", Email: "", HP: "", LinkedIn: "", Alamat: "", Portfolio: "", Summary: "" },
    Education: [], Experience: [], Projects: [],
    Skills_Hard: [], Skills_Soft: [],
    Certifications: [], Awards: [], Language: "English"
  });

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-[var(--background)] py-10 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8 sticky top-0 z-20 pt-2">
          <div className="rounded-2xl border border-[color-mix(in_oklab,var(--color-soft)_55%,white)] bg-[color-mix(in_oklab,var(--color-surface)_94%,white)] px-5 py-4 shadow-xl backdrop-blur-md">
            
            {/* LOGO + TITLE */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Link href="/" className="flex items-center gap-2 group">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold group-hover:scale-105 transition">
                    <Image src="/logo.png" alt="Logo GenCVATS" width={60} height={60} />
                  </div>
                </Link>

                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  Langkah {currentStep} dari 5
                </h2>
              </div>
              <ThemeToggle variant="inline"/>
            </div>

            {/* PROGRESS BAR */}
            <div className="w-full bg-[color-mix(in_oklab,var(--color-soft)_45%,white)] rounded-full h-2.5 mt-4">
              <div
                className="bg-[var(--color-primary)] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* STEP CONTENT */}
        {currentStep === 1 && <Step1Personal cvData={cvData} setCvData={setCvData} apiUrl={apiUrl} nextStep={nextStep} />}
        {currentStep === 2 && <Step2Education cvData={cvData} setCvData={setCvData} apiUrl={apiUrl} nextStep={nextStep} prevStep={prevStep} />}
        {currentStep === 3 && <Step3Experience cvData={cvData} setCvData={setCvData} apiUrl={apiUrl} nextStep={nextStep} prevStep={prevStep} />}
        {currentStep === 4 && <Step4Certificates cvData={cvData} setCvData={setCvData} apiUrl={apiUrl} nextStep={nextStep} prevStep={prevStep} />}
        {currentStep === 5 && <Step5Review cvData={cvData} setCvData={setCvData} apiUrl={apiUrl} prevStep={prevStep} />}
      </div>
    </div>
  );
}
