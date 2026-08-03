const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const APPLY = process.argv.includes('--apply');
const DB_PATH = path.join(__dirname, '..', 'database.db');
const SOURCE_URL = 'https://sifted.eu/rankings/ai-100-2025';

const CHUNK_1 = `
{"rank":1,"company":"CuspAI","website":"https://www.cuspai.com/","city":"Cambridge","country":"UK","founded":2024,"stage":"Series A","lastRoundSize":92000000,"totalFunding":119600000}
{"rank":2,"company":"PhysicsX","website":"https://www.physicsx.ai/","city":"London","country":"UK","founded":2019,"stage":"Series B","lastRoundSize":124200000,"totalFunding":153600000}
{"rank":3,"company":"NEURA Robotics","website":"https://neura-robotics.com/","city":"Metzingen","country":"Germany","founded":2019,"stage":"Series B","lastRoundSize":120000000,"totalFunding":185000000}
{"rank":4,"company":"Black Forest Labs","website":"http://blackforestlabs.ai","city":"Freiburg","country":"Germany","founded":2024,"stage":"Seed","lastRoundSize":28500000,"totalFunding":28500000}
{"rank":5,"company":"Cradle","website":"https://www.cradle.bio","city":"Zurich","country":"Switzerland","founded":2021,"stage":"Series B","lastRoundSize":67200000,"totalFunding":94800000}
{"rank":6,"company":"PolyAI","website":"https://poly.ai","city":"London","country":"UK","founded":2018,"stage":"Series C","lastRoundSize":46000000,"totalFunding":108900000}
{"rank":7,"company":"Multiverse Computing","website":"https://multiversecomputing.com/","city":"San Sebastian","country":"Spain","founded":2021,"stage":"Series B","lastRoundSize":189000000,"totalFunding":310000000}
{"rank":8,"company":"Legora","website":"https://legora.com","city":"Stockholm","country":"Sweden","founded":2023,"stage":"Series B","lastRoundSize":73600000,"totalFunding":105800000}
{"rank":9,"company":"Fyxer","website":"https://www.fyxer.com","city":"London","country":"UK","founded":2023,"stage":"Series B","lastRoundSize":27600000,"totalFunding":37300000}
{"rank":10,"company":"Granola","website":"https://www.granola.ai/","city":"London","country":"UK","founded":2023,"stage":"Series B","lastRoundSize":39600000,"totalFunding":66200000}
{"rank":11,"company":"Harmattan AI","website":"https://harmattan.ai/","city":"Paris","country":"France","founded":2024,"stage":"Seed","lastRoundSize":25500000,"totalFunding":25500000}
{"rank":12,"company":"H Company","website":"https://www.hcompany.ai/","city":"Paris","country":"France","founded":2024,"stage":"Seed","lastRoundSize":202400000,"totalFunding":202400000}
{"rank":13,"company":"Encord","website":"https://www.encord.com","city":"London","country":"UK","founded":2020,"stage":"Series B","lastRoundSize":27600000,"totalFunding":43300000}
{"rank":14,"company":"Peec AI","website":"https://peec.ai/","city":"Berlin","country":"Germany","founded":2025,"stage":"Series A","lastRoundSize":18000000,"totalFunding":25100000}
{"rank":15,"company":"Wordsmith AI","website":"https://www.wordsmith.ai/","city":"Edinburgh","country":"UK","founded":2024,"stage":"Series A","lastRoundSize":23000000,"totalFunding":27600000}
{"rank":16,"company":"Nabla","website":"https://www.nabla.com/","city":"Paris","country":"France","founded":2018,"stage":"Series C","lastRoundSize":64400000,"totalFunding":103700000}
{"rank":17,"company":"FlexAI","website":"https://www.flex.ai/","city":"Paris","country":"France","founded":2023,"stage":"Seed","lastRoundSize":27600000,"totalFunding":27600000}
{"rank":18,"company":"ARX Robotics","website":"https://arx-robotics.com","city":"Munich","country":"Germany","founded":2022,"stage":"Series A","lastRoundSize":42000000,"totalFunding":48800000}
{"rank":19,"company":"Basecamp Research","website":"https://basecamp-research.com/","city":"London","country":"UK","founded":2019,"stage":"Series B","lastRoundSize":55200000,"totalFunding":73600000}
{"rank":20,"company":"Tessl","website":"https://www.tessl.io/","city":"London","country":"UK","founded":2024,"stage":"Series A","lastRoundSize":92000000,"totalFunding":115000000}
{"rank":21,"company":"Tacto","website":"https://www.tacto.ai/","city":"Munich","country":"Germany","founded":2020,"stage":"Series A","lastRoundSize":50000000,"totalFunding":56000000}
{"rank":22,"company":"Photoroom","website":"https://photoroom.com/","city":"Paris","country":"France","founded":2019,"stage":"Series B","lastRoundSize":39600000,"totalFunding":58300000}
{"rank":23,"company":"Tandem Health","website":"https://www.tandemhealth.ai/","city":"Stockholm","country":"Sweden","founded":2023,"stage":"Series A","lastRoundSize":46000000,"totalFunding":54700000}
{"rank":24,"company":"Light","website":"http://light.inc/","city":"London","country":"UK","founded":2022,"stage":"Series A","lastRoundSize":27600000,"totalFunding":39600000}
{"rank":25,"company":"Bioptimus","website":"https://www.bioptimus.com/","city":"Paris","country":"France","founded":2023,"stage":"Series A","lastRoundSize":37700000,"totalFunding":69900000}
`;

