Set-Location "c:\Users\33623\Documents\___Projets\AI\Reseaux d'acteurs"

$partnershipIds = @(66,35,67,70,68,71,69)
$src = "Texte utilisateur fourni le 2026-07-22 (partenariats strategiques Anthropic)"

# 1) Normaliser les pays
$countryUpdates = @(
  @{ id = 2; country = 'États-Unis' },
  @{ id = 9; country = 'États-Unis' },
  @{ id = 4; country = 'États-Unis' },
  @{ id = 53; country = 'États-Unis' },
  @{ id = 5; country = 'États-Unis' },
  @{ id = 159; country = 'États-Unis' },
  @{ id = 1554; country = 'États-Unis' },
  @{ id = 1555; country = 'Corée du Sud' }
)

foreach ($u in $countryUpdates) {
  $e = Invoke-RestMethod -Uri ("http://localhost:3000/api/enterprises/{0}" -f $u.id) -Method Get
  $body = [ordered]@{
    name = $e.name
    sector = $e.sector
    country = $u.country
    headquarter_city = $e.headquarter_city
    founded_year = $e.founded_year
    description = $e.description
    website = $e.website
    logo_url = $e.logo_url
    capitalization = $e.capitalization
    funds_raised = $e.funds_raised
    employees_count = $e.employees_count
    main_investors = $e.main_investors
    is_validated = [bool]$e.is_validated
  }
  Invoke-RestMethod -Uri ("http://localhost:3000/api/enterprises/{0}" -f $u.id) -Method Put -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 8) | Out-Null
  Write-Output ("COUNTRY_UPDATED|{0}|{1}|{2}" -f $e.id, $e.name, $u.country)
}

# 2) Mettre à jour partenariats: validés + champ infra_commitment_text
$parts = Invoke-RestMethod -Uri "http://localhost:3000/api/partnerships" -Method Get

foreach ($pid in $partnershipIds) {
  $p = $parts | Where-Object { $_.id -eq $pid } | Select-Object -First 1
  if (-not $p) {
    Write-Output ("PART_NOT_FOUND|{0}" -f $pid)
    continue
  }

  $infraText = $null
  switch ($p.id) {
    66 { $infraText = "Engagement cloud AWS >100 Md$ sur 10 ans (Anthropic), avec extension d'investissement Amazon annoncée en 2026." }
    35 { $infraText = "Engagement d'infrastructure TPU estimé à ~200 Md$ sur 5 ans (écosystème Google Cloud/Broadcom)." }
    67 { $infraText = "Fourniture de capacité TPU de nouvelle génération avec objectif jusqu'à 5 GW de puissance de calcul." }
    70 { $infraText = "Distribution Claude via Vertex AI + engagements d'infrastructure TPU à grande échelle avec Google." }
    68 { $infraText = "Capacité de calcul Azure estimée à ~30 Md$ avec accès à des clusters Nvidia GPU." }
    71 { $infraText = "Partenariat orienté investissement (100 M$) et co-développement LLM telco; engagement infra non chiffré publiquement." }
    69 { $infraText = "Accès infrastructurel Colossus 1/2 (>220 000 GPU Nvidia H100), montant financier non divulgué." }
    default { $infraText = "" }
  }

  $bodyP = [ordered]@{
    enterprise1_id = $p.enterprise1_id
    enterprise2_id = $p.enterprise2_id
    partnership_type = $p.partnership_type
    description = $p.description
    start_date = $p.start_date
    status = $p.status
    sources_information = if ($p.sources_information) { $p.sources_information } else { $src }
    infra_commitment_text = $infraText
    value_millions = $p.value_millions
    is_validated = $true
  }

  Invoke-RestMethod -Uri ("http://localhost:3000/api/partnerships/{0}" -f $p.id) -Method Put -ContentType "application/json" -Body ($bodyP | ConvertTo-Json -Depth 8) | Out-Null
  Write-Output ("PART_UPDATED_VALIDATED|{0}|{1}|{2}" -f $p.id, $p.enterprise1_name, $p.enterprise2_name)
}

# 3) Vérification synthétique
$anthParts = Invoke-RestMethod -Uri "http://localhost:3000/api/enterprises/2/partnerships" -Method Get
Write-Output ("ANTHROPIC_TOTAL|{0}" -f (($anthParts | Measure-Object).Count))
$anthParts | Sort-Object partner_name | ForEach-Object {
  Write-Output ("ANTHROPIC_PART|{0}|{1}|validated:{2}|type:{3}|infra:{4}" -f $_.id, $_.partner_name, $_.is_validated, $_.partnership_type, $_.infra_commitment_text)
}
