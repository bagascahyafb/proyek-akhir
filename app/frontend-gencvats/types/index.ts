// types/index.ts
export interface UploadedDocument {
  fileName: string;
  fileUrl: string;
  contentType: string;
  size: number;
}

export interface EducationItem { Institusi: string; Jurusan: string; Gelar: string; Tahun_Lulus: string; IPK: string; Matkul:string; keterangan: string; Document?: UploadedDocument; }
export interface ExperienceItem { Posisi: string; Perusahaan: string; Durasi: string; Deskripsi: string; Tipe: string; Jenis: string; }
export interface ProjectItem { Nama_Proyek: string; Role: string; Tech_Stack: string; Duration:string ; link:string ; Deskripsi: string; }
export interface CertificateItem { Nama: string; Penerbit: string; Tahun: string | number; Masa_Berlaku?: string | number; Document?: UploadedDocument; }
export interface AwardItem { Nama_Award: string; Judul_Kompetisi?: string; Pemberi: string; Tahun: string; Document?: UploadedDocument; }

export interface CVDataState {
  Personal_Info: { Nama: string; Email: string; HP: string; LinkedIn: string; Alamat: string; Summary: string; Portfolio: string; };
  Education: EducationItem[];
  Experience: ExperienceItem[];
  Projects: ProjectItem[];
  Skills_Hard: string[];
  Skills_Soft: string[];
  Certifications: CertificateItem[];
  Awards: AwardItem[];
  Language: string;
}

export interface SelectedCVContent {
  personalInfo: {
    nama: boolean;
    email: boolean;
    hp: boolean;
    linkedIn: boolean;
    alamat: boolean;
    portfolio: boolean;
    summary: boolean;
  };
  education: boolean[];
  experience: boolean[];
  projects: boolean[];
  hardSkills: boolean[];
  softSkills: boolean[];
  certifications: boolean[];
  awards: boolean[];
}

// Tipe Props untuk setiap Component Step
export interface StepProps {
  cvData: CVDataState;
  setCvData: React.Dispatch<React.SetStateAction<CVDataState>>;
  apiUrl: string;
  nextStep?: () => void;
  prevStep?: () => void;
}
