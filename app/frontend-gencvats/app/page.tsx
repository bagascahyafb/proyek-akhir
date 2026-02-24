// app/page.tsx
import Link from "next/link";
import Image from "next/image"; 

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-800 flex flex-col items-center justify-center text-white px-4">
      <div className="mt-16 md:mt-0 max-w-3xl text-center">
      <h1 className="text-5xl font-extrabold mb-6 tracking-tight flex items-center justify-center gap-4">
        <Image src="/logo.png" alt="Logo GenCVATS" width={60} height={60} />
        GenCVATS
      </h1>
        <p className="text-xl mb-10 text-gray-200">
          Buat CV standar ATS profesional dalam hitungan menit. 
          Didukung AI untuk ekstraksi data otomatis dan pemolesan kalimat.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link href="/builder">
            <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-full shadow-lg transform transition hover:scale-105 text-lg cursor-pointer">
              🚀 Mulai Buat CV
            </button>
          </Link>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-5xl">
        <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-xl font-bold mb-2">Auto Read Document</h3>
          <p className="text-sm opacity-80">Upload Ijazah & Sertifikat, data otomatis terisi tanpa ketik ulang.</p>
        </div>
        <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-xl font-bold mb-2">AI Enhancement</h3>
          <p className="text-sm opacity-80">AI akan memoles deskripsi pengalamanmu menjadi kalimat profesional.</p>
        </div>
        <div className="p-6 bg-white/10 rounded-xl backdrop-blur-sm">
          <div className="text-4xl mb-4">✅</div>
          <h3 className="text-xl font-bold mb-2">ATS Friendly</h3>
          <p className="text-sm opacity-80">Format dokumen .docx bersih yang disukai sistem rekrutmen.</p>
        </div>
      </div>
    </div>
  );
}