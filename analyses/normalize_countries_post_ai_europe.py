import sqlite3
import shutil
from datetime import datetime

DB = "database.db"
BACKUP = f"database.backup.country-normalize-ai-europe.{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"

MAPPING = {
    "United States": "États-Unis",
    "USA": "États-Unis",
    "U.S.A.": "États-Unis",
    "United Kingdom": "Royaume-Uni",
    "UK": "Royaume-Uni",
    "U.K.": "Royaume-Uni",
    "Germany": "Allemagne",
    "Netherlands": "Pays-Bas",
    "The Netherlands": "Pays-Bas",
    "Sweden": "Suède",
    "Denmark": "Danemark",
    "Norway": "Norvège",
    "Finland": "Finlande",
    "Iceland": "Islande",
    "France": "France",
    "Belgium": "Belgique",
    "Switzerland": "Suisse",
    "Austria": "Autriche",
    "Italy": "Italie",
    "Spain": "Espagne",
    "Portugal": "Portugal",
    "Ireland": "Irlande",
    "Poland": "Pologne",
    "Czech Republic": "République tchèque",
    "Czechia": "République tchèque",
    "Romania": "Roumanie",
    "Hungary": "Hongrie",
    "Greece": "Grèce",
    "Slovakia": "Slovaquie",
    "Slovenia": "Slovénie",
    "Croatia": "Croatie",
    "Bulgaria": "Bulgarie",
    "Estonia": "Estonie",
    "Latvia": "Lettonie",
    "Lithuania": "Lituanie",
    "Luxembourg": "Luxembourg",
    "Cyprus": "Chypre",
    "Malta": "Malte",
    "Ukraine": "Ukraine",
    "Serbia": "Serbie",
    "Turkey": "Turquie",
    "Türkiye": "Turquie",
    "Israel": "Israël",
    "China": "Chine",
    "Japan": "Japon",
    "South Korea": "Corée du Sud",
    "S. Korea": "Corée du Sud",
    "Taiwan": "Taïwan",
    "Hong Kong": "Hong Kong",
    "India": "Inde",
    "Singapore": "Singapour",
    "United Arab Emirates": "Émirats arabes unis",
    "UAE": "Émirats arabes unis",
    "Saudi Arabia": "Arabie saoudite",
    "Canada": "Canada",
    "Australia": "Australie",
    "Brazil": "Brésil",
    "Mexico": "Mexique",
}


def main():
    shutil.copyfile(DB, BACKUP)
    print(f"Backup created: {BACKUP}")

    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    cur.execute("UPDATE enterprises SET country = NULL WHERE TRIM(IFNULL(country, '')) = ''")
    blank_to_null = cur.rowcount

    updated = 0
    for src, dst in MAPPING.items():
        cur.execute("UPDATE enterprises SET country = ? WHERE country = ?", (dst, src))
        updated += cur.rowcount

    conn.commit()

    cur.execute("SELECT country, COUNT(*) as n FROM enterprises GROUP BY country ORDER BY n DESC")
    rows = cur.fetchall()

    print(f"Blank country -> NULL: {blank_to_null}")
    print(f"Country rows updated: {updated}")
    print("Top countries after normalization:")
    for country, n in rows[:30]:
        print(f"{n:4d} | {country}")

    conn.close()


if __name__ == "__main__":
    main()
