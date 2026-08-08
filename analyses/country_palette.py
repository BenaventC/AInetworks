from __future__ import annotations

import re
import unicodedata

FORCED_COUNTRY_COLORS = {
    "unitedstates": "#2563EB",
    "usa": "#2563EB",
    "us": "#2563EB",
    "u.s.a.": "#2563EB",
    "etatsunis": "#2563EB",
    "etats-unis": "#2563EB",
    "unitedkingdom": "#111827",
    "uk": "#111827",
    "u.k.": "#111827",
    "royaumeuni": "#111827",
    "china": "#DC2626",
    "chine": "#DC2626",
    "canada": "#D97706",
    "japan": "#DB2777",
    "japon": "#DB2777",
    "southkorea": "#0F766E",
    "coreedusud": "#0F766E",
    "israel": "#8B5CF6",
    "india": "#F59E0B",
    "inde": "#F59E0B",
    "singapore": "#0EA5E9",
    "unitedarabemirates": "#7C3AED",
    "emiratsarabesunis": "#7C3AED",
    "saudiarabia": "#C2410C",
    "australia": "#0284C7",
    "brazil": "#16A34A",
    "bresil": "#16A34A",
    "mexico": "#059669",
    "taiwan": "#7C3AED",
    "hongkong": "#6366F1",
}

EUROPE_COUNTRY_KEYS = {
    "austria",
    "belgium",
    "bulgaria",
    "croatia",
    "cyprus",
    "czechrepublic",
    "czechia",
    "denmark",
    "estonia",
    "finland",
    "france",
    "germany",
    "greece",
    "hungary",
    "iceland",
    "ireland",
    "italy",
    "latvia",
    "lithuania",
    "luxembourg",
    "malta",
    "netherlands",
    "norway",
    "poland",
    "portugal",
    "romania",
    "slovakia",
    "slovenia",
    "spain",
    "sweden",
    "switzerland",
    "turkey",
    "turkiye",
    "ukraine",
    "unitedkingdom",
}

EUROPE_PALETTE = [
    "#14532D",
    "#166534",
    "#15803D",
    "#16A34A",
    "#22C55E",
    "#4ADE80",
    "#86EFAC",
    "#BBF7D0",
]

FALLBACK_PALETTE = [
    "#4F46E5",
    "#0EA5E9",
    "#EC4899",
    "#F97316",
    "#8B5CF6",
    "#14B8A6",
    "#F59E0B",
    "#64748B",
]


def country_key(value: str) -> str:
    if value is None:
        return ""
    text = str(value).strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", "", text)
    return text


def build_country_colors(countries: list[str]) -> dict[str, str]:
    unique_countries = []
    seen = set()
    for country in countries:
        if country is None:
            continue
        label = str(country).strip()
        if not label or label in seen:
            continue
        unique_countries.append(label)
        seen.add(label)

    europe = sorted([country for country in unique_countries if country_key(country) in EUROPE_COUNTRY_KEYS])
    non_europe = [country for country in unique_countries if country_key(country) not in EUROPE_COUNTRY_KEYS]

    color_map: dict[str, str] = {}
    for index, country in enumerate(europe):
        color_map[country] = EUROPE_PALETTE[index % len(EUROPE_PALETTE)]

    fallback_index = 0
    for country in non_europe:
        key = country_key(country)
        if key in FORCED_COUNTRY_COLORS:
            color_map[country] = FORCED_COUNTRY_COLORS[key]
        else:
            color_map[country] = FALLBACK_PALETTE[fallback_index % len(FALLBACK_PALETTE)]
            fallback_index += 1

    return color_map
