"use client";

import Link from "next/link";
import ThemeToggle from "@/components/themetoggle";
import Image from "next/image"; 
import { FileAiIcon, FileAttachmentIcon, FileSearchIcon } from "@/components/icons";

export default function LandingPage() {
  const features = [
    {
      title: "Auto Read Document",
      description:
        "Sistem dapat membaca dokumen seperti ijazah dan sertifikat untuk membantu mengisi data CV secara otomatis.",
      icon: <FileSearchIcon className="h-8 w-8" />,
      iconClass: "landing-feature-icon-blue",
    },
    {
      title: "AI Enhancement",
      description:
        "AI membantu menyusun dan memperbaiki deskripsi pengalaman agar terlihat lebih rapi dan profesional.",
      icon: <FileAiIcon className="h-8 w-8" />,
      iconClass: "landing-feature-icon-green",
    },
    {
      title: "ATS Friendly",
      description:
        "CV dibuat dengan format yang lebih mudah dibaca oleh sistem rekrutmen modern (ATS).",
      icon: <FileAttachmentIcon className="h-8 w-8" />,
      iconClass: "landing-feature-icon-slate",
    },
  ];

  return (
    <main className="landing-root">
      <div className="landing-noise" />
      {/* NAVBAR */}
      <header className="landing-navbar">
        <div className="landing-navbar-inner">
          <div className="landing-brand cursor-pointer"
            onClick={() => {
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}>
            <Image src="/logo.png" alt="Logo GenCVATS" width={30} height={30}/>   
          <span>GenCVATS</span>
          </div>

          <nav className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#about">About Us</a>
          </nav>

          <div className="landing-nav-actions">
            <ThemeToggle variant="inline" />
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <span className="landing-chip">
            AI Powered CV Builder
          </span>

          <h1>
            Buat CV Profesional dengan Lebih Mudah
          </h1>

          <p>
            GenCVATS membantu Anda membuat CV ATS-friendly
            secara otomatis menggunakan teknologi AI, sehingga
            proses pembuatan CV menjadi lebih cepat, rapi,
            dan profesional.
          </p>

          <div className="landing-hero-actions">
            <Link
              href="/builder"
              className="landing-primary-button large"
            >
              Mulai Sekarang
            </Link>

            <a
              href="#features"
              className="landing-secondary-button"
            >
              Lihat Fitur
            </a>
          </div>
        </div>

        <div className="landing-hero-preview">
          <div className="landing-preview-card">
            <Image src="/resume.png" alt="resume" className="landing-preview-image" width={250} height={250}/>
          </div>
        </div>
      </section>

      {/* FLOW */}
      <section className="landing-section landing-section-soft">
        <div className="landing-section-heading center">
          <h2>Cara Kerja GenCVATS</h2>

          <p>
            Proses pembuatan CV menjadi lebih praktis dengan
            bantuan AI dan pembacaan dokumen otomatis.
          </p>
        </div>

        <div className="landing-steps-grid">
          <div className="landing-step-card">
            <span>01</span>
            <h3>Upload Dokumen</h3>
            <p>
              Upload ijazah, sertifikat, atau dokumen pendukung lainnya.
            </p>
          </div>

          <div className="landing-step-card">
            <span>02</span>
            <h3>Data Diproses AI</h3>
            <p>
              Sistem membaca dan mengenali informasi penting secara otomatis.
            </p>
          </div>

          <div className="landing-step-card">
            <span>03</span>
            <h3>CV Siap Digunakan</h3>
            <p>
              CV profesional dan ATS-friendly langsung dapat diedit dan diunduh.
            </p>
          </div>
        </div>
      </section>

      {/* PROBLEM STATEMENT */}
      <section className="landing-section">
        <div className="landing-problem-box">
          <h2>Masalah yang Sering Terjadi</h2>

          <p>
            Banyak pencari kerja masih membuat CV secara manual,
            memakan waktu, dan belum sesuai dengan standar sistem
            rekrutmen modern (ATS).
          </p>

          <p>
            GenCVATS hadir untuk membantu proses tersebut menjadi
            lebih cepat, praktis, dan profesional.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="landing-section landing-section-soft"
      >
        <div className="landing-section-heading center">
          <h2>Fitur Utama</h2>

          <p>
            Teknologi yang membantu proses pembuatan CV menjadi
            lebih cepat, rapi, dan efisien.
          </p>
        </div>

        <div className="landing-features-grid">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="landing-feature-card"
            >
              <div
                className={`landing-feature-icon ${feature.iconClass}`}
              >
                {feature.icon}
              </div>

              <h3>{feature.title}</h3>

              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="landing-section">
        <div className="landing-about-grid">
          <div className="landing-about-content">
            <span className="landing-section-label">
              ABOUT THE PROJECT
            </span>

            <h2>
              Membantu Pembuatan CV
              <br />
              Menjadi Lebih Efisien
            </h2>

            <p>
              GenCVATS dirancang untuk membantu pengguna membuat
              CV secara lebih cepat dan praktis tanpa harus
              menyusun semuanya dari awal.
            </p>

            <p>
              Dengan bantuan AI, sistem dapat membaca dokumen,
              mengenali informasi penting, dan membantu menyusun
              isi CV agar lebih rapi serta mudah dibaca oleh
              sistem rekrutmen modern (ATS).
            </p>

            <ul className="landing-about-list">
              <li>Pembuatan CV lebih cepat</li>
              <li>Format lebih rapi dan profesional</li>
              <li>Mendukung sistem ATS modern</li>
              <li>Dapat diedit kembali dengan mudah</li>
            </ul>
          </div>

          <div className="landing-hero-preview">
          <div className="landing-preview-card">
            <Image src="/vision.png" alt="vision" className="landing-preview-image" width={250} height={250}/>
          </div>
        </div>
        </div>
      </section>


      {/* HASIL */}
      <section className="landing-section landing-section-soft">
        <div className="landing-section-heading center">
          <h2>Hasil CV yang Lebih Profesional</h2>

          <p>
            CV dibuat dengan tampilan rapi dan struktur yang
            lebih mudah dibaca oleh recruiter maupun ATS.
          </p>
        </div>

        <div className="flex justify-center">
          <Image
            src="/cv-preview.png"
            alt="CV Preview"
            width={500}
            height={300}
            className="landing-previewcv-image"
          />
        </div>
        <div className="landing-hero-actions flex justify-center">
          <Link
            href="/builder"
            className="landing-primary-button large"
          >
            Mulai Sekarang
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        © 2026 GenCVATS. Precision-engineered for modern
        professionals.
      </footer>
    </main>
  );
}