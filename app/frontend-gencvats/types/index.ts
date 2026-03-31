// types/index.ts
export interface EducationItem { Institusi: string; Jurusan: string; Gelar: string; Tahun_Lulus: string; IPK: string; }
export interface ExperienceItem { Posisi: string; Perusahaan: string; Durasi: string; Deskripsi: string; }
export interface ProjectItem { Nama_Proyek: string; Role: string; Tech_Stack: string; Duration:string ; Deskripsi: string; }
export interface CertificateItem { Nama: string; Penerbit: string; Tahun: string; }
export interface AwardItem { Nama_Award: string; Pemberi: string; Tahun: string; }

export interface CVDataState {
  Personal_Info: { Nama: string; Email: string; HP: string; LinkedIn: string; Alamat: string; Summary: string; };
  Education: EducationItem[];
  Experience: ExperienceItem[];
  Projects: ProjectItem[];
  Skills_Hard: string[];
  Skills_Soft: string[];
  Certifications: CertificateItem[];
  Awards: AwardItem[];
  Language: string;
}

// Tipe Props untuk setiap Component Step
export interface StepProps {
  cvData: CVDataState;
  setCvData: React.Dispatch<React.SetStateAction<CVDataState>>;
  nextStep?: () => void;
  prevStep?: () => void;
}