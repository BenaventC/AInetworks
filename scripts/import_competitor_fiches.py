import csv
import re
import sqlite3
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "database.db"
EXPORT_PATH = ROOT / "analyses" / "exports" / "competitor_import_summary.csv"


def normalize_name(value: str) -> str:
    text = (value or "").lower()
    text = text.replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\bthe\b", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_competitors(value: str):
    if not value:
        return []
    items = []
    for part in str(value).split(","):
        cleaned = re.sub(r"\s*\([^)]*\)\s*$", "", part).strip()
        if cleaned:
            items.append(cleaned)
    return items


def infer_sector_labels(source_sector: str | None, name: str) -> str:
    if source_sector and str(source_sector).strip():
        return str(source_sector).strip()

    text = f"{source_sector or ''} {name or ''}".lower()
    labels = []
    if any(keyword in text for keyword in ["ai", "artificial intelligence"]):
        labels.append("Artificial Intelligence")
    if "robot" in text:
        labels.append("Robotics")
    if "vision" in text:
        labels.append("Computer Vision")
    if "cloud" in text:
        labels.append("Cloud Provider")
    if "security" in text:
        labels.append("IT & Security")
    if any(keyword in text for keyword in ["health", "medical", "bio"]):
        labels.append("Health & Social Care")
    if any(keyword in text for keyword in ["finance", "bank", "crypto"]):
        labels.append("Financial Services")
    if "education" in text:
        labels.append("Education")
    if "data" in text:
        labels.append("Data")
    if any(keyword in text for keyword in ["gpu", "chip", "semiconductor", "hardware"]):
        labels.append("Hardware")
    if any(keyword in text for keyword in ["network", "ict", "software", "tech"]):
        labels.append("ICT")
    if "energy" in text:
        labels.append("Energy & Utilities")
    if any(keyword in text for keyword in ["transport", "mobility"]):
        labels.append("Transport & Mobility")
    if any(keyword in text for keyword in ["retail", "ecommerce"]):
        labels.append("Retail & E-commerce")
    if any(keyword in text for keyword in ["media", "entertainment"]):
        labels.append("Media & Entertainment")
    if any(keyword in text for keyword in ["manufacturing", "operations"]):
        labels.append("Manufacturing & Operations")
    if "biotech" in text:
        labels.append("Biotech")
    if not labels:
        labels = ["ICT"]
    return ", ".join(list(dict.fromkeys(labels))[:3])


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    rows = cur.execute("SELECT id, name, main_competitors, sector FROM enterprises").fetchall()

    source_rows = []
    for row in rows:
        for competitor in parse_competitors(row["main_competitors"]):
            source_rows.append((competitor, row["name"], row["sector"]))

    scanned_enterprises = len(rows)
    source_enterprises = sum(1 for row in rows if str(row["main_competitors"] or "").strip())

    counter = Counter(competitor for competitor, _, _ in source_rows)
    existing_names = [row["name"] for row in cur.execute("SELECT name FROM enterprises").fetchall() if row["name"]]
    existing_norm = {normalize_name(name): name for name in existing_names}

    source_details = {}
    for competitor, source_name, source_sector in source_rows:
        source_details.setdefault(competitor, (source_name, source_sector))

    created = []
    summary_rows = []
    for competitor, count in sorted(counter.items(), key=lambda item: (-item[1], item[0])):
        normalized_competitor = normalize_name(competitor)
        source_name, source_sector = source_details.get(competitor, ("", ""))
        already_present = normalized_competitor in existing_norm
        sector_value = infer_sector_labels(source_sector, competitor)

        if not already_present:
            cur.execute(
                """
                INSERT INTO enterprises (
                    name, sector, description, main_competitors, organization_type, company_status, is_validated
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    competitor,
                    sector_value,
                    f"Imported from competitor list of {source_name}",
                    source_name,
                    None,
                    "Active",
                    3,
                ),
            )
            created.append((competitor, source_name, count, sector_value))
            existing_norm[normalized_competitor] = competitor
            status = "created"
        else:
            status = "existing"

        summary_rows.append((competitor, count, source_name, sector_value, status))

    conn.commit()

    EXPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with EXPORT_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["competitor", "frequency", "source_company", "sector_labels", "status"])
        for competitor, count, source_name, sector_value, status in summary_rows:
            writer.writerow([competitor, count, source_name, sector_value, status])

    print("scanned_enterprises=%d" % scanned_enterprises)
    print("source_enterprises_with_competitors=%d" % source_enterprises)
    print("distinct_competitors=%d" % len(counter))
    print("total_competitor_mentions=%d" % len(source_rows))
    print("created_records=%d" % len(created))
    print("top_competitors=")
    for competitor, count in counter.most_common(30):
        print(f"{count}\t{competitor}")
    print("created_samples=")
    for item in created[:10]:
        print(item)
    print(f"summary_export={EXPORT_PATH}")

    conn.close()


if __name__ == "__main__":
    main()
