Set-Location "c:\Users\33623\Documents\___Projets\AI\Reseaux d'acteurs"

function Get-EnterpriseById([int]$id) {
  Invoke-RestMethod -Uri ("http://localhost:3000/api/enterprises/{0}" -f $id) -Method Get
}

function Update-Enterprise([int]$id, $patch) {
  $current = Get-EnterpriseById $id
  $body = [ordered]@{
    name = $current.name
    sector = $current.sector
    country = $current.country
    headquarter_city = $current.headquarter_city
    founded_year = $current.founded_year
    description = $current.description
    website = $current.website
    logo_url = $current.logo_url
    capitalization = $current.capitalization
    funds_raised = $current.funds_raised
    employees_count = $current.employees_count
    main_investors = $current.main_investors
    is_validated = [bool]($current.is_validated)
  }

  foreach ($k in $patch.Keys) {
    $body[$k] = $patch[$k]
  }

  $json = $body | ConvertTo-Json -Depth 8
  Invoke-RestMethod -Uri ("http://localhost:3000/api/enterprises/{0}" -f $id) -Method Put -ContentType "application/json" -Body $json | Out-Null
  Write-Output ("UPDATED_ENTERPRISE|{0}|{1}" -f $id, $body.name)
}

function Ensure-Enterprise($name, $payload) {
  $opts = Invoke-RestMethod -Uri "http://localhost:3000/api/enterprises/options" -Method Get
  $existing = $opts | Where-Object { $_.name -eq $name } | Select-Object -First 1

  if ($existing) {
    Write-Output ("EXISTS_ENTERPRISE|{0}|{1}" -f $existing.id, $name)
    Update-Enterprise -id $existing.id -patch $payload
    return $existing.id
  }

  $createBody = [ordered]@{
    name = $name
    sector = $payload.sector
    country = $payload.country
    headquarter_city = $payload.headquarter_city
    founded_year = $payload.founded_year
    description = $payload.description
    website = $payload.website
    logo_url = $null
    capitalization = $null
    funds_raised = $payload.funds_raised
    employees_count = $payload.employees_count
    main_investors = $payload.main_investors
    is_validated = $false
  }

  $created = Invoke-RestMethod -Uri "http://localhost:3000/api/enterprises" -Method Post -ContentType "application/json" -Body ($createBody | ConvertTo-Json -Depth 8)
  Write-Output ("CREATED_ENTERPRISE|{0}|{1}" -f $created.id, $name)
  return $created.id
}

function Get-PartnershipByPair([int]$a, [int]$b) {
  $parts = Invoke-RestMethod -Uri "http://localhost:3000/api/partnerships" -Method Get
  $parts | Where-Object { ($_.enterprise1_id -eq $a -and $_.enterprise2_id -eq $b) -or ($_.enterprise1_id -eq $b -and $_.enterprise2_id -eq $a) } | Select-Object -First 1
}

function Upsert-Partnership([int]$focalId, [int]$partnerId, [string]$ptype, [string]$startDate, [Nullable[Double]]$valueMillions, [string]$description, [string]$sources) {
  $existing = Get-PartnershipByPair -a $focalId -b $partnerId
  $body = [ordered]@{
    enterprise1_id = $focalId
    enterprise2_id = $partnerId
    partnership_type = $ptype
    description = $description
    start_date = $startDate
    status = "active"
    sources_information = $sources
    value_millions = $valueMillions
    is_validated = $false
  }

  if ($existing) {
    Invoke-RestMethod -Uri ("http://localhost:3000/api/partnerships/{0}" -f $existing.id) -Method Put -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 8) | Out-Null
    Write-Output ("UPDATED_PARTNERSHIP|{0}|{1}|{2}" -f $existing.id, $focalId, $partnerId)
  }
  else {
    $created = Invoke-RestMethod -Uri "http://localhost:3000/api/partnerships" -Method Post -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 8)
    Write-Output ("CREATED_PARTNERSHIP|{0}|{1}|{2}" -f $created.id, $focalId, $partnerId)
  }
}

$anthropicId = 2
$awsId = 9
$googleId = 4
$broadcomId = 53
$microsoftId = 5
$spacexId = 159

$googleCloudId = Ensure-Enterprise -name "Google Cloud" -payload @{
  sector = "Cloud et IA"
  country = "Etats-Unis"
  headquarter_city = ""
  founded_year = $null
  description = "Plateforme cloud de Google. Dans le partenariat avec Anthropic, Google Cloud distribue Claude via Vertex AI et fournit l'infrastructure TPU avec Broadcom."
  website = "https://cloud.google.com"
  funds_raised = ""
  employees_count = $null
  main_investors = ""
}

$sktId = Ensure-Enterprise -name "SK Telecom" -payload @{
  sector = "Telecommunications et IA"
  country = "Coree du Sud"
  headquarter_city = ""
  founded_year = $null
  description = "Operateur telecom partenaire d'Anthropic depuis aout 2023 pour co-developper un LLM multilingue oriente telecom et services clients."
  website = "https://www.sktelecom.com"
  funds_raised = ""
  employees_count = $null
  main_investors = ""
}

