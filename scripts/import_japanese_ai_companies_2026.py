from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import date
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "database.db"
AUDIT_PATH = Path(__file__).resolve().parents[1] / "exports" / "japanese_ai_companies_2026_audit.json"
SOURCE_DATE = "2026-08-15"
USD_PER_JPY = 1 / 150.0

COMPANIES = [
    {
        "name": "Sakana AI",
        "aliases": [],
        "country": "Japan",
        "city": "Tokyo",
        "founded_year": 2023,
        "capitalization": 2650.0,
        "funds_raised": 100.0,
        "sector": "AI model",
        "website": "https://sakana.ai/",
        "description": "Japanese frontier AI company founded by former Google AI researchers, developing efficient and collaborative foundation models inspired by nature and collective intelligence.",
        "source": "https://sakana.ai/; https://www.failory.com/startups/japan-unicorns",
        "capitalization_note": "Stored at the user-provided USD 2.65 billion valuation; Failory independently reports USD 2 billion, so this value should be revisited against a primary transaction source.",
    },
    {
        "name": "Preferred Networks",
        "aliases": ["PFN"],
        "country": "Japan",
        "city": "Tokyo",
        "founded_year": 2014,
        "capitalization": 2000.0,
        "funds_raised": round(44.6 * 1000 * USD_PER_JPY, 1),
        "sector": "AI model, Hardware, Robotics",
        "website": "https://www.preferred.jp/en/",
        "description": "Japanese deep-tech company vertically integrating AI chips, computing infrastructure, foundation models, and applications for manufacturing, mobility, robotics, life sciences, and finance.",
        "source": "https://www.preferred.jp/en/company/; https://www.preferred.jp/en/; https://www.failory.com/startups/japan-unicorns",
        "capitalization_note": "Failory reports a USD 2 billion valuation. Funding of JPY 44.6 billion is stored separately and converted at the documented working rate of JPY 150 per USD.",
    },
    {
        "name": "SmartNews",
        "aliases": [],
        "country": "Japan",
        "city": "Tokyo",
        "founded_year": 2012,
        "capitalization": 2000.0,
        "funds_raised": 410.3,
        "sector": "Data, Media",
        "website": "https://www.smartnews.com/en",
        "description": "Japanese news discovery and media technology company delivering quality information from more than 3,000 media partners through personalized mobile news products and AI-powered features.",
        "source": "https://about.smartnews.com/en/; https://www.smartnews.com/; https://www.failory.com/startups/japan-unicorns",
        "capitalization_note": "Failory reports a USD 2 billion valuation. Its reported USD 410.3 million funding is stored separately from capitalization.",
    },
    {
        "name": "LayerX",
        "aliases": [],
        "country": "Japan",
        "city": "Tokyo",
        "founded_year": None,
        "capitalization": None,
        "funds_raised": None,
        "sector": "Data, Financial Services, Workflow & Productivity",
        "website": "https://layerx.co.jp/",
        "description": "Japanese technology company digitalizing economic activity through AI agents for back-office automation, advanced AI and data products, fintech services, and cybersecurity.",
        "source": "https://www.layerx.co.jp/; https://layerx.co.jp/business/",
        "capitalization_note": "No reliable public valuation or funding amount was found in the reviewed sources; capitalization remains NULL.",
    },
    {
        "name": "Turing",
        "aliases": ["Turing Motors"],
        "country": "Japan",
        "city": "Tokyo",
        "founded_year": 2021,
        "capitalization": None,
        "funds_raised": round(36.5 * 1000 * USD_PER_JPY, 1),
        "sector": "Artificial Intelligence, Mobility & Transport",
        "website": "https://tur.ing/",
        "description": "Japanese autonomous-driving company developing an end-to-end AI system that handles perception, decision-making, and vehicle control for fully autonomous driving.",
        "source": "https://tur.ing/about/; https://tur.ing/company-deck/; https://tur.ing/news/20260706/",
        "capitalization_note": "No public valuation was found. The official company deck reports JPY 36.5 billion cumulative funding, converted at the documented working rate of JPY 150 per USD and stored in funds_raised.",
    },
]


