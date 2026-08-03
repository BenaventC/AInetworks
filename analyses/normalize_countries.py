import sqlite3
from datetime import datetime
import shutil

DB = "database.db"
BACKUP = f"database.backup.country-normalize.{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"

mapping = {
    "United States": "États-Unis",
    "United Kingdom": "Royaume-Uni",
    "China": "Chine",
    "Germany": "Allemagne",
    "Sweden": "Suède",
    "South Korea": "Corée du Sud",
    "Saudi Arabia": "Arabie saoudite",
    "United Arab Emirates": "Émirats arabes unis",
    "Italy": "Italie",
    "Portugal": "Portugal",
    "Norway": "Norvège",
    "India": "Inde",
    "Israel": "Israël",
    "Japan": "Japon",
    "Ukraine": "Ukraine",
    "Hong Kong": "Hong Kong",
    "Canada": "Canada",
    "France": "France",
    "Suède": "Suède",
    "Suisse": "Suisse",
    "Pays-Bas": "Pays-Bas",
    "Allemagne": "Allemagne",
    "Chine": "Chine",
    "Royaume-Uni": "Royaume-Uni",
    "États-Unis": "États-Unis",
}

shutil.copyfile(DB, BACKUP)
print(f"Backup created: {BACKUP}")

conn = sqlite3.connect(DB)
cur = conn.cursor()

# Normalize whitespace-only to NULL
cur.execute("UPDATE enterprises SET country = NULL WHERE TRIM(IFNULL(country, '')) = ''")

updated = 0
for src, dst in mapping.items():
    cur.execute("UPDATE enterprises SET country = ? WHERE country = ?", (dst, src))
    updated += cur.rowcount

conn.commit()

cur.execute("SELECT country, COUNT(*) FROM enterprises GROUP BY country ORDER BY COUNT(*) DESC")
rows = cur.fetchall()

print(f"Updated rows: {updated}")
print("Countries after normalization:")
for country, count in rows:
    print(f"{count:3d} | {country}")

conn.close()
