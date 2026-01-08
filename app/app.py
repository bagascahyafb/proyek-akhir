import streamlit as st
import pandas as pd
import io
from lib.file_process import process_uploaded_file, validate_name
from lib.ai import run_ai_ocr, enhance_final_cv_llm
from lib.doc_gen import generate_ats_docx
# ==============================================================================
# 1. KONFIGURASI & SESSION STATE
# ==============================================================================
st.set_page_config(page_title="GenCVATS Pro", layout="wide")

# Inisialisasi Session State
default_keys = [
    'cv_nama', 'cv_email', 'cv_hp', 'cv_linkedin', 'cv_alamat', 
    'cv_summary', 'cv_education', 'cv_experience', 'cv_projects', 
    'cv_hard_skills', 'cv_soft_skills', 'cv_certificates', 'cv_awards'
]

for key in default_keys:
    if key not in st.session_state:
        if key in ['cv_education', 'cv_experience', 'cv_projects', 'cv_certificates', 'cv_awards']:
            st.session_state[key] = [] 
        elif key in ['cv_hard_skills', 'cv_soft_skills']:
            st.session_state[key] = [] 
        else:
            st.session_state[key] = "" 

# ==============================================================================
# 2. USER INTERFACE
# ==============================================================================
st.title("🎓 GenCVATS Pro")
st.markdown("ATS-Friendly CV Builder dengan **Input Manual**, **Validasi AI**, dan **Auto-Translation**.")

# --- 1. PERSONAL INFO ---
with st.expander("👤 1. Informasi Pribadi", expanded=True):
    c1, c2 = st.columns(2)
    with c1:
        st.session_state['cv_nama'] = st.text_input("Nama Lengkap", st.session_state['cv_nama'])
        st.session_state['cv_email'] = st.text_input("Email", st.session_state['cv_email'])
        st.session_state['cv_hp'] = st.text_input("No HP", st.session_state['cv_hp'])
    with c2:
        st.session_state['cv_linkedin'] = st.text_input("LinkedIn", st.session_state['cv_linkedin'])
        st.session_state['cv_alamat'] = st.text_area("Alamat", st.session_state['cv_alamat'])

# --- 2. EDUCATION (REQ #1: MANUAL INPUT) ---
with st.expander("🎓 2. Pendidikan (Upload / Manual)", expanded=False):
    tab_up_edu, tab_man_edu = st.tabs(["📂 Upload Ijazah", "✍️ Input Manual"])
    
    # Tab Upload
    with tab_up_edu:
        f_ijazah = st.file_uploader("Upload Ijazah", type=["pdf","jpg"], key="up_ijazah")
        if f_ijazah and st.button("Proses Ijazah"):
            img = process_uploaded_file(f_ijazah)
            if img:
                data = run_ai_ocr(img, "ijazah")
                if data:
                    valid, msg = validate_name(st.session_state['cv_nama'], data.get('Nama_Lengkap'))
                    if valid:
                        st.session_state['cv_education'].append({
                            "Institusi": data.get("Universitas"), "Jurusan": data.get("Jurusan"),
                            "Gelar": data.get("Gelar"), "Tahun_Lulus": data.get("Tahun_Lulus"), "IPK": data.get("IPK")
                        })
                        st.success("Data Ijazah Masuk!")
                    else:
                        st.error(f"Validasi Gagal: {msg}")

    # Tab Manual (Req #1)
    with tab_man_edu:
        with st.form("form_manual_edu"):
            c_uni, c_jur = st.columns(2)
            uni = c_uni.text_input("Nama Institusi / Universitas")
            jur = c_jur.text_input("Jurusan / Prodi")
            c_gel, c_thn, c_ipk = st.columns(3)
            gel = c_gel.text_input("Gelar (cth: S.Kom)")
            thn = c_thn.text_input("Tahun Lulus")
            ipk = c_ipk.text_input("IPK")
            
            if st.form_submit_button("➕ Tambah Pendidikan"):
                st.session_state['cv_education'].append({
                    "Institusi": uni, "Jurusan": jur, "Gelar": gel, "Tahun_Lulus": thn, "IPK": ipk
                })
                st.rerun()

    if st.session_state['cv_education']:
        st.dataframe(pd.DataFrame(st.session_state['cv_education']))

