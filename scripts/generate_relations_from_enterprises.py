#!/usr/bin/env python3
"""Generate relations from enterprise text fields.

For each enterprise, parse comma-separated items from:
- main_investors
- main_competitors
- main_acquisitions
- strategic_partnerships

For each parsed item:
- focal enterprise = source enterprise
- target enterprise = parsed item name (without trailing date in parentheses)
- type_relation = mapped relation label from source field
- start_date = parenthesized value when present

By default this script runs in DRY-RUN mode.
Use --apply to write changes into the SQLite database.
"""

from __future__ import annotations

import argparse
import re
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

DB_PATH = "database.db"

FIELD_TO_RELATION_TYPE = {
    "main_investors": "Investor",
    "main_competitors": "Competitor",
    "main_acquisitions": "Acquisition",
    "strategic_partnerships": "Strategic Partnership",
}

SPLIT_PATTERN = re.compile(r",")
DATE_SUFFIX_PATTERN = re.compile(r"^(.*?)\s*\(([^()]+)\)\s*$")
YEAR_PATTERN = re.compile(r"^\d{4}$")
ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
EU_DATE_PATTERN = re.compile(r"^\d{2}/\d{2}/\d{4}$")
MONTH_YEAR_PATTERN = re.compile(
    r"^(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+\d{4}$",
    re.IGNORECASE,
)


@dataclass
class ExistingRelation:
    row_id: int
    type_relation: Optional[str]
    partnership_type: Optional[str]
    start_date: Optional[str]


@dataclass
class Counters:
    rows_scanned: int = 0
    parsed_items: int = 0
    skipped_empty: int = 0
    skipped_self_relation: int = 0
    created_enterprises: int = 0
    reused_enterprises: int = 0
    created_relations: int = 0
    updated_relations: int = 0