const CHUNK_2 = `
{"rank":26,"company":"Sereact","website":"https://sereact.ai","city":"Stuttgart","country":"Germany","founded":2021,"stage":"Series A","lastRoundSize":25000000,"totalFunding":29900000}
{"rank":27,"company":"Axelera AI","website":"https://www.axelera.ai/","city":"Eindhoven","country":"Netherlands","founded":2021,"stage":"Series B","lastRoundSize":62600000,"totalFunding":184500000}
{"rank":28,"company":"Salience Labs","website":"http://saliencelabs.ai","city":"Oxford","country":"UK","founded":2021,"stage":"Series A","lastRoundSize":33100000,"totalFunding":47400000}
{"rank":29,"company":"Dust","website":"https://dust.tt","city":"Paris","country":"France","founded":2023,"stage":"Series A","lastRoundSize":14700000,"totalFunding":20200000}
{"rank":30,"company":"Omnea","website":"https://www.omnea.co","city":"London","country":"UK","founded":2022,"stage":"Series B","lastRoundSize":46000000,"totalFunding":69000000}
{"rank":31,"company":"Humanoid","website":"https://thehumanoid.ai/","city":"London","country":"UK","founded":2024,"stage":"Bootstrapped","lastRoundSize":0,"totalFunding":0}
{"rank":32,"company":"Magentic","website":"https://www.magentic.com","city":"London","country":"UK","founded":2025,"stage":"Seed","lastRoundSize":5100000,"totalFunding":5100000}
{"rank":33,"company":"Plancraft","website":"https://www.plancraft.de","city":"Hamburg","country":"Germany","founded":2020,"stage":"Series B","lastRoundSize":38000000,"totalFunding":52700000}
{"rank":34,"company":"Xelix","website":"https://xelix.com/","city":"London","country":"UK","founded":2018,"stage":"Series B","lastRoundSize":137000000,"totalFunding":151800000}
{"rank":35,"company":"Emmi AI","website":"https://www.emmi.ai/","city":"Linz","country":"Austria","founded":2024,"stage":"Seed","lastRoundSize":15000000,"totalFunding":15000000}
{"rank":36,"company":"Supersonik","website":"https://www.supersonik.ai","city":"Barcelona","country":"Spain","founded":2025,"stage":"Seed","lastRoundSize":4600000,"totalFunding":4600000}
{"rank":37,"company":"Destinus","website":"https://destinus.com","city":"Hengelo","country":"Netherlands","founded":2021,"stage":"Seed","lastRoundSize":26700000,"totalFunding":53700000}
{"rank":38,"company":"Cortea AI","website":"Cortea.ai","city":"Berlin","country":"Germany","founded":2024,"stage":"Pre-seed","lastRoundSize":3000000,"totalFunding":2800000}
{"rank":39,"company":"Delian Alliance Industries","website":"https://delian.ai/","city":"Athens","country":"Greece","founded":2021,"stage":"Series A","lastRoundSize":12900000,"totalFunding":19000000}
{"rank":40,"company":"Murphy","website":"https://getmurphy.ai/","city":"Barcelona","country":"Spain","founded":2024,"stage":"Seed","lastRoundSize":12800000,"totalFunding":13800000}
{"rank":41,"company":"Arondite","website":"https://www.arondite.com","city":"London","country":"UK","founded":2018,"stage":"Seed","lastRoundSize":11000000,"totalFunding":11300000}
{"rank":42,"company":"Dottxt","website":"https://dottxt.co/","city":"Paris","country":"France","founded":2023,"stage":"Seed","lastRoundSize":8000000,"totalFunding":13400000}
{"rank":43,"company":"Langfuse","website":"https://www.langfuse.com","city":"Berlin","country":"Germany","founded":2023,"stage":"Seed","lastRoundSize":3700000,"totalFunding":3700000}
{"rank":44,"company":"Taktile","website":"http://taktile.com","city":"Berlin","country":"Germany","founded":2020,"stage":"Series B","lastRoundSize":49700000,"totalFunding":72400000}
{"rank":45,"company":"Oriole Networks","website":"https://www.oriolenetworks.com","city":"London","country":"UK","founded":2023,"stage":"Series A","lastRoundSize":20200000,"totalFunding":46000000}
{"rank":46,"company":"Memories.ai","website":"https://memories.ai/","city":"Cambridge","country":"UK","founded":2025,"stage":"Seed","lastRoundSize":7400000,"totalFunding":7400000}
{"rank":47,"company":"Solve Intelligence","website":"solveintelligence.com","city":"London","country":"UK","founded":2023,"stage":"Series A","lastRoundSize":11000000,"totalFunding":13800000}
{"rank":48,"company":"Orbem","website":"https://orbem.ai/","city":"Munich","country":"Germany","founded":2019,"stage":"Series A","lastRoundSize":30000000,"totalFunding":37400000}
{"rank":49,"company":"Tracelight","website":"https://tracelight.ai/","city":"London","country":"UK","founded":2025,"stage":"Seed","lastRoundSize":3300000,"totalFunding":3300000}
{"rank":50,"company":"Comand AI","website":"https://www.comand.ai","city":"Paris","country":"France","founded":2023,"stage":"Seed","lastRoundSize":8700000,"totalFunding":11700000}
`;

