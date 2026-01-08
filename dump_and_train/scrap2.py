import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def get_full_h5_text(element):
    """
    Fungsi helper khusus untuk ambil teks dari tag <h5>.
    """
    if element:
        return element.get_text(strip=True)
    return None

# --- KONFIGURASI ---
# Ini daftar slug negara yang mau lo scrape
COUNTRY_SLUGS = [
    "india-114",
    "united-states-of-america-the-1",
    "turkiye-227",
    "italy-8",
    "united-kingdom-of-great-britain-and-northern-ireland-the-17",
    "mexico-152",
    "korea-the-republic-of-127",
    "brazil-51",
    "indonesia-115",
    "egypt-81"
]
# -------------------

base_url = "https://www.iafcertsearch.org/search/certification-bodies/{}?limit=200"
all_data = []

# --- SETUP SELENIUM ---
print("Setup Selenium WebDriver...")
chrome_options = webdriver.ChromeOptions()
chrome_options.add_argument("--log-level=3")
chrome_options.add_argument("--headless") 
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--window-size=1920,1080")

try:
    driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=chrome_options)
    print("WebDriver berhasil di-setup.")
except Exception as e:
    print(f"Error setup WebDriver: {e}")
    print("Pastikan Google Chrome udah ke-install di komputer lo.")
    exit()
# -----------------------


print(f"Mulai scraping {len(COUNTRY_SLUGS)} slug negara...")

# Loop sebanyak slug negara yang ada di list
for country_slug in COUNTRY_SLUGS:
    url = base_url.format(country_slug) # <- Ini {country_slug} diganti
    print(f"\n---  Scraping Country Slug: {country_slug} ---")
    print(f"URL: {url}")

    try:
        driver.get(url)

        # Nunggu MAX 20 detik sampai elemen kartunya muncul
        print("Menunggu data (JavaScript) selesai loading...")
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CLASS_NAME, "mb-4.flex-fill.col-sm-12.col-lg-6"))
        )
        print("Data berhasil di-load.")

        page_source = driver.page_source

    except Exception as e:
        print(f"Gagal mengambil/menunggu data untuk slug {country_slug}: {e}")
        continue 

    soup = BeautifulSoup(page_source, 'lxml') 

    cards = soup.find_all('div', class_='mb-4 flex-fill col-sm-12 col-lg-6')

    if not cards:
        print(f"Tidak menemukan kartu untuk slug {country_slug}. Lanjut...")
        continue 

    # Loop tiap kartu di halaman ini
    for card in cards:
        try:
            # 1. Ambil Negara
            country_elem = card.find('p', class_='text-muted mb-0')
            country = country_elem.get_text(strip=True) if country_elem else None

            # 2. Ambil Nama Lembaga
            name_elem = card.find('h5')
            name = get_full_h5_text(name_elem) 

            # 3. Ambil Badan Akreditasi
            ab_elems = card.find_all('span', class_='styles_ab-badge--text__2Vk_K')
            ab_list = [elem.get_text(strip=True) for elem in ab_elems]
            accreditation_bodies = ", ".join(ab_list)

            # Masukin data ke list
            data_sertifikasi = {
                "Negara": country,
                "Nama Lembaga": name,
                "Badan Akreditasi": accreditation_bodies
            }
            all_data.append(data_sertifikasi)

        except Exception as e:
            print(f"Error pas parsing card: {e}")
            continue

# Tutup browser Selenium-nya
driver.quit()
print("\n--- Selesai Scrapping (Browser ditutup) ---")

# Convert list hasil scraping ke DataFrame Pandas
if all_data:
    df = pd.DataFrame(all_data)

    print(f"Total data terkumpul: {len(df)}")
    print("\nContoh 5 data pertama:")
    print(df.head())
    
    # Simpen ke file
    nama_file_csv = "hasil_scraping_sertifikasi_internasional_per_negara.csv"
    nama_file_excel = "hasil_scraping_sertifikasi_internasional_per_negara.xlsx"
    
    try:
        df.to_csv(nama_file_csv, index=False, encoding='utf-8-sig')
        df.to_excel(nama_file_excel, index=False)
        print(f"\nData berhasil disimpan ke {nama_file_csv} dan {nama_file_excel}")
    except Exception as e:
        print(f"Gagal nyimpen file: {e}")

else:
    print("Tidak ada data yang berhasil di-scrape.")