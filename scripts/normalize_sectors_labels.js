const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const DB_PATH = 'database.db';

const LABEL_RULES = [
  {
    label: 'Cross Industry',
    patterns: [/\bcross\s*industry\b/i, /\bcross[-\s]?functional\b/i, /\bgeneralist\b/i, /\bhorizontal\b/i]
  },
  {
    label: 'AI model',
    patterns: [
      /\bllm\b/i,
      /foundation\s+model/i,
      /language\s+model/i,
      /generative\s+ai/i,
      /model\s+provider/i,
      /inference\s+engine/i,
      /multimodal\s+model/i,
      /chatbot\s+ia/i
    ]
  },
  {
    label: 'Hardware',
    patterns: [
      /\b(gpu|cpu)\s*(designer|design|manufacturer|vendor|maker|architecture)\b/i,
      /\b(designs?|manufactures?|builds?)\s+(gpu|cpu|chips?|processors?)\b/i,
      /chip(s|set)?\b/i,
      /processor(s)?\b/i,
      /chipmaker/i,
      /semiconductor/i,
      /accelerator/i,
      /\bfpga\b/i,
      /hardware/i,
      /processeurs?/i
    ]
  },
  {
    label: 'Cloud Provider',
    patterns: [
      /\bcloud\s+(provider|platform|infrastructure|services?|computing)\b/i,
      /\b(provider|platform)\s+for\s+cloud\b/i,
      /internet\s+infrastructure/i,
      /\biaas\b/i,
      /\bpaas\b/i,
      /\bcdn\b/i,
      /edge\s+network/i,
      /\bdns\b/i,
      /cloudflare/i
    ]
  },
  {
    label: 'ICT',
    patterns: [
      /\bict\b/i,
      /information\s*&\s*communication\s*technologies/i,
      /\bsoftware\b/i,
      /\bsaa?s\b/i,
      /\bai\b/i,
      /artificial\s+intelligence/i,
      /computer\s*vision/i,
      /image\s+generation/i,
      /cyber/i,
      /chatbot/i
    ]
  },
  {
    label: 'Health & Social Care',
    patterns: [/human\s+health/i, /social\s+work/i, /\bhealthcare\b/i, /\bmedical\b/i, /\bbiotech\b/i, /\bpharma\b/i]
  },
  {
    label: 'Manufacturing',
    patterns: [/\bmanufacturing\b/i, /\bindustrial\b/i, /\bfactory\b/i, /\brobotics?\b/i, /production\s+line/i, /plant\s+operations/i]
  },
  {
    label: 'Financial Services',
    patterns: [/financial\s*&\s*insurance\s*activities/i, /\bfintech\b/i, /\binsurance\b/i, /\bbanking\b/i, /\bpayments?\b/i]
  },
  {
    label: 'Transport & Mobility',
    patterns: [/transportation\s*,\s*mobility\s*&\s*storage/i, /\bmobility\b/i, /\blogistics?\b/i, /\bfreight\b/i, /\bautonomous\s+vehicle/i]
  },
  {
    label: 'Agriculture & Forestry',
    patterns: [/agriculture\s*,\s*forestry\s*&\s*fishing/i, /\bagri\b/i, /\bfarming\b/i, /\bagtech\b/i]
  },
  {
    label: 'Retail & E-commerce',
    patterns: [/wholesale\s*&\s*retail\s*trade/i, /\bretail\b/i, /\be-?commerce\b/i, /marketplace/i]
  },
  {
    label: 'Professional Services',
    patterns: [/professional\s*,\s*scientific\s*&\s*technical\s*activities/i, /consulting/i, /scientific/i, /technical\s+services?/i]
  },
  {
    label: 'Public Sector & Aerospace',
    patterns: [/public\s+administration/i, /defence/i, /defense/i, /aerospace/i, /social\s+security/i, /government/i]
  },
  {
    label: 'Energy & Utilities',
    patterns: [/electricity\s*,\s*gas\s*,\s*steam\s*&\s*air\s+conditioning\s+supply/i, /\benergy\b/i, /\butilities\b/i, /power\s+grid/i]
  },
  {
    label: 'Real Estate Activities',
    patterns: [/real\s+estate\s+activities/i, /proptech/i, /property\s+management/i, /facility\s+management/i]
  },
  {
    label: 'Education',
    patterns: [/\beducation\b/i, /\bedtech\b/i, /learning\s+platform/i, /tutoring/i]
  },
  {
    label: 'Media & Entertainment',
    patterns: [/arts\s*,\s*entertainment\s*&\s*recreation/i, /\bgaming\b/i, /\bmedia\b/i, /video\s+platform/i, /entertainment/i]
  },
  {
    label: 'Construction',
    patterns: [/\bconstruction\b/i, /\bbuilt\s+environment\b/i, /\bbim\b/i]
  },
  {
    label: 'Operations',
    patterns: [/\boperations?\b/i, /\bops\b/i, /production/i, /purchasing/i, /procurement/i, /\bscm\b/i, /supply\s+chain/i]
  },
  {
    label: 'R&D',
    patterns: [/research\s*&\s*development/i, /\br\s*&\s*d\b/i, /\bresearch\b/i, /innovation/i]
  },
  {
    label: 'IT & Security',
    patterns: [/it\s*&\s*security/i, /cybersecurity/i, /cyber\s*security/i, /zero\s+trust/i, /\bwaf\b/i, /\bddos\b/i]
  },
  {
    label: 'Sales',
    patterns: [/\bsales\b/i, /\bcrm\b/i, /lead\s+generation/i, /go-?to-?market/i]
  },
  {
    label: 'Marketing',
    patterns: [/\bmarketing\b/i, /\badvertising\b/i, /brand\s+management/i, /campaign/i]
  }
];