const CHUNK_3 = `
{"rank":51,"company":"Monumental","website":"https://www.monumental.co","city":"Amsterdam","country":"Netherlands","founded":2021,"stage":"Series A","lastRoundSize":23000000,"totalFunding":23000000}
{"rank":52,"company":"Metaview","website":"https://www.metaview.ai","city":"London","country":"UK","founded":2018,"stage":"Series B","lastRoundSize":32200000,"totalFunding":45600000}
{"rank":53,"company":"VerticalCompute","website":"https://www.verticalcompute.com/","city":"Leuven","country":"Belgium","founded":2025,"stage":"Pre-seed","lastRoundSize":20000000,"totalFunding":23000000}
{"rank":54,"company":"Manex AI","website":"https://manex.ai","city":"Munich","country":"Germany","founded":2023,"stage":"Seed","lastRoundSize":8600000,"totalFunding":9200000}
{"rank":55,"company":"Jack & Jill","website":"https://www.jackandjill.ai","city":"London","country":"UK","founded":2024,"stage":"Seed","lastRoundSize":18400000,"totalFunding":18400000}
{"rank":56,"company":"Aqemia","website":"https://www.aqemia.com","city":"Paris","country":"France","founded":2019,"stage":"Series B","lastRoundSize":35000000,"totalFunding":114900000}
{"rank":57,"company":"Lupa","website":"https://lupapets.com/","city":"London","country":"UK","founded":2023,"stage":"Series A","lastRoundSize":18400000,"totalFunding":23000000}
{"rank":58,"company":"Fractile","website":"https://www.fractile.ai/","city":"London","country":"UK","founded":2023,"stage":"Seed","lastRoundSize":13800000,"totalFunding":23000000}
{"rank":59,"company":"Qdrant","website":"https://qdrant.tech/","city":"Berlin","country":"Germany","founded":2021,"stage":"Series A","lastRoundSize":25800000,"totalFunding":35600000}
{"rank":60,"company":"SpAItial","website":"https://www.spaitial.ai/","city":"London","country":"UK","founded":2024,"stage":"Seed","lastRoundSize":12000000,"totalFunding":12000000}
{"rank":61,"company":"Verda","website":"https://verda.com/","city":"Helsinki","country":"Finland","founded":2020,"stage":"Series A","lastRoundSize":55000000,"totalFunding":76500000}
{"rank":62,"company":"Deepset","website":"https://deepset.ai","city":"Berlin","country":"Germany","founded":2018,"stage":"Series B","lastRoundSize":27600000,"totalFunding":42000000}
{"rank":63,"company":"Project Q","website":"https://www.project-q.ai","city":"Munich","country":"Germany","founded":2023,"stage":"Seed","lastRoundSize":4600000,"totalFunding":7500000}
{"rank":64,"company":"Rerun","website":"https://rerun.io/","city":"Stockholm","country":"Sweden","founded":2022,"stage":"Seed","lastRoundSize":15600000,"totalFunding":18900000}
{"rank":65,"company":"Latent Labs","website":"https://www.latentlabs.com/","city":"London","country":"UK","founded":2023,"stage":"Series A","lastRoundSize":36800000,"totalFunding":46000000}
{"rank":66,"company":"Maki","website":"https://www.makipeople.com/","city":"Paris","country":"France","founded":2022,"stage":"Series A","lastRoundSize":23000000,"totalFunding":32200000}
{"rank":67,"company":"Paid","website":"https://www.paid.ai/","city":"London","country":"UK","founded":2025,"stage":"Seed","lastRoundSize":19900000,"totalFunding":30400000}
{"rank":68,"company":"sensmore","website":"https://www.sensmore.ai","city":"Berlin","country":"Germany","founded":2022,"stage":"Seed","lastRoundSize":6700000,"totalFunding":6700000}
{"rank":69,"company":"SiPearl","website":"https://www.sipearl.com/","city":"Paris","country":"France","founded":2019,"stage":"Series A","lastRoundSize":130000000,"totalFunding":138000000}
{"rank":70,"company":"Roofline","website":"https://www.roofline.ai","city":"Aachen","country":"Germany","founded":2024,"stage":"Pre-seed","lastRoundSize":2500000,"totalFunding":2500000}
{"rank":71,"company":"Synthesized","website":"http://synthesized.io/","city":"London","country":"UK","founded":2018,"stage":"Series A","lastRoundSize":18400000,"totalFunding":24100000}
{"rank":72,"company":"UnlikelyAI","website":"http://unlikely.ai","city":"London","country":"UK","founded":2018,"stage":"Seed","lastRoundSize":4600000,"totalFunding":23000000}
{"rank":73,"company":"Arago","website":"https://www.arago.inc/","city":"Paris","country":"France","founded":2024,"stage":"Seed","lastRoundSize":23900000,"totalFunding":23900000}
{"rank":74,"company":"Adaptive ML","website":"https://www.adaptive-ml.com/","city":"Paris","country":"France","founded":2024,"stage":"Seed","lastRoundSize":18300000,"totalFunding":18500000}
{"rank":75,"company":"Langdock","website":"https://www.langdock.com","city":"Berlin","country":"Germany","founded":2023,"stage":"Seed","lastRoundSize":2800000,"totalFunding":2800000}
`;

