import re
import requests
import unicodedata

RAW_URL = "https://en.wikipedia.org/w/index.php?title=List_of_artificial_intelligence_companies&action=raw"
API_URL = "http://localhost:3000/api/enterprises"
HEADERS = {"User-Agent": "Mozilla/5.0"}


def normalize(name: str) -> str:
    if not name:
        return ""
    name = name.strip().lower()
    name = unicodedata.normalize("NFKD", name)
    name = "".join(ch for ch in name if not unicodedata.combining(ch))
    # remove common legal suffixes at end
    name = re.sub(r"\b(inc|inc\.|ltd|ltd\.|corp|corp\.|corporation|company)\b", "", name)
    name = re.sub(r"[^a-z0-9]+", "", name)
    return name


def extract_display_name(wikilink: str) -> str:
    # [[Target|Label]] or [[Target]]
    inner = wikilink.strip()[2:-2]
    if "|" in inner:
        return inner.split("|", 1)[1].strip()
    return inner.strip().replace("_", " ")


# 1) current DB
resp = requests.get(API_URL, timeout=20)
resp.raise_for_status()
current = resp.json()
existing_norm = {normalize(e.get("name", "")): e.get("name", "") for e in current}

# 2) read raw wiki page
raw_resp = requests.get(RAW_URL, headers=HEADERS, timeout=30)
raw_resp.raise_for_status()
raw = raw_resp.text

companies = []
country = None
in_references = False

for line in raw.splitlines():
    line = line.strip()

    if line.startswith("== See also"):
        break

    # Country / subsection headings like === Canada ===
    m_country = re.match(r"^===+\s*(.*?)\s*===+$", line)
    if m_country:
        heading = m_country.group(1).strip()
        # keep concrete geography headings, skip continent headers
        if heading not in {"America", "Asia", "Europe"}:
            country = heading
        continue

    if not line.startswith("*"):
        continue

    # find first wikilink in bullet
    m_link = re.search(r"\[\[[^\]]+\]\]", line)
    if not m_link:
        continue

    name = extract_display_name(m_link.group(0))
    # remove footnote-like suffixes
    name = re.sub(r"\s*\[[^\]]+\]\s*$", "", name).strip()

    if not name:
        continue

    companies.append({"name": name, "country": country})

# Deduplicate by normalized name (keep first)
wiki_by_norm = {}
for c in companies:
    n = normalize(c["name"])
    if n and n not in wiki_by_norm:
        wiki_by_norm[n] = c

missing = [v for k, v in wiki_by_norm.items() if k not in existing_norm]

created = []
errors = []
for item in missing:
    payload = {
        "name": item["name"],
        "sector": None,
        "country": item["country"],
        "founded_year": None,
        "description": None,
        "website": None,
        "logo_url": None,
        "capitalization": None,
        "employees_count": None,
    }
    try:
        r = requests.post(API_URL, json=payload, timeout=20)
        if r.status_code == 200:
            created.append(item)
        else:
            errors.append((item["name"], r.status_code, r.text[:160]))
    except Exception as ex:
        errors.append((item["name"], "EXC", str(ex)))

print(f"Existing in DB before import: {len(current)}")
print(f"Unique companies parsed from Wikipedia raw list: {len(wiki_by_norm)}")
print(f"Missing detected: {len(missing)}")
print(f"Created: {len(created)}")

if created:
    print("--- Created (name | country) ---")
    for x in created:
        print(f"{x['name']} | {x['country']}")

if errors:
    print("--- Errors ---")
    for e in errors:
        print(e)
