#!/usr/bin/env python3
"""Cleanup generated target enterprises created from relation extraction.

This script focuses on post-processing generated target enterprises:
- fix common typos / aliases
- split composite names like "A; B; C" or "A / B" into distinct targets
- merge duplicate enterprises safely while preserving relations

Default mode is DRY-RUN. Use --apply to persist changes.
"""

from __future__ import annotations

import argparse
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

DEFAULT_DB_PATH = "database.db"
DEFAULT_MIN_ID = 1615

ALIAS_MAP = {
    "INtel": "Intel",
    "Qulcomm": "Qualcomm",
    "Réplicate": "Replicate",
    "TogetherAI": "Together AI",
    "civitai": "Civitai",
    "Y combinator": "Y Combinator",
    "Goldmans Sachs": "Goldman Sachs",
    "Space X": "SpaceX",
    "Srge AI": "Surge AI",
    "Telus digital": "TELUS Digital",
    "Cloudfactory": "CloudFactory",
    "The Master Trust Bank of Japan": "Master Trust Bank of Japan",
    "JPMorgan Chase": "JPMorgan Chase & Co.",
}

INVALID_NAMES = {
    "NA",
    "AND",
    "iPadOS",
    "macOS)",
    "ChatGPT integration in Siri and Writing Tools across iOS",
    "institutional investors",
}


@dataclass
class Stats:
    renamed: int = 0
    merged_enterprises: int = 0
    split_composites: int = 0
    created_enterprises: int = 0
    deleted_invalid_enterprises: int = 0
    relations_created: int = 0
    relations_updated: int = 0
    relations_deleted: int = 0