const CHUNK_4 = `
{"rank":76,"company":"Dash0","website":"http://dash0.com/","city":"Berlin","country":"Germany","founded":2023,"stage":"Series A","lastRoundSize":32200000,"totalFunding":40900000}
{"rank":77,"company":"Recycleye","website":"https://recycleye.com/","city":"London","country":"UK","founded":2019,"stage":"Series A","lastRoundSize":15600000,"totalFunding":23300000}
{"rank":78,"company":"Autone","website":"https://autone.io","city":"London","country":"UK","founded":2021,"stage":"Series A","lastRoundSize":15600000,"totalFunding":21400000}
{"rank":79,"company":"Fernride","website":"http://fernride.com","city":"Munich","country":"Germany","founded":2019,"stage":"Series A","lastRoundSize":16600000,"totalFunding":64200000}
{"rank":80,"company":"Weaviate","website":"http://weaviate.io","city":"Amsterdam","country":"Netherlands","founded":2019,"stage":"Series B","lastRoundSize":46000000,"totalFunding":62300000}
{"rank":81,"company":"Phoebe","website":"Phoebe.ai","city":"London","country":"UK","founded":2024,"stage":"Seed","lastRoundSize":15600000,"totalFunding":15600000}
{"rank":82,"company":"Juna AI","website":"https://www.juna.ai","city":"Berlin","country":"Germany","founded":2024,"stage":"Seed","lastRoundSize":6900000,"totalFunding":6900000}
{"rank":83,"company":"Orasio","website":"https://www.orasio.com","city":"Paris","country":"France","founded":2025,"stage":"Seed","lastRoundSize":16000000,"totalFunding":16200000}
{"rank":84,"company":"Ameba","website":"https://www.ameba.ai","city":"London","country":"UK","founded":2023,"stage":"Seed","lastRoundSize":6500000,"totalFunding":8100000}
{"rank":85,"company":"Duna","website":"https://www.duna.com","city":"Amsterdam","country":"Netherlands","founded":2023,"stage":"Seed","lastRoundSize":10700000,"totalFunding":10700000}
{"rank":86,"company":"Maisa","website":"https://maisa.ai","city":"Valencia","country":"Spain","founded":2024,"stage":"Seed","lastRoundSize":23000000,"totalFunding":30100000}
{"rank":87,"company":"Biorce","website":"https://www.biorce.com/home","city":"Barcelona","country":"Spain","founded":2024,"stage":"Series A","lastRoundSize":5000000,"totalFunding":8600000}
{"rank":88,"company":"V7","website":"https://www.v7labs.com","city":"London","country":"UK","founded":2018,"stage":"Series A","lastRoundSize":30400000,"totalFunding":46000000}
{"rank":89,"company":"Harmonic Security","website":"https://www.harmonic.security/","city":"London","country":"UK","founded":2023,"stage":"Series A","lastRoundSize":16100000,"totalFunding":23900000}
{"rank":90,"company":"Tl;dv","website":"http://tldv.io","city":"Aachen","country":"Germany","founded":2020,"stage":"Seed","lastRoundSize":4300000,"totalFunding":4700000}
{"rank":91,"company":"Voize","website":"https://www.voize.de","city":"Berlin","country":"Germany","founded":2020,"stage":"Seed","lastRoundSize":7700000,"totalFunding":7800000}
{"rank":92,"company":"Lumai","website":"https://lumai.ai","city":"Oxford","country":"UK","founded":2022,"stage":"Seed","lastRoundSize":9200000,"totalFunding":12700000}
{"rank":93,"company":"Sunrise Robotics","website":"https://www.sunriserobotics.co","city":"Ljubljana","country":"Slovenia","founded":2025,"stage":"Seed","lastRoundSize":7800000,"totalFunding":7800000}
{"rank":94,"company":"Flower Labs","website":"https://flower.ai/","city":"Hamburg","country":"Germany","founded":2020,"stage":"Series A","lastRoundSize":18400000,"totalFunding":21800000}
{"rank":95,"company":"Hadrian","website":"http://hadrian.io","city":"Amsterdam","country":"Netherlands","founded":2021,"stage":"Seed","lastRoundSize":10500000,"totalFunding":13200000}
{"rank":96,"company":"Orbital","website":"https://www.orbital.tech","city":"London","country":"UK","founded":2018,"stage":"Series A","lastRoundSize":8500000,"totalFunding":14500000}
{"rank":97,"company":"Otera","website":"https://www.deepopinion.ai/","city":"Innsbruck","country":"Austria","founded":2019,"stage":"Series A","lastRoundSize":11000000,"totalFunding":15600000}
{"rank":98,"company":"Blackshark.ai","website":"https://www.blackshark.ai","city":"Graz","country":"Austria","founded":2020,"stage":"Series A","lastRoundSize":13800000,"totalFunding":32200000}
{"rank":99,"company":"Doubleword","website":"https://www.doubleword.ai/","city":"London","country":"UK","founded":2021,"stage":"Series A","lastRoundSize":11000000,"totalFunding":13600000}
{"rank":100,"company":"Cakewalk","website":"getcakewalk.io","city":"Berlin","country":"Germany","founded":2023,"stage":"Seed","lastRoundSize":6900000,"totalFunding":11500000}
`;

