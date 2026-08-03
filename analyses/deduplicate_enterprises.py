import sqlite3
import shutil
from datetime import datetime

DB = "database.db"
BACKUP = f"database.backup.dedup.{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"

# Conservative duplicate mapping: source -> canonical target
DUPLICATES = {
    "DeepMind": "Google DeepMind",
    "Google AI": "Google",
    "Microsoft AI": "Microsoft",
    "Meta Superintelligence Labs": "meta",
    "Safe Superintelligence Inc.": "Safe Superintelligence",
}

shutil.copyfile(DB, BACKUP)
print(f"Backup created: {BACKUP}")

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Helper: score enterprise richness to avoid deleting better profile by mistake
fields_to_score = [
    "sector", "country", "founded_year", "description", "website", "logo_url",
    "capitalization", "employees_count", "ai_products", "financing", "acquisitions",
    "revenue_model", "partnerships_info", "significant_risks", "personal_analysis"
]


def row_score(r):
    s = 0
    for f in fields_to_score:
        if f in r.keys() and r[f] not in (None, ""):
            s += 1
    return s

# Build id map for valid duplicate pairs
name_to_row = {}
for r in cur.execute("SELECT * FROM enterprises"):
    name_to_row[r["name"]] = r

valid_pairs = []
for src, dst in DUPLICATES.items():
    if src in name_to_row and dst in name_to_row:
        src_row = name_to_row[src]
        dst_row = name_to_row[dst]
        # Safety: if source is richer than target, swap to keep richer record
        if row_score(src_row) > row_score(dst_row):
            src, dst = dst, src
            src_row, dst_row = dst_row, src_row
        valid_pairs.append((src_row["id"], dst_row["id"], src, dst))

if not valid_pairs:
    print("No duplicate pairs found. Nothing to do.")
    conn.close()
    raise SystemExit(0)

print("Pairs to merge (source -> target):")
for sid, did, sname, dname in valid_pairs:
    print(f"- {sname} (id={sid}) -> {dname} (id={did})")

source_to_target = {sid: did for sid, did, _, _ in valid_pairs}
source_ids = set(source_to_target.keys())

# Check partnerships table columns dynamically
cur.execute("PRAGMA table_info(partnerships)")
part_cols = [r[1] for r in cur.fetchall()]

# Minimal required columns for reinsertion
required = ["enterprise1_id", "enterprise2_id"]
for c in required:
    if c not in part_cols:
        raise RuntimeError(f"Missing required column in partnerships: {c}")

# Load all partnerships
rows = [dict(r) for r in cur.execute("SELECT * FROM partnerships")]

# Keep stable column order, excluding auto id and timestamps that should regenerate
skip_cols = {"id", "created_at", "updated_at"}
insert_cols = [c for c in part_cols if c not in skip_cols]

# Build transformed partnerships without duplicates and self-links
merged = {}
for r in rows:
    e1 = source_to_target.get(r["enterprise1_id"], r["enterprise1_id"])
    e2 = source_to_target.get(r["enterprise2_id"], r["enterprise2_id"])

    # Drop self-partnerships created by merge
    if e1 == e2:
        continue

    # Canonicalize pair order to avoid mirrored duplicates
    a, b = (e1, e2) if e1 < e2 else (e2, e1)
    r["enterprise1_id"] = a
    r["enterprise2_id"] = b

    key = (a, b)

    # Keep the richest row if duplicate pair exists
    if key not in merged:
        merged[key] = r
    else:
        old = merged[key]

        def richness(x):
            score = 0
            for k, v in x.items():
                if k in ("id", "enterprise1_id", "enterprise2_id", "created_at", "updated_at"):
                    continue
                if v not in (None, ""):
                    score += 1
            return score

        if richness(r) > richness(old):
            merged[key] = r

try:
    cur.execute("BEGIN")

    # Rebuild partnerships content safely
    cur.execute("DELETE FROM partnerships")

    if merged:
        placeholders = ",".join(["?"] * len(insert_cols))
        sql = f"INSERT INTO partnerships ({','.join(insert_cols)}) VALUES ({placeholders})"
        for r in merged.values():
            vals = [r.get(c) for c in insert_cols]
            cur.execute(sql, vals)

    # Delete source duplicate enterprises
    for sid in source_ids:
        cur.execute("DELETE FROM enterprises WHERE id = ?", (sid,))

    conn.commit()
except Exception:
    conn.rollback()
    raise

# Report
before_count = len(name_to_row)
after_count = cur.execute("SELECT COUNT(*) FROM enterprises").fetchone()[0]
part_count = cur.execute("SELECT COUNT(*) FROM partnerships").fetchone()[0]

print(f"Enterprises before: {before_count}")
print(f"Enterprises after:  {after_count}")
print(f"Partnerships after: {part_count}")
print("Deduplication completed successfully.")

conn.close()