class CleanupEngine:
    def __init__(self, db_path: str, apply_changes: bool, min_id: int, split_composites_enabled: bool) -> None:
        self.db_path = db_path
        self.apply_changes = apply_changes
        self.min_id = min_id
        self.split_composites_enabled = split_composites_enabled
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.stats = Stats()

        self.preview: List[str] = []
        self.name_index: Dict[str, int] = {}

    @staticmethod
    def normalize_key(value: str) -> str:
        text = value.strip().lower()
        text = re.sub(r"[\s\-_./]+", " ", text)
        text = re.sub(r"[^a-z0-9 ]+", "", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    @staticmethod
    def merge_csv_values(a: Optional[str], b: Optional[str]) -> Optional[str]:
        items: List[str] = []
        for raw in [a, b]:
            if not raw:
                continue
            for part in str(raw).split(","):
                item = part.strip()
                if item and item not in items:
                    items.append(item)
        return ", ".join(items) if items else None

    @staticmethod
    def split_composite_name(name: str) -> List[str]:
        # Primary pattern: semicolon-separated lists
        if ";" in name:
            return [part.strip() for part in name.split(";") if part.strip()]

        # Secondary pattern: slash-separated pair
        if " / " in name:
            return [part.strip() for part in name.split(" / ") if part.strip()]

        return []

    def load_name_index(self) -> None:
        rows = self.conn.execute("SELECT id, name FROM enterprises").fetchall()
        self.name_index.clear()
        for row in rows:
            name = (row["name"] or "").strip()
            if not name:
                continue
            key = self.normalize_key(name)
            if key and key not in self.name_index:
                self.name_index[key] = int(row["id"])

    def find_or_create_enterprise(self, name: str) -> int:
        key = self.normalize_key(name)
        if not key:
            raise ValueError("empty enterprise name")

        existing = self.name_index.get(key)
        if existing:
            return existing

        if self.apply_changes:
            cur = self.conn.execute("INSERT INTO enterprises (name, is_validated) VALUES (?, 0)", (name,))
            ent_id = int(cur.lastrowid)
        else:
            ent_id = -1 * (self.stats.created_enterprises + 1)

        self.name_index[key] = ent_id
        self.stats.created_enterprises += 1
        self.preview.append(f"CREATE enterprise: {name}")
        return ent_id

    def get_relations_for_enterprise(self, ent_id: int) -> Sequence[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM partnerships WHERE enterprise1_id = ? OR enterprise2_id = ?",
            (ent_id, ent_id),
        ).fetchall()

    def get_relation(self, e1: int, e2: int, exclude_id: Optional[int] = None) -> Optional[sqlite3.Row]:
        if exclude_id is None:
            return self.conn.execute(
                "SELECT * FROM partnerships WHERE enterprise1_id = ? AND enterprise2_id = ?",
                (e1, e2),
            ).fetchone()
        return self.conn.execute(
            "SELECT * FROM partnerships WHERE enterprise1_id = ? AND enterprise2_id = ? AND id <> ?",
            (e1, e2, exclude_id),
        ).fetchone()

    def merge_relation_rows(self, keep_row: sqlite3.Row, drop_row: sqlite3.Row) -> None:
        merged_type_relation = self.merge_csv_values(keep_row["type_relation"], drop_row["type_relation"])
        merged_partnership_type = self.merge_csv_values(keep_row["partnership_type"], drop_row["partnership_type"])
        merged_start_date = keep_row["start_date"] or drop_row["start_date"]

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
                (merged_type_relation, merged_partnership_type, merged_start_date, int(keep_row["id"])),
            )
            self.conn.execute("DELETE FROM partnerships WHERE id = ?", (int(drop_row["id"]),))

        self.stats.relations_updated += 1
        self.stats.relations_deleted += 1

    def merge_enterprises(self, source_id: int, target_id: int) -> None:
        if source_id == target_id:
            return

        rel_rows = self.get_relations_for_enterprise(source_id)
        for row in rel_rows:
            row_id = int(row["id"])
            new_e1 = target_id if int(row["enterprise1_id"]) == source_id else int(row["enterprise1_id"])
            new_e2 = target_id if int(row["enterprise2_id"]) == source_id else int(row["enterprise2_id"])

            if new_e1 == new_e2:
                if self.apply_changes:
                    self.conn.execute("DELETE FROM partnerships WHERE id = ?", (row_id,))
                self.stats.relations_deleted += 1
                continue

            existing = self.get_relation(new_e1, new_e2, exclude_id=row_id)
            if existing is not None:
                self.merge_relation_rows(existing, row)
                continue

            if self.apply_changes:
                self.conn.execute(
                    """
                    UPDATE partnerships
                    SET enterprise1_id = ?, enterprise2_id = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (new_e1, new_e2, row_id),
                )
            self.stats.relations_updated += 1

        if self.apply_changes:
            self.conn.execute("DELETE FROM enterprises WHERE id = ?", (source_id,))
        self.stats.merged_enterprises += 1

    def cleanup_invalid_targets(self) -> None:
        rows = self.conn.execute(
            "SELECT id, name FROM enterprises WHERE id >= ? ORDER BY id",
            (self.min_id,),
        ).fetchall()

        for row in rows:
            ent_id = int(row["id"])
            name = (row["name"] or "").strip()
            if name not in INVALID_NAMES:
                continue

            rels = self.get_relations_for_enterprise(ent_id)
            for rel in rels:
                if self.apply_changes:
                    self.conn.execute("DELETE FROM partnerships WHERE id = ?", (int(rel["id"]),))
                self.stats.relations_deleted += 1

            if self.apply_changes:
                self.conn.execute("DELETE FROM enterprises WHERE id = ?", (ent_id,))
            self.stats.deleted_invalid_enterprises += 1
            self.preview.append(f"DELETE invalid enterprise: #{ent_id} {name}")

    def rename_aliases(self) -> None:
        rows = self.conn.execute(
            "SELECT id, name FROM enterprises WHERE id >= ? ORDER BY id",
            (self.min_id,),
        ).fetchall()

        for row in rows:
            source_id = int(row["id"])
            source_name = (row["name"] or "").strip()
            canonical = ALIAS_MAP.get(source_name)
            if not canonical:
                continue

            canonical_id = self.find_or_create_enterprise(canonical)
            if canonical_id == source_id:
                continue

            if canonical_id < 0 and self.apply_changes:
                raise RuntimeError("Unexpected synthetic id in apply mode")

            if self.apply_changes and canonical_id == source_id:
                continue

            if source_id == canonical_id:
                continue

            if self.apply_changes and canonical_id > 0:
                self.merge_enterprises(source_id, canonical_id)
            else:
                # dry-run merge simulation
                self.stats.merged_enterprises += 1

            self.stats.renamed += 1
            self.preview.append(f"ALIAS merge: #{source_id} {source_name} -> #{canonical_id} {canonical}")

    def split_composites(self) -> None:
        rows = self.conn.execute(
            "SELECT id, name FROM enterprises WHERE id >= ? ORDER BY id",
            (self.min_id,),
        ).fetchall()

        for row in rows:
            source_id = int(row["id"])
            source_name = (row["name"] or "").strip()
            parts = self.split_composite_name(source_name)
            if len(parts) < 2:
                continue

            # move each relation to all parts
            rels = self.conn.execute(
                "SELECT * FROM partnerships WHERE enterprise2_id = ?",
                (source_id,),
            ).fetchall()

            for rel in rels:
                for part_name in parts:
                    target_id = self.find_or_create_enterprise(part_name)
                    if target_id == source_id:
                        continue

                    existing = self.get_relation(int(rel["enterprise1_id"]), target_id)
                    if existing is None:
                        if self.apply_changes:
                            self.conn.execute(
                                """
                                INSERT INTO partnerships (
                                    enterprise1_id, enterprise2_id, partnership_type, type_relation,
                                    description, start_date, end_year, source, sources_information,
                                    infra_commitment_text, value_millions, is_validated, status
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """,
                                (
                                    int(rel["enterprise1_id"]),
                                    target_id,
                                    rel["partnership_type"],
                                    rel["type_relation"],
                                    rel["description"],
                                    rel["start_date"],
                                    rel["end_year"],
                                    rel["source"],
                                    rel["sources_information"],
                                    rel["infra_commitment_text"],
                                    rel["value_millions"],
                                    rel["is_validated"],
                                    rel["status"],
                                ),
                            )
                        self.stats.relations_created += 1
                    else:
                        self.merge_relation_rows(existing, rel)

                if self.apply_changes:
                    self.conn.execute("DELETE FROM partnerships WHERE id = ?", (int(rel["id"]),))
                self.stats.relations_deleted += 1

            if self.apply_changes:
                self.conn.execute("DELETE FROM enterprises WHERE id = ?", (source_id,))
            self.stats.split_composites += 1
            self.preview.append(f"SPLIT composite enterprise: #{source_id} {source_name}")

    def run(self) -> None:
        self.load_name_index()

        self.cleanup_invalid_targets()
        self.load_name_index()

        self.rename_aliases()
        self.load_name_index()

        if self.split_composites_enabled:
            self.split_composites()

        if self.apply_changes:
            self.conn.commit()
        else:
            self.conn.rollback()

    def close(self) -> None:
        self.conn.close()

    def print_summary(self) -> None:
        print(f"Mode: {'APPLY' if self.apply_changes else 'DRY-RUN'}")
        print(f"Renamed aliases: {self.stats.renamed}")
        print(f"Merged enterprises: {self.stats.merged_enterprises}")
        print(f"Split composites: {self.stats.split_composites}")
        print(f"Created enterprises: {self.stats.created_enterprises}")
        print(f"Deleted invalid enterprises: {self.stats.deleted_invalid_enterprises}")
        print(f"Relations created: {self.stats.relations_created}")
        print(f"Relations updated: {self.stats.relations_updated}")
        print(f"Relations deleted: {self.stats.relations_deleted}")
        print("\nPreview (first 40):")
        if not self.preview:
            print("- none")
        else:
            for line in self.preview[:40]:
                print(f"- {line}")
            if len(self.preview) > 40:
                print(f"- ... {len(self.preview) - 40} more")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Cleanup generated relation targets")
    parser.add_argument("--db", default=DEFAULT_DB_PATH, help="SQLite database path")
    parser.add_argument("--min-id", type=int, default=DEFAULT_MIN_ID, help="Only process enterprises with id >= min-id")
    parser.add_argument(
        "--split-composites",
        action="store_true",
        help="Enable splitting composite target names (semicolon/slash). Disabled by default for safety.",
    )
    parser.add_argument("--apply", action="store_true", help="Apply changes")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not Path(args.db).exists():
        print(f"Database file not found: {args.db}")
        return 1

    engine = CleanupEngine(args.db, args.apply, args.min_id, args.split_composites)
    try:
        engine.run()
        engine.print_summary()
        return 0
    except Exception as exc:
        engine.conn.rollback()
        print(f"ERROR: {exc}")
        return 1
    finally:
        engine.close()


if __name__ == "__main__":
    raise SystemExit(main())
