export const basePayload = {
  Personal_Info: {
    Nama: "Bagas Cahya",
    Email: "bagas@example.com",
    HP: "081234567890",
    LinkedIn: "linkedin.com/in/bagascahya",
    Alamat: "Bandung, Indonesia",
    Portfolio: "bagascahya.dev",
    Summary:
      "Data analyst with experience in dashboarding, machine learning, and process automation. Focused on building measurable business impact through clean analysis and clear communication.",
  },
  Education: [
    {
      Institusi: "Universitas Indonesia",
      Jurusan: "Teknik Informatika",
      Gelar: "S.Kom",
      Tahun_Lulus: "2024",
      IPK: "3.87",
      Matkul: "Machine Learning, Data Mining, NLP",
    },
  ],
  Experience: [
    {
      Posisi: "Data Analyst Intern",
      Perusahaan: "PT Maju Bersama",
      Durasi: "Jan 2024 - Dec 2024",
      Tipe: "Internship",
      Deskripsi:
        "- Built weekly dashboards for management\n- Automated reporting workflows with Python\n- Cleaned and analyzed sales and customer datasets",
    },
  ],
  Projects: [
    {
      Nama_Proyek: "Customer Churn Prediction",
      Role: "Machine Learning Engineer",
      Tech_Stack: "Python, Pandas, Scikit-learn",
      Duration: "2024",
      Deskripsi:
        "- Built classification model for churn prediction\n- Improved recall on high-risk customers\n- Presented model output through simple dashboards",
    },
  ],
  Skills_Hard: ["Python", "SQL", "Machine Learning", "Dashboarding"],
  Skills_Soft: ["Communication", "Problem Solving", "Teamwork"],
  Certifications: [
    {
      Nama: "Google Data Analytics",
      Penerbit: "Google",
      Tahun: "2024",
    },
  ],
  Awards: [
    {
      Nama_Award: "Best Final Project",
      Pemberi: "Faculty of Computer Science",
      Tahun: "2024",
    },
  ],
  Language: "English",
};

export function buildPayload(overrides = {}) {
  return {
    ...basePayload,
    ...overrides,
    Personal_Info: {
      ...basePayload.Personal_Info,
      ...overrides.Personal_Info,
    },
  };
}
