import Link from "next/link";
import Image from "next/image";
import { FileAiIcon, FileAttachmentIcon, FileSearchIcon } from "@/components/icons";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[var(--background)] px-4 py-16 text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_60%)]" />

      <div className="relative mx-auto mt-16 max-w-3xl text-center md:mt-0">
        <h1 className="mb-6 flex items-center justify-center gap-4 text-5xl font-extrabold tracking-tight">
          <Image src="/logo.png" alt="Logo GenCVATS" width={60} height={60} />
          GenCVATS
        </h1>
        <p className="mb-10 text-xl font-bold text-[color-mix(in_oklab,var(--foreground)_86%,white)]">
          Buat CV standar ATS profesional dalam hitungan menit.
          Didukung AI untuk ekstraksi data otomatis dan pemolesan kalimat.
        </p>

        <div className="flex justify-center gap-4">
          <Link href="/builder">
            <button className="cursor-pointer rounded-full bg-[var(--color-primary)] px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:scale-105 hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)]">
              Mulai Buat CV
            </button>
          </Link>
        </div>
      </div>

      <div className="relative mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-8 text-center md:grid-cols-3">
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--color-soft)_60%,white)] bg-[color-mix(in_oklab,var(--color-surface)_90%,white)] p-6 shadow-sm">
          <FileSearchIcon className="mx-auto mb-4 h-12 w-12 text-[color-mix(in_oklab,var(--foreground)_62%,white)]" />
          <h3 className="mb-2 text-xl font-bold">Auto Read Document</h3>
          <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_76%,white)]">
            Upload ijazah dan sertifikat, data otomatis terisi tanpa ketik ulang.
          </p>
        </div>
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--color-soft)_60%,white)] bg-[color-mix(in_oklab,var(--color-surface)_90%,white)] p-6 shadow-sm">
          <FileAiIcon className="mx-auto mb-4 h-12 w-12 text-[color-mix(in_oklab,var(--foreground)_62%,white)]" />
          <h3 className="mb-2 text-xl font-bold">AI Enhancement</h3>
          <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_76%,white)]">
            AI akan memoles deskripsi pengalaman menjadi kalimat profesional.
          </p>
        </div>
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--color-soft)_60%,white)] bg-[color-mix(in_oklab,var(--color-surface)_90%,white)] p-6 shadow-sm">
          <FileAttachmentIcon className="mx-auto mb-4 h-12 w-12 text-[color-mix(in_oklab,var(--foreground)_62%,white)]" />
          <h3 className="mb-2 text-xl font-bold">ATS Friendly</h3>
          <p className="text-sm text-[color-mix(in_oklab,var(--foreground)_76%,white)]">
            Format dokumen DOCX bersih yang disukai sistem rekrutmen.
          </p>
        </div>
      </div>
    </div>
  );
}
