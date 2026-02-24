import { StepProps } from "@/types";

export default function Step1Personal({ cvData, setCvData, nextStep }: StepProps) {
  
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
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap</label>
          <input 
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Contoh: Budi Santoso"
            value={cvData.Personal_Info.Nama || ""}
            onChange={(e) => updateInfo("Nama", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
          <input 
            type="email"
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="email@domain.com"
            value={cvData.Personal_Info.Email || ""}
            onChange={(e) => updateInfo("Email", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Nomor HP</label>
          <input 
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="+62 812..."
            value={cvData.Personal_Info.HP || ""}
            onChange={(e) => updateInfo("HP", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">LinkedIn URL</label>
          <input 
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="linkedin.com/in/username"
            value={cvData.Personal_Info.LinkedIn || ""}
            onChange={(e) => updateInfo("LinkedIn", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">Alamat Domisili</label>
        <textarea 
          className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24"
          placeholder="Kota, Provinsi"
          value={cvData.Personal_Info.Alamat || ""}
          onChange={(e) => updateInfo("Alamat", e.target.value)}
        />
      </div>

      <div className="flex justify-end mt-8 pt-6">
        <button type="button" onClick={nextStep} 
            className="cursor-pointer px-6 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg">
            Next
        </button>
      </div>
    </div>
  );
}