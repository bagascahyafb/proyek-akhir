import requests
from bs4 import BeautifulSoup
import pandas as pd
import time

def get_text_safe(element):
    """Fungsi helper buat ambil teks, kalo elemen ga ketemu, balikin None"""
    if element:
        return element.get_text(strip=True)
    return None

# --- KONFIGURASI ---
# Ganti angka 4 ini sesuai kebutuhan lo (range(1, 4) berarti scrape halaman 1, 2, 3)
JUMLAH_HALAMAN_MAX = 150
# -------------------

base_url = "https://bnsp.go.id/lsp?hal={}&sSearch=&sSub=&sProp="
all_lsp_data = []

# Kita pake headers biar dikira browser, biar lebih aman
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

print(f"Mulai scraping {JUMLAH_HALAMAN_MAX - 1} halaman...")

# Loop sebanyak halaman yang dimau
for page_num in range(1, JUMLAH_HALAMAN_MAX):
    url = base_url.format(page_num)
    print(f"\n---  scraping Halaman: {page_num} ---")
    print(f"URL: {url}")

    try:
        response = requests.get(url, headers=headers, timeout=10)
        # Kalo gagal (misal 404), stop di halaman itu
        response.raise_for_status() 

    except requests.exceptions.RequestException as e:
        print(f"Gagal mengambil data halaman {page_num}: {e}")
        continue # Lanjut ke halaman berikutnya kalo ada error

    soup = BeautifulSoup(response.text, 'html.parser')

    # Cari container utama yang nampung semua kartu LSP [sumber: 1]
    lsp_container = soup.find('div', id='card-lsp')
    if not lsp_container:
        print(f"Tidak menemukan container 'card-lsp' di halaman {page_num}. Mungkin halaman habis.")
        break

    # Cari semua kartu LSP. Strukturnya: <div class="col-xxl-4..."> [sumber: 2, 62, 122, dll.]
    lsp_items = lsp_container.find_all('div', class_='col-xxl-4')

    if not lsp_items:
        print(f"Tidak menemukan item LSP di halaman {page_num}. Loop berhenti.")
        break # Stop loop kalo udah ngelewatin halaman terakhir

    # Loop tiap kartu di halaman ini
    for item in lsp_items:
        # Cari <div class="card..."> di dalam tiap item [sumber: 4, 64, 124, dll.]
        card = item.find('div', class_='card')
        if not card:
            continue

        try:
            # 1. Ambil Nama LSP
            # Target: <h4 class="trending__title ..."> <a ...>Nama LSP</a> </h4> [sumber: 10, 11]
            nama_lsp_elem = card.select_one('h4.trending__title a')
            nama_lsp = get_text_safe(nama_lsp_elem)

            # Kalo ga ada nama, anggap ini bukan kartu LSP (skip aja)
            if not nama_lsp:
                continue

            # 2. Ambil No. SK Lisensi
            # Target: <table> <tr> (baris 1) <td> (sel 3) [sumber: 15-19]
            sk_elem = card.select_one('table.mb-1 tr:nth-child(1) td:nth-child(3)')
            no_sk = get_text_safe(sk_elem)

            # 3. Ambil No. Lisensi
            # Target: <table> <tr> (baris 2) <td> (sel 3) [sumber: 20-24]
            lisensi_elem = card.select_one('table.mb-1 tr:nth-child(2) td:nth-child(3)')
            no_lisensi = get_text_safe(lisensi_elem)

            # 4. Ambil Status Lisensi
            # Target: <table> <tr> (baris 3) ... <span class="badge ...">Status</span> [sumber: 25-34, 149-153]
            status_elem = card.select_one('table.mb-1 tr:nth-child(3) span.badge')
            status = get_text_safe(status_elem)

            # Masukin data ke list
            data_lsp = {
                "Nama LSP": nama_lsp,
                "No. SK Lisensi": no_sk,
                "No. Lisensi": no_lisensi,
                "Status Lisensi": status,
                "Sumber Halaman": page_num
            }
            all_lsp_data.append(data_lsp)

        except Exception as e:
            print(f"Error pas parsing card: {e}")
            continue
    
    # Kasih jeda 1 detik antar halaman biar sopan
    time.sleep(1)

print("\n--- Selesai Scrapping ---")

# Convert list hasil scraping ke DataFrame Pandas
if all_lsp_data:
    df = pd.DataFrame(all_lsp_data)

    # Tampilkan hasil
    print(f"Total data terkumpul: {len(df)}")
    print("\nContoh 5 data pertama:")
    print(df.head())
    
    print("\nContoh 5 data terakhir:")
    print(df.tail())

    # Simpen ke file
    nama_file_csv = "hasil_scraping_lsp_bnsp.csv"
    nama_file_excel = "hasil_scraping_lsp_bnsp.xlsx"
    
    try:
        df.to_csv(nama_file_csv, index=False, encoding='utf-8-sig')
        df.to_excel(nama_file_excel, index=False)
        print(f"\nData berhasil disimpan ke {nama_file_csv} dan {nama_file_excel}")
    except Exception as e:
        print(f"Gagal nyimpen file: {e}")

else:
    print("Tidak ada data yang berhasil di-scrape.")