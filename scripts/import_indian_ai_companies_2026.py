from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import date
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "database.db"
AUDIT_PATH = Path(__file__).resolve().parents[1] / "exports" / "indian_ai_companies_2026_audit.json"
SOURCE_DATE = "2026-08-15"

COMPANIES = [
    {
        "name": "Fractal Analytics",
        "aliases": [],
        "country": "India",
        "city": "Mumbai",
        "founded_year": 2000,
        "capitalization": 2100.0,
        "funds_raised": None,
        "sector": "Data",
        "website": "https://fractal.ai/",
        "description": "Indian enterprise AI and decision intelligence company serving global organizations with analytics, engineering, and AI solutions.",
        "source": "https://fractal.ai/; https://pepmedia.in/best-ai-startups-in-india/",
        "capitalization_note": "Reported valuation above USD 2.1 billion; stored conservatively as USD 2,100 million.",
    },
    {
        "name": "Sarvam AI",
        "aliases": ["Sarvam"],
        "country": "India",
        "city": "Bengaluru",
        "founded_year": 2023,
        "capitalization": 1500.0,
        "funds_raised": 275.0,
        "sector": "AI model",
        "website": "https://www.sarvam.ai/",
        "description": "Indian sovereign AI platform developing multilingual models and enterprise services for speech, translation, voice agents, and document digitization.",
        "source": "https://www.sarvam.ai/; https://www.zonebourse.com/actualite-bourse/inde-hcltech-prend-10-5-de-sarvam-ai-valorisant-la-startup-a-1-5-milliard-de-dollars-ce7f5cdedc88f221",
        "capitalization_note": "Reuters reported a USD 1.5 billion valuation in the June 2026 Series B; funding reported separately as USD 275 million by Inc42.",
    },
    {
        "name": "Krutrim AI",
        "aliases": ["Ola Krutrim", "Krutrim"],
        "country": "India",
        "city": "Bengaluru",
        "founded_year": 2023,
        "capitalization": 1000.0,
        "funds_raised": 524.0,
        "sector": "AI model",
        "website": "https://krutrim.ai/",
        "description": "Indian AI company founded by Bhavish Aggarwal that develops multilingual foundation models and a full-stack artificial intelligence platform.",
        "source": "https://inc42.com/lists/top-20-funded-ai-startups-in-india-2026/; https://www.sapientservices.com/ai-startup-valuation-in-india/",
        "capitalization_note": "Reported as an AI unicorn valued at or above USD 1 billion; stored at the conservative lower bound of USD 1,000 million.",
    },
    {
        "name": "Uniphore",
        "aliases": [],
        "country": "India",
        "city": "Chennai",
        "founded_year": 2008,
        "capitalization": 2500.0,
        "funds_raised": None,
        "sector": "Voice & Audio AI",
        "website": "https://www.uniphore.com/",
        "description": "Indian-founded enterprise AI company providing conversational, voice, and business AI solutions for customer and operational workflows.",
        "source": "https://www.uniphore.com/; https://pepmedia.in/best-ai-startups-in-india/",
        "capitalization_note": "USD 2.5 billion valuation reported by Pepmedia; this is a secondary source and should be revisited against a primary transaction source.",
    },
    {
        "name": "Neysa",
        "aliases": [],
        "country": "India",
        "city": "Mumbai",
        "founded_year": 2023,
        "capitalization": None,
        "funds_raised": 49.9,
        "sector": "Infrastructure",
        "website": "https://neysa.ai/",
        "description": "Indian AI infrastructure company providing GPU compute, managed AI cloud, orchestration, and production engineering through its Velocis platform.",
        "source": "https://neysa.ai/; https://inc42.com/lists/top-20-funded-ai-startups-in-india-2026/",
        "capitalization_note": "No reliable valuation was found; Inc42 reports USD 49.9 million in total funding, stored separately from capitalization.",
    },
]


def canonical(value: str) -> str:
    return "".join(character.lower() for character in value if character.isalnum())


def append_source(description: str, item: dict) -> str:
    marker = f"Source reviewed {SOURCE_DATE}: {item['source']}"
    note = item["capitalization_note"]
    existing = (description or "").strip()
    if marker in existing:
        return existing
    return f"{existing}\n\n{marker}. {note}".strip()


