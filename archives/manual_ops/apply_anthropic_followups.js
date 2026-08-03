const baseUrl = 'http://localhost:3000';

async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} - ${JSON.stringify(data)}`);
  }
  return data;
}

async function getEnterprise(id) {
  return getJson(`${baseUrl}/api/enterprises/${id}`);
}

async function updateEnterpriseCountry(id, country) {
  const e = await getEnterprise(id);
  const body = {
    name: e.name,
    sector: e.sector,
    country,
    headquarter_city: e.headquarter_city,
    founded_year: e.founded_year,
    description: e.description,
    website: e.website,
    logo_url: e.logo_url,
    capitalization: e.capitalization,
    funds_raised: e.funds_raised,
    employees_count: e.employees_count,
    main_investors: e.main_investors,
    is_validated: Boolean(e.is_validated)
  };

  await getJson(`${baseUrl}/api/enterprises/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  console.log(`COUNTRY_UPDATED|${id}|${e.name}|${country}`);
}

async function main() {
  const countryUpdates = [
    { id: 2, country: 'États-Unis' },
    { id: 9, country: 'États-Unis' },
    { id: 4, country: 'États-Unis' },
    { id: 53, country: 'États-Unis' },
    { id: 5, country: 'États-Unis' },
    { id: 159, country: 'États-Unis' },
    { id: 1554, country: 'États-Unis' },
    { id: 1555, country: 'Corée du Sud' }
  ];

  for (const item of countryUpdates) {
    await updateEnterpriseCountry(item.id, item.country);
  }

  const partnershipIds = [66, 35, 67, 70, 68, 71, 69];
  const infraById = {
    66: "Engagement cloud AWS >100 Md$ sur 10 ans (Anthropic), avec extension d'investissement Amazon annoncée en 2026.",
    35: "Engagement d'infrastructure TPU estimé à ~200 Md$ sur 5 ans (écosystème Google Cloud/Broadcom).",
    67: "Fourniture de capacité TPU de nouvelle génération avec objectif jusqu'à 5 GW de puissance de calcul.",
    70: "Distribution Claude via Vertex AI + engagements d'infrastructure TPU à grande échelle avec Google.",
    68: "Capacité de calcul Azure estimée à ~30 Md$ avec accès à des clusters Nvidia GPU.",
    71: "Partenariat orienté investissement (100 M$) et co-développement LLM telco; engagement infra non chiffré publiquement.",
    69: "Accès infrastructurel Colossus 1/2 (>220 000 GPU Nvidia H100), montant financier non divulgué."
  };

  const src = 'Texte utilisateur fourni le 2026-07-22 (partenariats strategiques Anthropic)';

  const partnerships = await getJson(`${baseUrl}/api/partnerships`);

  for (const partnershipId of partnershipIds) {
    const p = partnerships.find((x) => x.id === partnershipId);
    if (!p) {
      console.log(`PART_NOT_FOUND|${partnershipId}`);
      continue;
    }

    const body = {
      enterprise1_id: p.enterprise1_id,
      enterprise2_id: p.enterprise2_id,
      partnership_type: p.partnership_type,
      description: p.description,
      start_date: p.start_date,
      status: p.status || 'active',
      sources_information: p.sources_information || src,
      infra_commitment_text: infraById[partnershipId] || null,
      value_millions: p.value_millions ?? null,
      is_validated: true
    };

    await getJson(`${baseUrl}/api/partnerships/${partnershipId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    console.log(`PART_UPDATED_VALIDATED|${partnershipId}|${p.enterprise1_name}|${p.enterprise2_name}`);
  }

  const anthropicPartnerships = await getJson(`${baseUrl}/api/enterprises/2/partnerships`);
  console.log(`ANTHROPIC_TOTAL|${anthropicPartnerships.length}`);
  for (const p of anthropicPartnerships.sort((a, b) => (a.partner_name || '').localeCompare(b.partner_name || ''))) {
    console.log(`ANTHROPIC_PART|${p.id}|${p.partner_name}|validated:${p.is_validated}|type:${p.partnership_type}|infra:${p.infra_commitment_text || ''}`);
  }
}

main().catch((error) => {
  console.error('ERROR', error);
  process.exit(1);
});
