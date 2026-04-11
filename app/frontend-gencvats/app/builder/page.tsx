// app/builder/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CVDataState } from "@/types";

// Import Components
import Step1Personal from "@/components/personal";
import Step2Education from "@/components/education";
import Step3Experience from "@/components/experience";
import Step4Certificates from "@/components/certificates";
import Step5Review from "@/components/review";

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

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL_LM_STUDIO || "http://localhost:8000";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-800 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 sticky top-0 z-20 pt-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-5 py-4 shadow-xl backdrop-blur-md">
            <h2 className="text-xl font-bold text-white">Langkah {currentStep} dari 5</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
            </div>
            <div className="w-full bg-gray-300 rounded-full h-2.5 mt-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              >

              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-left mb-5">
          <Link className="bg-blue-600 hover:bg-blue-700 py-3 px-8 rounded-xl transition shadow-lg font-bold text-white" href="/">
            Home
          </Link>
        </div>
        {currentStep === 1 && <Step1Personal cvData={cvData} setCvData={setCvData} apiUrl={apiUrl} nextStep={nextStep} />}
        {currentStep === 2 && <Step2Education cvData={cvData} setCvData={setCvData} apiUrl={apiUrl} nextStep={nextStep} prevStep={prevStep} />}
        {currentStep === 3 && <Step3Experience cvData={cvData} setCvData={setCvData} apiUrl={apiUrl} nextStep={nextStep} prevStep={prevStep} />}
        {currentStep === 4 && <Step4Certificates cvData={cvData} setCvData={setCvData} apiUrl={apiUrl} nextStep={nextStep} prevStep={prevStep} />}
        {currentStep === 5 && <Step5Review cvData={cvData} setCvData={setCvData} apiUrl={apiUrl} prevStep={prevStep} />}
      </div>
    </div>
  );
}
