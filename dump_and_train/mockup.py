import streamlit as st

st.set_page_config(page_title="Automatic CV Generator", layout="wide",)

st.title("📄 Automatic CV Generator menggunakan LLM")
st.markdown("**Buat CV kamu secara otomatis dengan teknologi Language Model!**")

st.header("1. Data Diri")
with st.form("form_data_diri"):
    nama = st.text_input("Nama Lengkap")
    email = st.text_input("Email")
    no_hp = st.text_input("Nomor HP")
    submit_data_diri = st.form_submit_button("Simpan Data Diri")

st.header("2. Dokumen Pendukung")

with st.expander("🎓 Ijazah"):
    nama_univ= st.text_input("Nama Universitas")
    jurusan = st.text_input("Nama Jurusan")
    tahun_lulus = st.text_input("Tahun Kelulusan")
    st.file_uploader("Unggah Ijazah (PDF, PNG, JPG)", type=["pdf", "png", "jpg"])
    st.button("➕ Tambah Ijazah")

with st.expander("🧾 Transkrip Nilai"):
    nilai = st.text_input("Nilai IPK")
    st.file_uploader("Unggah Transkrip (PDF, PNG, JPG)", type=["pdf", "png", "jpg"])
    st.button("➕ Tambah Transkrip")

with st.expander("📎 Sertifikat Keahlian"):
    jenis_keahlian = st.text_input("Nama Sertifikat Keahlian")
    tahun = st.text_input("Tanggal Sertifikat")
    penerbit = st.text_input("Penerbit Sertifikat")
    st.file_uploader("Unggah Sertifikat (PDF, PNG, JPG)", type=["pdf", "png", "jpg"])
    st.button("➕ Tambah Sertifikat")

st.header("3. Keahlian")

with st.expander("💡 Soft Skills"):
    st.text_input("Contoh: Komunikasi, Kerja Tim, Problem Solving")
    st.button("➕ Tambah Soft Skill")

with st.expander("🛠️ Hard Skills"):
    st.text_input("Contoh: Python, SQL, Public Speaking")
    st.button("➕ Tambah Hard Skill")

st.header("4. Pengalaman Kerja")

with st.expander("💼 Pengalaman Kerja"):
    posisi = st.text_input("Posisi/Jabatan")
    perusahaan = st.text_input("Nama Perusahaan")
    tahun_mulai = st.text_input("Tahun Mulai")
    tahun_selesai = st.text_input("Tahun Selesai")
    deskripsi = st.text_area("Deskripsi Pekerjaan")
    st.file_uploader("Unggah Sertifikat Kerja atau Magang(PDF, PNG, JPG)", type=["pdf", "png", "jpg"])
    st.button("➕ Tambah Pengalaman Kerja")

st.header("5. Hasil CV")
st.markdown("Setelah semua data terisi, kamu akan melihat preview CV di sini.")

st.text_area("🔧 Preview CV (Bisa diedit manual di sini)", height=300)

col1, col2 = st.columns(2)
with col1:
    st.button("⬇️ Download sebagai PDF")
with col2:
    st.button("⬇️ Download sebagai Docs")