# --- 3. CERTIFICATES & SKILLS (REQ #1 & #2) ---
with st.expander("📜 3. Sertifikat & Skill (Hard/Soft Split)", expanded=False):
    tab_up_cert, tab_man_cert = st.tabs(["📂 Upload Sertifikat", "✍️ Input Manual"])
    
    # Tab Upload
    with tab_up_cert:
        f_sertif = st.file_uploader("Upload Sertifikat", type=["pdf","jpg"], accept_multiple_files=True, key="up_cert")
        if f_sertif and st.button("Proses Batch"):
            bar = st.progress(0)
            for i, f in enumerate(f_sertif):
                img = process_uploaded_file(f)
                if img:
                    data = run_ai_ocr(img, "sertifikat")
                    if data:
                        valid, msg = validate_name(st.session_state['cv_nama'], data.get('Nama_Peserta'))
                        if valid:
                            # 1. Masukkan List Fisik Sertifikat
                            st.session_state['cv_certificates'].append({
                                "Nama": data.get("Judul_Sertifikat"), "Penerbit": data.get("Lembaga_Penerbit"), "Tahun": data.get("Tahun_Sertifikat")
                            })
                            
                            # 2. Cek Kategori Penghargaan
                            if "penghargaan" in data.get("Kategori", "").lower():
                                st.session_state['cv_awards'].append({
                                    "Nama_Award": data.get("Judul_Sertifikat"), "Pemberi": data.get("Lembaga_Penerbit"), "Tahun": data.get("Tahun_Sertifikat")
                                })
                            
                            # 3. Pisahkan Skill Hard vs Soft (Req #2)
                            raw_skill = data.get("Skill", "")
                            tipe = data.get("Tipe_Skill", "Hard Skill")
                            if raw_skill and raw_skill not in ["Tidak Ditemukan", "-"]:
                                skills = [s.strip() for s in raw_skill.split(',')]
                                if "Soft" in tipe:
                                    st.session_state['cv_soft_skills'].extend(skills)
                                else:
                                    st.session_state['cv_hard_skills'].extend(skills)
                bar.progress((i+1)/len(f_sertif))
            st.success("Selesai!")

    # Tab Manual (Req #1 & #2)
    with tab_man_cert:
        with st.form("form_manual_cert"):
            tipe_input = st.selectbox("Tipe Input", ["Sertifikat Keahlian", "Penghargaan/Lomba", "Skill Saja (Tanpa Sertifikat)"])
            judul = st.text_input("Nama Sertifikat / Penghargaan / Skill")
            penerbit = st.text_input("Penerbit / Penyelenggara")
            tahun = st.text_input("Tahun")
            
            # Opsi Tambahan jika Sertifikat Keahlian / Skill Saja
            jenis_skill = "None"
            if tipe_input != "Penghargaan/Lomba":
                jenis_skill = st.radio("Kategori Skill?", ["Hard Skill", "Soft Skill"], horizontal=True)
            
            if st.form_submit_button("➕ Tambah"):
                if tipe_input == "Penghargaan/Lomba":
                    st.session_state['cv_awards'].append({"Nama_Award": judul, "Pemberi": penerbit, "Tahun": tahun})
                elif tipe_input == "Sertifikat Keahlian":
                    st.session_state['cv_certificates'].append({"Nama": judul, "Penerbit": penerbit, "Tahun": tahun})
                    if jenis_skill == "Hard Skill": st.session_state['cv_hard_skills'].append(judul)
                    else: st.session_state['cv_soft_skills'].append(judul)
                else: # Skill Saja
                    if jenis_skill == "Hard Skill": st.session_state['cv_hard_skills'].append(judul)
                    else: st.session_state['cv_soft_skills'].append(judul)
                st.rerun()

    # REVIEW SKILLS (REQ #2)
    st.divider()
    c_hard, c_soft = st.columns(2)
    with c_hard:
        st.subheader("🛠️ Hard Skills")
        hs_str = st.text_area("Edit Hard Skills (koma)", ", ".join(list(set(st.session_state['cv_hard_skills']))))
        st.session_state['cv_hard_skills'] = [s.strip() for s in hs_str.split(',') if s.strip()]
    with c_soft:
        st.subheader("🤝 Soft Skills")
        ss_str = st.text_area("Edit Soft Skills (koma)", ", ".join(list(set(st.session_state['cv_soft_skills']))))
        st.session_state['cv_soft_skills'] = [s.strip() for s in ss_str.split(',') if s.strip()]