Update-Enterprise -id $anthropicId -patch @{
  sector = "LLM et IA generative"
  country = "Etats-Unis"
  description = "Societe d'IA generative (famille de modeles Claude). Strategie multi-cloud (AWS, Google Cloud, Azure) et diversification hardware (Nvidia GPU, Amazon Trainium, Google/Broadcom TPU)."
  funds_raised = "~13 Md$ Amazon + ~12-13 Md$ Google + 100 M$ SK Telecom + ~30 Md$ de capacite Azure (partenariats et engagements annonces)."
  main_investors = "Amazon, Google, SK Telecom"
}

Update-Enterprise -id $awsId -patch @{
  sector = "Cloud et IA"
  country = "Etats-Unis"
  description = "Partenaire cloud principal d'Anthropic pour l'entrainement et le deploiement de Claude via AWS, Bedrock et puces Trainium/Graviton."
}

Update-Enterprise -id $googleId -patch @{
  description = "Partenaire strategique d'Anthropic via Google Cloud: investissement direct et distribution de Claude dans Vertex AI."
}

Update-Enterprise -id $broadcomId -patch @{
  sector = "Semiconducteurs et infrastructure IA"
  description = "Partenaire infrastructurel dans l'ecosysteme Anthropic avec Google Cloud pour la fourniture de capacite TPU a grande echelle."
}

Update-Enterprise -id $microsoftId -patch @{
  description = "Partenaire d'Anthropic pour rendre Claude accessible sur Azure Foundry avec capacite de calcul GPU Nvidia sur Azure."
}

Update-Enterprise -id $spacexId -patch @{
  sector = "Spatial, infrastructure et IA"
  description = "Partenaire infrastructurel d'Anthropic via un accord d'acces aux supercalculateurs Colossus (xAI) pour capacite GPU Nvidia H100."
}

$src = "Texte utilisateur fourni le 2026-07-22 (partenariats strategiques Anthropic)"

Upsert-Partnership -focalId $anthropicId -partnerId $awsId -ptype "Partenariat Technologique" -startDate "2023-09-01" -valueMillions 13000 -description "Partenariat AWS lance en septembre 2023, extension majeure avril 2026. Environ 13 Md$ d'investissements directs Amazon dans Anthropic (2023-2026) et engagement de plus de 100 Md$ d'achats cloud AWS sur 10 ans. AWS est le fournisseur cloud principal d'Anthropic (entrainement/deploiement Claude), avec usage de Trainium2/3/4, Graviton et integration commerciale de Claude dans Amazon Bedrock." -sources $src

Upsert-Partnership -focalId $anthropicId -partnerId $googleId -ptype "Partenariat Technologique" -startDate "2023-02-01" -valueMillions 12500 -description "Partenariat Google/Google Cloud demarre en fevrier 2023, extension majeure avril 2026. Environ 12-13 Md$ d'investissements Google dans Anthropic (promesse potentielle plus large mentionnee) et engagement total d'infrastructure estime a ~200 Md$ sur 5 ans. Distribution de Claude dans Vertex AI et fourniture de puissance TPU de nouvelle generation." -sources $src

Upsert-Partnership -focalId $anthropicId -partnerId $broadcomId -ptype "Partenariat Technologique" -startDate "2026-04-01" -valueMillions $null -description "Partenariat infrastructurel dans le cadre Google Cloud/Broadcom pour Anthropic: fourniture de capacite TPU de nouvelle generation, avec objectif de monter jusqu'a 5 GW de puissance de calcul pour l'entrainement et l'inference de Claude." -sources $src

Upsert-Partnership -focalId $anthropicId -partnerId $googleCloudId -ptype "Partenariat Technologique" -startDate "2023-02-01" -valueMillions $null -description "Google Cloud est le canal de distribution et d'hebergement de Claude via Vertex AI. Le partenariat inclut des engagements d'infrastructure TPU et l'industrialisation multi-cloud d'Anthropic." -sources $src

Upsert-Partnership -focalId $anthropicId -partnerId $sktId -ptype "Investissement" -startDate "2023-08-01" -valueMillions 100 -description "Partenariat SK Telecom lance en aout 2023 avec investissement de 100 M$. Co-developpement d'un LLM multilingue pour le secteur telecom (coreen, anglais, japonais, espagnol) et automatisation service client/chatbots/reseau via la Global Telco AI Alliance." -sources $src

Upsert-Partnership -focalId $anthropicId -partnerId $microsoftId -ptype "Partenariat Technologique" -startDate "2025-12-01" -valueMillions 30000 -description "Partenariat fin 2025/debut 2026 pour rendre Claude accessible sur Microsoft Azure Foundry. Capacite de calcul annoncee ~30 Md$ sur Azure, avec acces a de larges clusters Nvidia GPU." -sources $src

Upsert-Partnership -focalId $anthropicId -partnerId $spacexId -ptype "Partenariat Technologique" -startDate "2026-01-01" -valueMillions $null -description "Accord infrastructurel debut 2026: acces de calcul pour Anthropic sur Colossus 1 et Colossus 2 (ecosysteme xAI/SpaceX), representant plus de 220 000 GPU Nvidia H100. Montant financier non divulgue." -sources $src

$parts = Invoke-RestMethod -Uri "http://localhost:3000/api/enterprises/2/partnerships" -Method Get
Write-Output ("ANTHROPIC_PARTNERSHIPS_TOTAL|{0}" -f (($parts | Measure-Object).Count))
$parts | Sort-Object partner_name | ForEach-Object { Write-Output ("ANTHROPIC_PART|{0}|{1}|{2}|{3}|{4}" -f $_.id, $_.partner_name, $_.partnership_type, $_.start_date, $_.value_millions) }
