import { useMemo } from "react";
import { StepProps } from "@/types";
import { useModal, CustomModal } from "./custommodal";
import { ArrowForwardIcon } from "./icons";

type CountryCode = { label: string; value: string };

const COUNTRY_CODES: CountryCode[] = [
  { label: "Indonesia (+62)", value: "+62" },
  { label: "United States (+1)", value: "+1" },
  { label: "Singapore (+65)", value: "+65" },
  { label: "Malaysia (+60)", value: "+60" },
  { label: "Japan (+81)", value: "+81" },
  { label: "South Korea (+82)", value: "+82" },
  { label: "India (+91)", value: "+91" },
  { label: "Australia (+61)", value: "+61" },
  { label: "United Kingdom (+44)", value: "+44" },
  { label: "Germany (+49)", value: "+49" },
  { label: "Netherlands (+31)", value: "+31" },
  { label: "France (+33)", value: "+33" },
  { label: "Canada (+1)", value: "+1" },
];

const inferDefaultCode = () => {
  if (typeof window === "undefined") return "+62";
  const lang = (navigator.language || "").toLowerCase();
  if (lang.includes("id")) return "+62";
  if (lang.includes("en-us")) return "+1";
  if (lang.includes("en-gb")) return "+44";
  if (lang.includes("ja")) return "+81";
  if (lang.includes("ko")) return "+82";
  return "+62";
};

const parsePhoneValue = (raw: string, fallbackCode: string) => {
  const value = (raw || "").trim();
  const matched = value.match(/^(\+\d{1,4})\s*(.*)$/);
  if (!matched) {
    return { code: fallbackCode, local: value.replace(/[^\d]/g, "") };
  }

  return {
    code: matched[1],
    local: matched[2].replace(/[^\d]/g, ""),
  };
};

const normalizeUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("URL kosong");
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol);
};

export default function Step1Personal({ cvData, setCvData, nextStep }: StepProps) {
  const { modalProps, showAlert } = useModal();

  const defaultCode = useMemo(() => inferDefaultCode(), []);
  const parsedPhone = useMemo(
    () => parsePhoneValue(cvData.Personal_Info.HP, defaultCode),
    [cvData.Personal_Info.HP, defaultCode],
  );
  const phoneCode = parsedPhone.code;
  const phoneNumber = parsedPhone.local;

  const updateInfo = (field: keyof typeof cvData.Personal_Info, value: string) => {
    setCvData((prev) => ({
      ...prev,
      Personal_Info: { ...prev.Personal_Info, [field]: value },
    }));
  };

  const updatePhone = (
    nextCode: string,
    nextLocal: string
  ) => {
    const cleanLocal =
      nextLocal.replace(/[^\d]/g, "");
  
    const combined =
      `${nextCode} ${cleanLocal}`.trim();
  
    updateInfo("HP", combined);
  };

  const handleNext = () => {
    const email = cvData.Personal_Info.Email.trim();
    const linkedInRaw = cvData.Personal_Info.LinkedIn.trim();
    const portfolioRaw = cvData.Personal_Info.Portfolio.trim();

    if (!cvData.Personal_Info.Nama || !email) {
      return showAlert("Peringatan", "Nama dan Email wajib diisi sebelum melanjutkan!");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return showAlert("Format Email", "Gunakan format email yang benar, contoh: nama@email.com");
    }

    if (phoneNumber && (phoneNumber.length < 6 || phoneNumber.length > 15)) {
      return showAlert("Nomor Telepon", "Nomor telepon harus 6-15 digit angka.");
    }

    if (linkedInRaw) {
      let linkedInUrl: URL;
      try {
        linkedInUrl = normalizeUrl(linkedInRaw);
      } catch {
        return showAlert("LinkedIn", "Format LinkedIn URL tidak valid.");
      }

      if (!linkedInUrl.hostname.toLowerCase().includes("linkedin.com")) {
        return showAlert("LinkedIn", "Gunakan link LinkedIn yang valid, contoh: https://linkedin.com/in/username");
      }

      updateInfo("LinkedIn", linkedInUrl.toString());
    }

    if (portfolioRaw) {
      let portfolioUrl: URL;
      try {
        portfolioUrl = normalizeUrl(portfolioRaw);
      } catch {
        return showAlert("GitHub/Portofolio", "Format link GitHub/Portofolio tidak valid.");
      }

      updateInfo("Portfolio", portfolioUrl.toString());
    }

    nextStep?.();
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 mt-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-2">
            Nama Lengkap <span className="text-red-700">*</span>
          </label>
          <input
            className="w-full border border-[color-mix(in_oklab,var(--color-soft)_75%,white)] p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
            placeholder="Contoh: Budi Santoso"
            value={cvData.Personal_Info.Nama || ""}
            onChange={(e) => updateInfo("Nama", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-2">
            Email <span className="text-red-700">*</span>
          </label>
          <input
            type="email"
            className="w-full border border-[color-mix(in_oklab,var(--color-soft)_75%,white)] p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
            placeholder="email@domain.com"
            value={cvData.Personal_Info.Email || ""}
            onChange={(e) => updateInfo("Email", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-2">Nomor HP</label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={phoneCode}
              onChange={(e) => updatePhone(e.target.value, phoneNumber)}
              className="col-span-1 border border-[color-mix(in_oklab,var(--color-soft)_75%,white)] p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-[color-mix(in_oklab,var(--color-surface)_96%,white)]"
            >
              {COUNTRY_CODES.map((country) => (
                <option key={`${country.label}-${country.value}`} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
            <input
              className="col-span-2 border border-[color-mix(in_oklab,var(--color-soft)_75%,white)] p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
              placeholder="81234567890"
              value={phoneNumber}
              inputMode="numeric"
              onChange={(e) => updatePhone(phoneCode, e.target.value)}
            />
          </div>
          <p className="text-xs mt-1 text-[color-mix(in_oklab,var(--foreground)_65%,white)]">Kode negara dipilih otomatis, tapi bisa kamu ganti.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-2">Kota Domisili</label>
          <input
            className="w-full border border-[color-mix(in_oklab,var(--color-soft)_75%,white)] p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
            placeholder="Kota / Kabupaten"
            value={cvData.Personal_Info.Alamat || ""}
            onChange={(e) => updateInfo("Alamat", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <label className="block text-sm font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-2">LinkedIn URL</label>
          <input
            className="w-full border border-[color-mix(in_oklab,var(--color-soft)_75%,white)] p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
            placeholder="https://linkedin.com/in/username"
            value={cvData.Personal_Info.LinkedIn || ""}
            onChange={(e) => updateInfo("LinkedIn", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-[color-mix(in_oklab,var(--foreground)_88%,white)] mb-2">GitHub / Portofolio</label>
          <input
            className="w-full border border-[color-mix(in_oklab,var(--color-soft)_75%,white)] p-3 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
            placeholder="https://github.com/username atau https://portfolio.com"
            value={cvData.Personal_Info.Portfolio || ""}
            onChange={(e) => updateInfo("Portfolio", e.target.value)}
          />
        </div>
      </div>

      <div className="builder-form-actions justify-end mt-8 pt-6">
        <button
          type="button"
          onClick={handleNext}
          className="cursor-pointer px-6 py-2 rounded-lg font-bold text-white bg-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-primary)_88%,black)] transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center gap-2"
        >
          Next
          <ArrowForwardIcon className="h-4 w-4" />
        </button>
      </div>

      <CustomModal {...modalProps} />
    </div>
  );
}
