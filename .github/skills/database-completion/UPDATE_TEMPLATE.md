# Script Template: Mise à Jour Entreprise via API

## Usage

Adapter ce script pour chaque entreprise à compléter. Remplacer les valeurs entre `[BRACKETS]`.

### PowerShell

```powershell
# Configuration
$enterpriseId = [ID]
$name = "[CompanyName]"
$sector = "[Sector]"
$country = "[Country]"
$founded_year = [YEAR]
$description = "[Full description in French with proper accents]"
$website = "[https://company.com]"
$capitalization = "[1 milliard USD]"
$employees_count = [NUMBER]

# Créer le JSON avec tous les champs requis
$jsonData = @"
{
  "name": "$name",
  "sector": "$sector",
  "country": "$country",
  "headquarter_city": null,
  "founded_year": $founded_year,
  "description": "$description",
  "website": "$website",
  "logo_url": null,
  "capitalization": "$capitalization",
  "employees_count": $employees_count,
  "main_investors": null
}
"@

# Encoder en UTF-8 et envoyer
$bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonData)
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/enterprises/$enterpriseId" `
  -Method PUT `
  -ContentType "application/json; charset=utf-8" `
  -Body $bytes `
  -UseBasicParsing

Write-Host "Status: $($response.StatusCode)"

# Vérifier la mise à jour
if ($response.StatusCode -eq 200) {
  Write-Host "✓ Mise à jour réussie"
  $result = $response.Content | ConvertFrom-Json
  Write-Host "Description: $($result.description)"
} else {
  Write-Host "✗ Erreur: $($response.StatusCode)"
}
```

### Node.js

```javascript
// update-enterprise.js
const http = require('http');

const enterpriseId = [ID];
const data = {
  name: "[CompanyName]",
  sector: "[Sector]",
  country: "[Country]",
  founded_year: [YEAR],
  description: "[Full description in French with accents]",
  website: "[https://company.com]",
  logo_url: null,
  capitalization: "[1 milliard USD]",
  employees_count: [NUMBER]
};

const postData = JSON.stringify(data);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/enterprises/${enterpriseId}`,
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', chunk => responseData += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      console.log('✓ Mise à jour réussie');
      console.log('Description:', JSON.parse(responseData).description);
    } else {
      console.log('✗ Erreur:', res.statusCode);
    }
  });
});

req.on('error', (error) => console.error('Erreur:', error));
req.write(postData);
req.end();
```

## Checklist avant exécution

- [ ] Vérifier l'ID de l'entreprise
- [ ] Accents français correctement saisis (é, è, ç, à, etc.)
- [ ] Description complète et cohérente (> 100 caractères)
- [ ] Website valide (https://...)
- [ ] Capitalization au bon format (ex: "1 milliard USD")
- [ ] Employees_count = nombre entier ou null
- [ ] headquarter_city et main_investors présents dans le payload (même à null)

## Vérification post-exécution

```powershell
# Lancer après la mise à jour pour vérifier
Invoke-WebRequest -Uri "http://localhost:3000/api/enterprises/[ID]" -UseBasicParsing | 
  Select-Object -ExpandProperty Content | 
  ConvertFrom-Json | 
  Select-Object name, description, website, capitalization, employees_count
```

Vérifier dans le navigateur : http://localhost:3000

## Template Import Forbes AI 50

Objectif : importer les entreprises absentes depuis Forbes AI 50 et mapper `funding` vers `capitalization`.

Règles rapides :
- `funding` (ex: `$1.7 B`) -> `capitalization` (ex: `1.7 B USD`)
- `location` -> `country` (normalisé FR)
- `founded` -> `founded_year`
- n'ajouter que si le nom normalisé n'existe pas déjà

Snippet de payload:

```json
{
  "name": "Perplexity",
  "sector": "AI search engine",
  "country": "États-Unis",
  "founded_year": 2022,
  "description": null,
  "website": null,
  "logo_url": null,
  "capitalization": "1.7 B USD",
  "employees_count": null
}
```

## Template Import CompaniesMarketCap

Objectif : importer les entreprises absentes depuis la table IA cotées et mapper `market cap` vers `capitalization`.

Règles rapides :
- `market cap` (ex: `$365.96 B`) -> `capitalization` (ex: `365.96 B USD`)
- `country` source -> `country` FR
- `sector` standard pour ces entrées : `Entreprise IA cotée (market cap)`

Snippet de payload:

```json
{
  "name": "Oracle",
  "sector": "Entreprise IA cotée (market cap)",
  "country": "États-Unis",
  "headquarter_city": null,
  "founded_year": null,
  "description": null,
  "website": null,
  "logo_url": null,
  "capitalization": "365.96 B USD",
  "employees_count": null,
  "main_investors": null
}
```

## Template Import AI Startups Europe (Massif)

Commande recommandée :

```powershell
cd "c:\Users\33623\Documents\___Projets\AI\Reseaux d'acteurs"
& "c:/Users/33623/Documents/___Projets/AI/Reseaux d'acteurs/.venv/Scripts/python.exe" "analyses/import_ai_startups_europe_1312.py"
```

Attendus :
- Crawl multi-pages (`/`, `/p2`, ...)
- Insert des absentes
- Update des existantes incomplètes
- Audit: `analyses/ai_startups_europe_1312_import_audit.json`

## Template Enrichissement Batch Wikidata

Commande recommandée (batch de 60) :

```powershell
cd "c:\Users\33623\Documents\___Projets\AI\Reseaux d'acteurs"
$env:MAX_TARGETS="60"
& "c:/Users/33623/Documents/___Projets/AI/Reseaux d'acteurs/.venv/Scripts/python.exe" "analyses/enrich_missing_profiles_wikidata.py"
```

Répéter la commande jusqu'à stabilisation du compteur `NoDescription`.

## Export backlog descriptions manquantes

```powershell
cd "c:\Users\33623\Documents\___Projets\AI\Reseaux d'acteurs"
& "c:/Users/33623/Documents/___Projets/AI/Reseaux d'acteurs/.venv/Scripts/python.exe" "analyses/export_missing_descriptions.py"
```

Sortie : `exports/entreprises_sans_description.csv`

## Normalisation Pays (Post-Import)

Mappings conseillés :

```text
United States -> États-Unis
United Kingdom -> Royaume-Uni
China -> Chine
Germany -> Allemagne
Sweden -> Suède
South Korea / S. Korea -> Corée du Sud
United Arab Emirates -> Émirats arabes unis
```

## Backup obligatoire avant fusion/dédoublonnage

Toujours créer une copie de la base avant toute suppression/fusion :

```powershell
Copy-Item database.db "database.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
```