const ALLOWED_LABELS = new Set(LABEL_RULES.map((rule) => rule.label));

function normalizeSpaces(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function detectLabels(text) {
  const value = normalizeSpaces(text);
  if (!value) {
    return [];
  }

  const labels = [];
  for (const rule of LABEL_RULES) {
    if (rule.patterns.some((rx) => rx.test(value))) {
      labels.push(rule.label);
    }
  }

  return labels;
}

function uniqueOrdered(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function pickNormalizedSector(sector, description) {
  const currentSector = normalizeSpaces(sector);
  const desc = normalizeSpaces(description);
  let labels = [];

  if (currentSector || desc) {
    // Blend current sector and description so we can enrich existing broad labels (e.g. ICT)
    // with newer specific labels such as AI model, Hardware, and Cloud.
    const blended = [currentSector, desc].filter(Boolean).join(' | ');
    labels = detectLabels(blended);

    if (labels.length === 0 && currentSector) {
      labels = ['Cross Industry'];
    }
  }

  labels = uniqueOrdered(labels).filter((label) => ALLOWED_LABELS.has(label)).slice(0, 3);
  return labels.length > 0 ? labels.join(', ') : null;
}

function run() {
  const db = new sqlite3.Database(DB_PATH);
  db.all('SELECT id, name, sector, description FROM enterprises ORDER BY id', (err, rows) => {
    if (err) {
      console.error('Error while reading enterprises:', err.message);
      db.close();
      process.exit(1);
      return;
    }

    const updates = [];
    const labelUsage = new Map();

    for (const row of rows) {
      const normalized = pickNormalizedSector(row.sector, row.description);
      const previous = normalizeSpaces(row.sector) || null;

      if (normalized !== previous) {
        updates.push({ id: row.id, name: row.name, from: previous, to: normalized });
      }

      if (normalized) {
        normalized.split(',').map((part) => part.trim()).forEach((label) => {
          labelUsage.set(label, (labelUsage.get(label) || 0) + 1);
        });
      }
    }

    console.log(`Total enterprises: ${rows.length}`);
    console.log(`Rows to update: ${updates.length}`);
    console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
    console.log('Allowed labels:');
    LABEL_RULES.forEach((rule, index) => console.log(`${index + 1}. ${rule.label}`));

    const sortedUsage = [...labelUsage.entries()].sort((a, b) => b[1] - a[1]);
    console.log('Detected label usage after normalization:');
    sortedUsage.forEach(([label, count]) => console.log(`- ${label}: ${count}`));

    if (!APPLY) {
      console.log('Sample changes (first 30):');
      updates.slice(0, 30).forEach((u) => {
        console.log(`#${u.id} ${u.name}`);
        console.log(`  FROM: ${u.from || '<empty>'}`);
        console.log(`  TO  : ${u.to || '<empty>'}`);
      });
      db.close();
      return;
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare('UPDATE enterprises SET sector = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      for (const update of updates) {
        stmt.run(update.to, update.id);
      }
      stmt.finalize();
      db.run('COMMIT', (commitErr) => {
        if (commitErr) {
          console.error('Commit failed:', commitErr.message);
          db.run('ROLLBACK');
          db.close();
          process.exit(1);
          return;
        }

        console.log(`Applied updates: ${updates.length}`);
        db.close();
      });
    });
  });
}

run();