def canonical(value: str) -> str:
    return "".join(character.lower() for character in value if character.isalnum())


def append_source(description: str | None, item: dict) -> str:
    marker = f"Source reviewed {SOURCE_DATE}: {item['source']}"
    existing = (description or "").strip()
    if marker in existing:
        return existing
    return f"{existing}\n\n{marker}. {item['capitalization_note']}".strip()


def choose_match(rows: list[sqlite3.Row], item: dict) -> tuple[sqlite3.Row | None, str]:
    target = canonical(item["name"])
    exact = [row for row in rows if canonical(row["name"]) == target]
    if len(exact) == 1:
        return exact[0], "exact"
    aliases = {canonical(alias) for alias in item["aliases"]}
    alias_matches = [row for row in rows if canonical(row["name"]) in aliases]
    if len(alias_matches) == 1:
        return alias_matches[0], "alias"
    if len(exact) > 1 or len(alias_matches) > 1:
        return None, "ambiguous"
    return None, "missing"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    audit = {
        "source_date": SOURCE_DATE,
        "usd_per_jpy_working_rate": USD_PER_JPY,
        "database": str(DB_PATH),
        "mode": "apply" if args.apply else "dry-run",
        "companies": [],
    }

    try:
        rows = connection.execute(
            "SELECT id, name, country, headquarter_city, founded_year, description, website, "
            "sector, capitalization, funds_raised, organization_type FROM enterprises"
        ).fetchall()
        for item in COMPANIES:
            row, match_type = choose_match(rows, item)
            decision = {"name": item["name"], "match": match_type}
            if match_type == "ambiguous":
                decision["action"] = "ambiguous"
                audit["companies"].append(decision)
                continue

            if row is None:
                decision.update({
                    "action": "created",
                    "capitalization_usd_millions": item["capitalization"],
                    "funds_raised_usd_millions": item["funds_raised"],
                })
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
                if value is not None and (row[column] is None or str(row[column]).strip() == ""):
                    updates.append(f"{column} = ?")
                    parameters.append(value)

            updated_description = append_source(row["description"], item)
            if updated_description != (row["description"] or ""):
                updates.append("description = ?")
                parameters.append(updated_description)

            decision.update({
                "action": "updated" if updates else "unchanged",
                "id": row["id"],
                "updates": [entry.split(" = ")[0] for entry in updates],
            })
            if args.apply and updates:
                connection.execute(
                    f"UPDATE enterprises SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [*parameters, row["id"]],
                )
            audit["companies"].append(decision)

        if args.apply:
            for item in COMPANIES:
                row = connection.execute("SELECT name FROM enterprises WHERE name = ?", (item["name"],)).fetchone()
                if row is None:
                    continue
                year = date.fromisoformat(SOURCE_DATE).year
                current = connection.execute(
                    "SELECT capitalization FROM enterprises WHERE name = ?", (row["name"],)
                ).fetchone()
                if current is None or current["capitalization"] is None:
                    continue
                history = connection.execute(
                    "SELECT id FROM enterprise_metrics_history WHERE enterprise_name = ? "
                    "AND indicator = 'capitalization' AND year = ?",
                    (row["name"], year),
                ).fetchone()
                if history is None:
                    connection.execute(
                        "INSERT INTO enterprise_metrics_history (enterprise_name, indicator, year, value, unit) "
                        "VALUES (?, 'capitalization', ?, ?, 'usd_m')",
                        (row["name"], year, current["capitalization"]),
                    )
                else:
                    connection.execute(
                        "UPDATE enterprise_metrics_history SET value = ?, unit = 'usd_m', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        (current["capitalization"], history["id"]),
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