def existing_rows(connection: sqlite3.Connection) -> list[sqlite3.Row]:
    return connection.execute(
        "SELECT id, name, country, headquarter_city, founded_year, description, website, "
        "sector, capitalization, funds_raised, organization_type, is_validated "
        "FROM enterprises"
    ).fetchall()


def choose_match(rows: list[sqlite3.Row], item: dict) -> tuple[sqlite3.Row | None, str]:
    target = canonical(item["name"])
    exact = [row for row in rows if canonical(row["name"]) == target]
    if len(exact) == 1:
        return exact[0], "exact"
    if len(exact) > 1:
        return None, "ambiguous_exact"
    aliases = {canonical(alias) for alias in item["aliases"]}
    alias_matches = [row for row in rows if canonical(row["name"]) in aliases]
    if len(alias_matches) == 1:
        return alias_matches[0], "alias"
    if len(alias_matches) > 1:
        return None, "ambiguous_alias"
    return None, "missing"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    audit = {
        "source_date": SOURCE_DATE,
        "database": str(DB_PATH),
        "mode": "apply" if args.apply else "dry-run",
        "companies": [],
    }

    try:
        rows = existing_rows(connection)
        for item in COMPANIES:
            row, match_type = choose_match(rows, item)
            decision = {"name": item["name"], "match": match_type}
            if match_type.startswith("ambiguous"):
                decision["action"] = "ambiguous"
                audit["companies"].append(decision)
                continue

            if row is None:
                decision["action"] = "created"
                decision["capitalization_usd_millions"] = item["capitalization"]
                decision["funds_raised_usd_millions"] = item["funds_raised"]
                if args.apply:
                    cursor = connection.execute(
                        "INSERT INTO enterprises (name, sector, organization_type, country, "
                        "headquarter_city, founded_year, description, website, capitalization, "
                        "funds_raised, is_validated, company_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (
                            item["name"], item["sector"], "Private company", item["country"],
                            item["city"], item["founded_year"], append_source(item["description"], item),
                            item["website"], item["capitalization"], item["funds_raised"], 3, "Active",
                        ),
                    )
                    decision["id"] = cursor.lastrowid
                audit["companies"].append(decision)
                continue

            updates = []
            parameters = []
            for column, value in (
                ("country", item["country"]),
                ("headquarter_city", item["city"]),
                ("founded_year", item["founded_year"]),
                ("sector", item["sector"]),
                ("website", item["website"]),
                ("organization_type", "Private company"),
                ("capitalization", item["capitalization"]),
                ("funds_raised", item["funds_raised"]),
            ):
                current = row[column]
                if value is not None and (current is None or str(current).strip() == ""):
                    updates.append(f"{column} = ?")
                    parameters.append(value)

            updated_description = append_source(row["description"], item)
            if updated_description != (row["description"] or ""):
                updates.append("description = ?")
                parameters.append(updated_description)

            decision["action"] = "updated" if updates else "unchanged"
            decision["id"] = row["id"]
            decision["updates"] = [entry.split(" = ")[0] for entry in updates]
            if args.apply and updates:
                parameters.extend([row["id"]])
                connection.execute(
                    f"UPDATE enterprises SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    parameters,
                )
            audit["companies"].append(decision)

        if args.apply:
            for item in COMPANIES:
                if item["capitalization"] is None:
                    continue
                row, match_type = choose_match(existing_rows(connection), item)
                if row is None:
                    row = connection.execute("SELECT id, name FROM enterprises WHERE name = ?", (item["name"],)).fetchone()
                if row is None:
                    continue
                connection.execute(
                    "INSERT INTO enterprise_metrics_history (enterprise_name, indicator, year, value, unit) "
                    "SELECT ?, 'capitalization', ?, ?, 'usd_m' WHERE NOT EXISTS ("
                    "SELECT 1 FROM enterprise_metrics_history WHERE enterprise_name = ? AND indicator = 'capitalization' AND year = ?)",
                    (row["name"], date.fromisoformat(SOURCE_DATE).year, item["capitalization"], row["name"], date.fromisoformat(SOURCE_DATE).year),
                )
            connection.commit()

        AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        AUDIT_PATH.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(audit, ensure_ascii=False, indent=2))
    except Exception:
        if args.apply:
            connection.rollback()
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    main()
