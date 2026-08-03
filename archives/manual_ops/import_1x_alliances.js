const baseUrl = 'http://localhost:3000';

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} ${JSON.stringify(data)}`);
  }
  return data;
}

async function getEnterpriseByName(name) {
  const options = await api('/api/enterprises/options');
  return options.find((e) => e.name === name) || null;
}

async function ensureEnterprise({
  name,
  sector,
  country,
  headquarter_city,
  founded_year,
  description,
  website,
  funds_raised,
  main_investors
}) {
  const existing = await getEnterpriseByName(name);

  if (existing) {
    const current = await api(`/api/enterprises/${existing.id}`);
    const body = {
      name: current.name,
      sector: sector ?? current.sector,
      country: country ?? current.country,
      headquarter_city: headquarter_city ?? current.headquarter_city,
      founded_year: founded_year ?? current.founded_year,
      description: description ?? current.description,
      website: website ?? current.website,
      logo_url: current.logo_url,
      capitalization: current.capitalization,
      funds_raised: funds_raised ?? current.funds_raised,
      employees_count: current.employees_count,
      main_investors: main_investors ?? current.main_investors,
      is_validated: Boolean(current.is_validated)
    };
    await api(`/api/enterprises/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body)
    });
    console.log(`UPDATED_ENTERPRISE|${existing.id}|${name}`);
    return existing.id;
  }

  const created = await api('/api/enterprises', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      name,
      sector: sector ?? null,
      country: country ?? null,
      headquarter_city: headquarter_city ?? null,
      founded_year: founded_year ?? null,
      description: description ?? null,
      website: website ?? null,
      logo_url: null,
      capitalization: null,
      funds_raised: funds_raised ?? null,
      employees_count: null,
      main_investors: main_investors ?? null,
      is_validated: false
    })
  });
  console.log(`CREATED_ENTERPRISE|${created.id}|${name}`);
  return created.id;
}

async function upsertPartnership({
  focalId,
  partnerId,
  partnership_type,
  description,
  start_date,
  sources_information,
  value_millions,
  infra_commitment_text
}) {
  const all = await api('/api/partnerships?segment=validated&page=1&limit=1000');
  const allPending = await api('/api/partnerships?segment=pending&page=1&limit=1000');
  const partnerships = [...(all.items || []), ...(allPending.items || [])];

  const existing = partnerships.find(
    (p) =>
      (p.enterprise1_id === focalId && p.enterprise2_id === partnerId) ||
      (p.enterprise1_id === partnerId && p.enterprise2_id === focalId)
  );

  const body = {
    enterprise1_id: focalId,
    enterprise2_id: partnerId,
    partnership_type,
    description,
    start_date,
    status: 'active',
    sources_information,
    infra_commitment_text: infra_commitment_text ?? null,
    value_millions: value_millions ?? null,
    is_validated: false
  };

  if (existing) {
    await api(`/api/partnerships/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body)
    });
    console.log(`UPDATED_PARTNERSHIP|${existing.id}|${focalId}|${partnerId}`);
    return existing.id;
  }

  const created = await api('/api/partnerships', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  });
  console.log(`CREATED_PARTNERSHIP|${created.id}|${focalId}|${partnerId}`);
  return created.id;
}

async function main() {
  const oneX = await getEnterpriseByName('1X Technologies');
  if (!oneX) {
    throw new Error('1X Technologies introuvable en base');
  }

  const source = 'https://en.wikipedia.org/wiki/1X_Technologies';

  const openAiStartupFundId = await ensureEnterprise({
    name: 'OpenAI Startup Fund',
    sector: 'Capital-risque et IA',
    country: 'États-Unis',
    description: "Fonds d'investissement lié à OpenAI, actif dans le financement de startups IA.",
    website: 'https://openai.fund'
  });

  const eqtVenturesId = await ensureEnterprise({
    name: 'EQT Ventures',
    sector: 'Capital-risque',
    country: 'Suède',
    description: "Fonds de capital-risque européen (EQT) investissant dans des startups technologiques.",
    website: 'https://eqtventures.com'
  });

  const samsungNextId = await ensureEnterprise({
    name: 'Samsung NEXT',
    sector: 'Investissement et innovation technologique',
    country: 'États-Unis',
    description: "Branche d'investissement/innovation de Samsung, orientée startups et technologies émergentes.",
    website: 'https://www.samsungnext.com'
  });

  await upsertPartnership({
    focalId: oneX.id,
    partnerId: openAiStartupFundId,
    partnership_type: 'Investissement',
    start_date: '2023-03-01',
    value_millions: 23.5,
    description:
      "Alliance stratégique via financement Series A2 (23,5 M$) menée par OpenAI Startup Fund en mars 2023, soutenant l'accélération des robots humanoïdes de 1X.",
    sources_information: source
  });

  await upsertPartnership({
    focalId: oneX.id,
    partnerId: eqtVenturesId,
    partnership_type: 'Investissement',
    start_date: '2024-01-01',
    value_millions: 100,
    description:
      "Alliance stratégique via financement Series B (100 M$) mené par EQT Ventures en janvier 2024 pour l'industrialisation des robots humanoïdes 1X.",
    sources_information: source
  });

  await upsertPartnership({
    focalId: oneX.id,
    partnerId: samsungNextId,
    partnership_type: 'Investissement',
    start_date: '2024-01-01',
    value_millions: null,
    description:
      "Participation stratégique de Samsung NEXT au tour Series B de 1X (janvier 2024), renforçant l'écosystème industriel et go-to-market autour des humanoïdes.",
    sources_information: source
  });

  const oneXParts = await api(`/api/enterprises/${oneX.id}/partnerships`);
  console.log(`ONEX_PARTNERSHIPS_TOTAL|${oneXParts.length}`);
  for (const p of oneXParts.sort((a, b) => (a.partner_name || '').localeCompare(b.partner_name || ''))) {
    console.log(`ONEX_PART|${p.id}|${p.partner_name}|${p.partnership_type}|${p.start_date}|${p.value_millions ?? ''}`);
  }
}

main().catch((err) => {
  console.error('ERROR', err.message);
  process.exit(1);
});
