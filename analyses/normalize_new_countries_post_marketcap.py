import sqlite3

updates = {
    "S. Korea": "Corée du Sud",
    "Australia": "Australie",
    "Brazil": "Brésil",
    "Taiwan": "Taïwan",
    "Singapore": "Singapour",
}

conn = sqlite3.connect("database.db")
cur = conn.cursor()
changed = 0
for src, dst in updates.items():
    cur.execute("UPDATE enterprises SET country = ? WHERE country = ?", (dst, src))
    changed += cur.rowcount
conn.commit()
print(f"Rows updated: {changed}")
cur.execute("SELECT country, COUNT(*) FROM enterprises GROUP BY country ORDER BY COUNT(*) DESC")
for c, n in cur.fetchall()[:30]:
    print(f"{n:3d} | {c}")
conn.close()