# --- 4. EXPERIENCE & PROJECTS (Standard) ---
with st.expander("💼 4. Pengalaman & Proyek", expanded=False):
    c1, c2 = st.columns(2)
    with c1:
        with st.form("exp_form"):
            st.markdown("**Tambah Pengalaman Kerja**")
            pos = st.text_input("Posisi")
            comp = st.text_input("Perusahaan")
            dur = st.text_input("Durasi")
            desc = st.text_area("Deskripsi Singkat")
            if st.form_submit_button("Simpan"):
                st.session_state['cv_experience'].append({"Posisi": pos, "Perusahaan": comp, "Durasi": dur, "Deskripsi": desc})
                st.rerun()
    with c2:
        with st.form("proj_form"):
            st.markdown("**Tambah Proyek**")
            name = st.text_input("Nama Proyek")
            role = st.text_input("Role")
            stack = st.text_input("Tech Stack")
            desc_p = st.text_area("Deskripsi")
            if st.form_submit_button("Simpan"):
                st.session_state['cv_projects'].append({"Nama_Proyek": name, "Role": role, "Tech_Stack": stack, "Deskripsi": desc_p})
                st.rerun()

# --- 5. FINAL ENHANCE & EXPORT (REQ #3) ---
st.divider()
st.header("✨ 5. Final Polish & Export")

lang_choice = st.selectbox("Pilih Bahasa CV Akhir:", ["English", "Indonesia"])

# Kumpulkan Data Mentah
raw_cv_data = {
    "Personal_Info": {
        "Nama": st.session_state['cv_nama'], "Email": st.session_state['cv_email'],
        "HP": st.session_state['cv_hp'], "LinkedIn": st.session_state['cv_linkedin'],
        "Alamat": st.session_state['cv_alamat'], "Summary": st.session_state['cv_summary']
    },
    "Education": st.session_state['cv_education'],
    "Experience": st.session_state['cv_experience'],
    "Projects": st.session_state['cv_projects'],
    "Skills_Hard": st.session_state['cv_hard_skills'],
    "Skills_Soft": st.session_state['cv_soft_skills'],
    "Certifications": st.session_state['cv_certificates'],
    "Awards": st.session_state['cv_awards']
}

# Tombol Enhance
if st.button(f"🤖 Enhance CV Content with AI ({lang_choice})"):
    with st.spinner("AI sedang memoles CV Anda agar ATS-Friendly..."):
        # Panggil LLM buat rewrite
        polished_data = enhance_final_cv_llm(raw_cv_data, lang_choice)
        
        # Simpan hasil polish ke session state sementara (atau langsung generate)
        st.session_state['final_polished_data'] = polished_data
        st.success("CV Berhasil Dipoles! Silakan download di bawah.")
        st.json(polished_data, expanded=False)

# Tombol Download (Menggunakan Data Polished jika ada, jika tidak pakai Raw)
final_data = st.session_state.get('final_polished_data', raw_cv_data)

doc = generate_ats_docx(final_data, lang_choice)
bio = io.BytesIO()
doc.save(bio)

st.download_button(
    label=f"📥 Download {lang_choice} CV (.docx)",
    data=bio.getvalue(),
    file_name=f"CV_{st.session_state['cv_nama'].replace(' ', '_')}_{lang_choice}.docx",
    mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)