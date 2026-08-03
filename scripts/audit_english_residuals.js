async function run() {
  const re = /[\u00C0-\u017F]|\b(plateforme|gestion|donnees|données|entreprise|partenariat|partenariats|strategique|stratégique|principaux|principales|autres|fonds|leve|levés|milliards?)\b/i;
  let page = 1;
  let totalPages = 1;
  let total = 0;
  let residual = 0;
  const samples = [];

  while (page <= totalPages) {
    const response = await fetch(`http://localhost:3000/api/enterprises?segment=all&page=${page}&limit=100`);
    const payload = await response.json();

    totalPages = payload.pagination?.totalPages || 1;
    for (const e of payload.items || []) {
      total += 1;
      const text = [
        e.country,
        e.sector,
        e.description,
        e.main_investors,
        e.main_competitors,
        e.main_acquisitions,
        e.strategic_partnerships
      ].filter(Boolean).join(' | ');

      if (re.test(text)) {
        residual += 1;
        if (samples.length < 20) {
          samples.push({
            id: e.id,
            name: e.name,
            country: e.country,
            sector: e.sector
          });
        }
      }
    }

    page += 1;
  }

  console.log(JSON.stringify({ total, residual, samples }, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