function parseChunk(chunk) {
  return chunk
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function canonicalName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function done(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function toFundingString(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${(n / 1_000_000).toFixed(1)} million EUR`;
}

async function main() {
  const companies = [
    ...parseChunk(CHUNK_1),
    ...parseChunk(CHUNK_2),
    ...parseChunk(CHUNK_3),
    ...parseChunk(CHUNK_4)
  ].sort((a, b) => a.rank - b.rank);

  const db = new sqlite3.Database(DB_PATH);

  try {
    const existingRows = await all(db, 'SELECT id, name FROM enterprises');
    const existingMap = new Map(existingRows.map((row) => [canonicalName(row.name), row]));

    let alreadyInDb = 0;
    let missingInDb = 0;
    let created = 0;
    const sampleExisting = [];
    const sampleCreated = [];

    for (const company of companies) {
      const key = canonicalName(company.company);
      if (!key) continue;

      if (existingMap.has(key)) {
        alreadyInDb += 1;
        if (sampleExisting.length < 20) sampleExisting.push(company.company);
        continue;
      }

      missingInDb += 1;
      if (!APPLY) continue;

      const description = `Sifted AI 100 2025 ranking (#${company.rank}). Stage: ${company.stage || 'N/A'}. Last round: ${toFundingString(company.lastRoundSize) || 'N/A'}. Total funding: ${toFundingString(company.totalFunding) || 'N/A'}. Source: ${SOURCE_URL}`;

      await run(
        db,
        `INSERT INTO enterprises (
          name,
          sector,
          organization_type,
          country,
          headquarter_city,
          founded_year,
          description,
          website,
          funds_raised,
          is_validated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company.company,
          'Artificial Intelligence',
          'Private company',
          company.country || null,
          company.city || null,
          Number.isFinite(Number(company.founded)) ? Number(company.founded) : null,
          description,
          company.website || null,
          toFundingString(company.totalFunding),
          3
        ]
      );

      created += 1;
      existingMap.set(key, { id: -1, name: company.company });
      if (sampleCreated.length < 20) sampleCreated.push(company.company);
    }

    console.log(`SOURCE_COMPANIES=${companies.length}`);
    console.log(`ALREADY_IN_DB=${alreadyInDb}`);
    console.log(`MISSING_IN_DB=${missingInDb}`);
    console.log(`APPLY_MODE=${APPLY ? 'YES' : 'NO'}`);
    console.log(`CREATED=${created}`);
    console.log(`SAMPLE_EXISTING=${JSON.stringify(sampleExisting)}`);
    console.log(`SAMPLE_CREATED=${JSON.stringify(sampleCreated)}`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error('IMPORT_ERROR:', error.message);
  process.exit(1);
});
