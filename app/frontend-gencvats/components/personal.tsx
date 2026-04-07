import { StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal";

export default function Step1Personal({ cvData, setCvData, nextStep }: StepProps) {
  
  // PANGGIL HOOK MODAL
  const { modalProps, showAlert} = useModal();

  // Fungsi penahan sebelum pindah step
  const handleNext = () => {
    if (!cvData.Personal_Info.Nama || !cvData.Personal_Info.Email) {
        return showAlert("Peringatan", "Nama dan Email wajib diisi sebelum melanjutkan!");
    }
    nextStep?.();
  };
  // Helper biar kodenya gak panjang ngetik onChange terus
  const updateInfo = (field: keyof typeof cvData.Personal_Info, value: string) => {
    setCvData(prev => ({
      ...prev,
      Personal_Info: { ...prev.Personal_Info, [field]: value }
    }));
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-gray-800 animate-fade-in-up">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 border-b pb-4">👤 1. Informasi Pribadi</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  
    {/* Nama */}
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Nama Lengkap <span className="text-red-500">*</span>
      </label>
      <input 
        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Contoh: Budi Santoso"
        value={cvData.Personal_Info.Nama || ""}
        onChange={(e) => updateInfo("Nama", e.target.value)}
      />
    </div>

    {/* Email */}
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
      <input 
        type="email"
        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="email@domain.com"
        value={cvData.Personal_Info.Email || ""}
        onChange={(e) => updateInfo("Email", e.target.value)}
      />
    </div>

    {/* No HP */}
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">Nomor HP</label>
      <input 
        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="+62 812..."
        value={cvData.Personal_Info.HP || ""}
        onChange={(e) => updateInfo("HP", e.target.value)}
      />
    </div>

    {/* Kota Domisili */}
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">Kota Domisili</label>
      <input 
        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Kota / Kabupaten"
        value={cvData.Personal_Info.Alamat || ""}
        onChange={(e) => updateInfo("Alamat", e.target.value)}
      />
    </div>
  </div>

  {/* SECTION LINK */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
    
    {/* LinkedIn */}
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">LinkedIn URL</label>
      <input 
        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="linkedin.com/in/username"
        value={cvData.Personal_Info.LinkedIn || ""}
        onChange={(e) => updateInfo("LinkedIn", e.target.value)}
      />
    </div>

    {/* Github / Portfolio */}
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">GitHub / Portofolio</label>
      <input 
        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="github.com/username / portfolio link"
        value={cvData.Personal_Info.Portfolio || ""}
        onChange={(e) => updateInfo("Portfolio", e.target.value)}
      />
    </div>
  </div>
      <div className="flex justify-end mt-8 pt-6">
        <button type="button" onClick={handleNext} 
            className="cursor-pointer px-6 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg">
            Next
        </button>
      </div>
      {/* BAGIAN RENDER MODAL YANG BARU */}
      <CustomModal {...modalProps} />
    </div>
  );
}