class RelationGenerator:
    def __init__(self, db_path: str, apply_changes: bool) -> None:
        self.db_path = db_path
        self.apply_changes = apply_changes
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.counters = Counters()

        # Preview buffers for dry-run readability.
        self.preview_new_enterprises: List[str] = []
        self.preview_new_relations: List[str] = []
        self.preview_updated_relations: List[str] = []

        # Name cache: normalized name -> enterprise id
        self.name_to_id: Dict[str, int] = {}

    @staticmethod
    def normalize_key(value: str) -> str:
        """Normalize names for robust matching."""
        text = value.strip().lower()
        text = re.sub(r"[\s\-_/]+", " ", text)
        text = re.sub(r"[^a-z0-9 ]+", "", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    @staticmethod
    def is_date_like(value: str) -> bool:
        candidate = value.strip()
        if not candidate:
            return False
        return bool(
            YEAR_PATTERN.match(candidate)
            or ISO_DATE_PATTERN.match(candidate)
            or EU_DATE_PATTERN.match(candidate)
            or MONTH_YEAR_PATTERN.match(candidate)
        )

    @staticmethod
    def split_items(raw: Optional[str]) -> List[str]:
        if not raw:
            return []
        return [part.strip() for part in SPLIT_PATTERN.split(raw) if part.strip()]

    @staticmethod
    def parse_item(raw_item: str) -> Tuple[str, Optional[str]]:
        """Extract target name and optional trailing date in parentheses."""
        match = DATE_SUFFIX_PATTERN.match(raw_item)
        if not match:
            return raw_item.strip(), None

        target_name = match.group(1).strip()
        suffix_value = match.group(2).strip()
        if RelationGenerator.is_date_like(suffix_value):
            return target_name, suffix_value

        # Parentheses exist but do not carry a date. Keep full text as company name.
        return raw_item.strip(), None

    @staticmethod
    def merge_relation_types(existing_value: Optional[str], new_type: str) -> str:
        """Merge relation types in a comma-separated list without duplicates."""
        if not existing_value or not existing_value.strip():
            return new_type

        items = [part.strip() for part in existing_value.split(",") if part.strip()]
        if new_type not in items:
            items.append(new_type)
        return ", ".join(items)

    def load_enterprise_cache(self) -> None:
        rows = self.conn.execute("SELECT id, name FROM enterprises").fetchall()
        for row in rows:
            if not row["name"]:
                continue
            key = self.normalize_key(row["name"])
            if key and key not in self.name_to_id:
                self.name_to_id[key] = row["id"]

    def resolve_or_create_enterprise(self, name: str) -> int:
        key = self.normalize_key(name)
        if not key:
            raise ValueError("Enterprise target name is empty after normalization")

        existing_id = self.name_to_id.get(key)
        if existing_id:
            self.counters.reused_enterprises += 1
            return existing_id

        if self.apply_changes:
            cursor = self.conn.execute(
                "INSERT INTO enterprises (name, is_validated) VALUES (?, 0)",
                (name.strip(),),
            )
            new_id = int(cursor.lastrowid)
        else:
            # Synthetic negative id for dry-run flow continuity.
            new_id = -(len(self.preview_new_enterprises) + 1)

        self.name_to_id[key] = new_id
        self.counters.created_enterprises += 1
        self.preview_new_enterprises.append(name.strip())
        return new_id

    def get_existing_relation(self, enterprise1_id: int, enterprise2_id: int) -> Optional[ExistingRelation]:
        row = self.conn.execute(
            """
            SELECT id, type_relation, partnership_type, start_date
            FROM partnerships
            WHERE enterprise1_id = ? AND enterprise2_id = ?
            """,
            (enterprise1_id, enterprise2_id),
        ).fetchone()

        if not row:
            return None

        return ExistingRelation(
            row_id=int(row["id"]),
            type_relation=row["type_relation"],
            partnership_type=row["partnership_type"],
            start_date=row["start_date"],
        )

    def create_relation(
        self,
        enterprise1_id: int,
        enterprise2_id: int,
        relation_type: str,
        start_date: Optional[str],
    ) -> None:
        if self.apply_changes:
            self.conn.execute(
                """
                INSERT INTO partnerships (
                    enterprise1_id,
                    enterprise2_id,
                    partnership_type,
                    type_relation,
                    description,
                    start_date,
                    end_year,
                    status,
                    sources_information,
                    infra_commitment_text,
                    value_millions,
                    is_validated
                ) VALUES (?, ?, ?, ?, NULL, ?, NULL, 'active', NULL, NULL, NULL, 0)
                """,
                (
                    enterprise1_id,
                    enterprise2_id,
                    relation_type,
                    relation_type,
                    start_date,
                ),
            )

        self.counters.created_relations += 1
        self.preview_new_relations.append(
            f"{enterprise1_id} -> {enterprise2_id} | {relation_type}"
            + (f" | start_date={start_date}" if start_date else "")
        )

    def update_relation(self, row: ExistingRelation, relation_type: str, start_date: Optional[str]) -> None:
        next_type_relation = self.merge_relation_types(row.type_relation, relation_type)
        next_partnership_type = self.merge_relation_types(row.partnership_type, relation_type)
        next_start_date = row.start_date

        if (not next_start_date or not str(next_start_date).strip()) and start_date:
            next_start_date = start_date

        changed = (
            next_type_relation != (row.type_relation or "")
            or next_partnership_type != (row.partnership_type or "")
            or (next_start_date or None) != (row.start_date or None)
        )

        if not changed:
            return

        if self.apply_changes:
            self.conn.execute(
                """
                UPDATE partnerships
                SET type_relation = ?,
                    partnership_type = ?,
                    start_date = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (next_type_relation, next_partnership_type, next_start_date, row.row_id),
            )

        self.counters.updated_relations += 1
        self.preview_updated_relations.append(
            f"relation#{row.row_id} -> type_relation={next_type_relation}"
            + (f" | start_date={next_start_date}" if next_start_date else "")
        )

    def process(self) -> None:
        self.load_enterprise_cache()

        enterprise_rows = self.conn.execute(
            """
            SELECT
                id,
                name,
                main_investors,
                main_competitors,
                main_acquisitions,
                strategic_partnerships
            FROM enterprises
            ORDER BY id
            """
        ).fetchall()

        for ent in enterprise_rows:
            focal_id = int(ent["id"])
            focal_name = (ent["name"] or "").strip()
            self.counters.rows_scanned += 1

            for field_name, relation_type in FIELD_TO_RELATION_TYPE.items():
                for raw_item in self.split_items(ent[field_name]):
                    self.counters.parsed_items += 1

                    target_name, date_value = self.parse_item(raw_item)
                    target_name = target_name.strip()

                    if not target_name:
                        self.counters.skipped_empty += 1
                        continue

                    if self.normalize_key(target_name) == self.normalize_key(focal_name):
                        self.counters.skipped_self_relation += 1
                        continue

                    target_id = self.resolve_or_create_enterprise(target_name)

                    existing_relation = self.get_existing_relation(focal_id, target_id)
                    if existing_relation is None:
                        self.create_relation(focal_id, target_id, relation_type, date_value)
                    else:
                        self.update_relation(existing_relation, relation_type, date_value)

    def commit_or_rollback(self) -> None:
        if self.apply_changes:
            self.conn.commit()
        else:
            self.conn.rollback()

    def close(self) -> None:
        self.conn.close()

    def print_summary(self) -> None:
        mode = "APPLY" if self.apply_changes else "DRY-RUN"
        print(f"Mode: {mode}")
        print(f"Rows scanned: {self.counters.rows_scanned}")
        print(f"Parsed items: {self.counters.parsed_items}")
        print(f"Skipped empty items: {self.counters.skipped_empty}")
        print(f"Skipped self relations: {self.counters.skipped_self_relation}")
        print(f"Created enterprises: {self.counters.created_enterprises}")
        print(f"Reused enterprises: {self.counters.reused_enterprises}")
        print(f"Created relations: {self.counters.created_relations}")
        print(f"Updated relations: {self.counters.updated_relations}")

        def show_preview(title: str, values: Sequence[str], limit: int = 20) -> None:
            print(f"\n{title} ({len(values)}):")
            if not values:
                print("- none")
                return
            for item in values[:limit]:
                print(f"- {item}")
            if len(values) > limit:
                print(f"- ... {len(values) - limit} more")

        show_preview("Preview new enterprises", self.preview_new_enterprises)
        show_preview("Preview new relations", self.preview_new_relations)
        show_preview("Preview updated relations", self.preview_updated_relations)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate relations from enterprise investors/competitors/acquisitions/strategic partnerships fields."
    )
    parser.add_argument("--db", default=DB_PATH, help="Path to SQLite database file (default: database.db)")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes to DB. Without this flag, script runs in dry-run mode.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    db_file = Path(args.db)
    if not db_file.exists():
        print(f"Database file not found: {db_file}")
        return 1

    generator = RelationGenerator(str(db_file), apply_changes=args.apply)

    try:
        generator.process()
        generator.commit_or_rollback()
        generator.print_summary()
        return 0
    except Exception as exc:  # pragma: no cover
        generator.conn.rollback()
        print(f"ERROR: {exc}")
        return 1
    finally:
        generator.close()


if __name__ == "__main__":
    raise SystemExit(main())
