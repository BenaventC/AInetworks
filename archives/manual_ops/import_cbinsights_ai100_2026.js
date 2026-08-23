/**
 * Import CB Insights "AI 100 / promising AI startups 2026" list into `enterprises`.
 *
 * Source: CB Insights company profiles (app.cbinsights.com), consulted 2026-08-23.
 * Non-destructive & idempotent: existing records are reported, never overwritten.
 * New records are created with is_validated = 3 (à revoir plus tard).
 *
 * Usage:
 *   node scripts/import_cbinsights_ai100_2026.js            # preview
 *   node scripts/import_cbinsights_ai100_2026.js --apply    # write
 */

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const APPLY = process.argv.includes('--apply');
const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'database.db');

// CB Insights taxonomy path -> project canonical sector labels (max 5)
const COMPANIES = [
  { name: 'Anam', cb: 'Enterprise applications > Customer support', sector: 'Customer Experience, Generative Media, Agentic' },
  { name: 'Strella', cb: 'Enterprise applications > Customer support', sector: 'Customer Experience, Marketing, Agentic' },
  { name: '7AI', cb: 'Enterprise applications > Cyber & physical security', sector: 'IT & Security, Agentic' },
  { name: 'Aurascape', cb: 'Enterprise applications > Cyber & physical security', sector: 'IT & Security' },
  { name: 'depthfirst', cb: 'Enterprise applications > Cyber & physical security', sector: 'IT & Security, Agentic' },
  { name: 'Lumana', cb: 'Enterprise applications > Cyber & physical security', sector: 'IT & Security, Computer Vision' },
  { name: 'Prophet Security', cb: 'Enterprise applications > Cyber & physical security', sector: 'IT & Security, Agentic' },
  { name: 'Simbian', cb: 'Enterprise applications > Cyber & physical security', sector: 'IT & Security, Agentic' },
  { name: 'Alex', cb: 'Enterprise applications > HR', sector: 'HRM, Agentic' },
  { name: 'Tako', cb: 'Enterprise applications > HR', sector: 'HRM' },
  { name: 'Bluefish', cb: 'Enterprise applications > Marketing', sector: 'Marketing' },
  { name: 'Creatify AI', cb: 'Enterprise applications > Marketing', sector: 'Marketing, Generative Media, Advertising' },
  { name: 'Newton Research', cb: 'Enterprise applications > Marketing', sector: 'Marketing' },
  { name: 'Profound', cb: 'Enterprise applications > Marketing', sector: 'Marketing' },
  { name: 'MainFunc', cb: 'Enterprise applications > Productivity & enterprise workflows', sector: 'Workflow & Productivity, Agentic' },
  { name: 'Narada', cb: 'Enterprise applications > Productivity & enterprise workflows', sector: 'Workflow & Productivity, Agentic' },
  { name: 'Pokee AI', cb: 'Enterprise applications > Productivity & enterprise workflows', sector: 'Workflow & Productivity, Agentic' },
  { name: 'Serval', cb: 'Enterprise applications > Productivity & enterprise workflows', sector: 'Workflow & Productivity, IT & Security, Agentic' },
  { name: 'Actively AI', cb: 'Enterprise applications > Sales', sector: 'Sales, Agentic' },
  { name: 'Netic', cb: 'Enterprise applications > Sales', sector: 'Sales, Customer Experience, Agentic' },
  { name: 'Reevo', cb: 'Enterprise applications > Sales', sector: 'Sales, Agentic' },
  { name: 'Antithesis', cb: 'Enterprise applications > Software development & coding tools', sector: 'Developer Tools' },
  { name: 'PlayerZero', cb: 'Enterprise applications > Software development & coding tools', sector: 'Developer Tools' },
  { name: 'Resolve AI', cb: 'Enterprise applications > Software development & coding tools', sector: 'Developer Tools, Agentic, Operations' },
  { name: 'Superblocks', cb: 'Enterprise applications > Software development & coding tools', sector: 'Developer Tools' },
  { name: 'Alta', cb: 'Industry applications > Consumer & retail', sector: 'Retail & E-commerce, Generative Media' },
  { name: 'Oboe', cb: 'Industry applications > Consumer & retail', sector: 'Education, Generative Media' },
  { name: 'Raspberry AI', cb: 'Industry applications > Consumer & retail', sector: 'Retail & E-commerce, Generative Media' },
  { name: 'AgentSmyth', cb: 'Industry applications > Financial services', sector: 'Financial Services, Agentic' },
  { name: 'Avantos', cb: 'Industry applications > Financial services', sector: 'Financial Services, Workflow & Productivity, Agentic' },
  { name: 'Bretton AI', cb: 'Industry applications > Financial services', sector: 'Financial Services, Agentic' },
  { name: 'Casap', cb: 'Industry applications > Financial services', sector: 'Financial Services, Customer Experience, Agentic' },
  { name: 'Further AI', cb: 'Industry applications > Financial services', sector: 'Financial Services, Workflow & Productivity, Agentic' },
  { name: 'Light', cb: 'Industry applications > Financial services', sector: 'Financial Services, Operations' },
  { name: 'Questflow', cb: 'Industry applications > Financial services', sector: 'Financial Services, Agentic, Blockchain & Web3' },
  { name: 'Salient', cb: 'Industry applications > Financial services', sector: 'Financial Services, Voice & Audio AI, Agentic' },
  { name: 'TidalWave', cb: 'Industry applications > Financial services', sector: 'Financial Services, Real Estate & PropTech' },
  { name: 'Assort Health', cb: 'Industry applications > Healthcare & life sciences', sector: 'HealthTech, Voice & Audio AI, Agentic' },
  { name: 'Boltz', cb: 'Industry applications > Healthcare & life sciences', sector: 'Biotech, AI model, R&D' },
  { name: 'Chai Discovery', cb: 'Industry applications > Healthcare & life sciences', sector: 'Biotech, AI model, R&D' },
  { name: 'Elicit', cb: 'Industry applications > Healthcare & life sciences', sector: 'R&D, Natural Language Processing' },
  { name: 'Ellipsis Health', cb: 'Industry applications > Healthcare & life sciences', sector: 'HealthTech, Voice & Audio AI' },
  { name: 'Layer Health', cb: 'Industry applications > Healthcare & life sciences', sector: 'HealthTech, Document AI' },
  { name: 'Penguin Ai', cb: 'Industry applications > Healthcare & life sciences', sector: 'HealthTech, Workflow & Productivity' },
  { name: 'Periodic Labs', cb: 'Industry applications > Healthcare & life sciences', sector: 'R&D, AI model, Robotics' },
  { name: 'Qualified Health', cb: 'Industry applications > Healthcare & life sciences', sector: 'HealthTech, Infrastructure' },
  { name: 'Atomic Canyon', cb: 'Industry applications > Industrials', sector: 'Energy & ClimateTech, Document AI' },
  { name: 'CuspAI', cb: 'Industry applications > Industrials', sector: 'R&D, AI model, Energy & ClimateTech' },
  { name: 'Leo AI', cb: 'Industry applications > Industrials', sector: 'Industrial & Manufacturing, R&D' },
  { name: 'Procure Ai', cb: 'Industry applications > Industrials', sector: 'Logistics & Supply Chain, Operations, Agentic' },
  { name: 'Qbiq', cb: 'Industry applications > Industrials', sector: 'Real Estate & PropTech, Construction' },
  { name: 'Ankar', cb: 'Industry applications > Legal', sector: 'LegalTech, Agentic' },
  { name: 'DeepJudge', cb: 'Industry applications > Legal', sector: 'LegalTech, Data' },
  { name: 'Enter', cb: 'Industry applications > Legal', sector: 'HealthTech, Financial Services, Automation' },
  { name: 'Rhino Federated Computing', cb: 'Infrastructure & compute > Data > Data preparation & curation', sector: 'Data, Infrastructure, IT & Security' },
  { name: 'Aaru', cb: 'Infrastructure & compute > Data > Synthetic data', sector: 'Data, AI model' },
  { name: 'LanceDB', cb: 'Infrastructure & compute > Data > Vector databases', sector: 'Data, Infrastructure, Developer Tools' },
  { name: 'AMESA', cb: 'Infrastructure & compute > Development & deployment > AI development & orchestration', sector: 'Developer Tools, Agentic' },
  { name: 'Applied Compute', cb: 'Infrastructure & compute > Development & deployment > AI development & orchestration', sector: 'AI model, Developer Tools' },
  { name: 'E2B', cb: 'Infrastructure & compute > Development & deployment > AI development & orchestration', sector: 'Developer Tools, Infrastructure, Agentic' },
  { name: 'Linkup', cb: 'Infrastructure & compute > Development & deployment > AI development & orchestration', sector: 'Data, Developer Tools, RAG' },
  { name: 'Lyzr', cb: 'Infrastructure & compute > Development & deployment > AI development & orchestration', sector: 'Agentic, Developer Tools' },
  { name: 'Maisa AI', cb: 'Infrastructure & compute > Development & deployment > AI development & orchestration', sector: 'Agentic, Developer Tools' },
  { name: 'Parallel', cb: 'Infrastructure & compute > Development & deployment > AI development & orchestration', sector: 'Data, Developer Tools, RAG' },
  { name: 'Seekr', cb: 'Infrastructure & compute > Development & deployment > AI development & orchestration', sector: 'AI model, Infrastructure' },
  { name: 'StackOne', cb: 'Infrastructure & compute > Development & deployment > AI development & orchestration', sector: 'Developer Tools, Infrastructure, Agentic' },
  { name: 'Thread AI', cb: 'Infrastructure & compute > Development & deployment > AI development & orchestration', sector: 'Workflow & Productivity, Developer Tools, Agentic' },
  { name: 'Browser Use', cb: 'Infrastructure & compute > Development & deployment > AI development & orchestration', sector: 'Agentic, Developer Tools, Automation' },
  { name: 'LlamaIndex', cb: 'Infrastructure & compute > Development & deployment > AI development & orchestration', sector: 'Developer Tools, RAG, Agentic' },
  { name: 'FriendliAI', cb: 'Infrastructure & compute > Development & deployment > Model deployment', sector: 'Inference & Model Serving, Infrastructure' },
  { name: 'Ami Labs', cb: 'Infrastructure & compute > Development & deployment > Models', sector: 'AI model, Agentic' },
  { name: 'Black Forest Labs', cb: 'Infrastructure & compute > Development & deployment > Models', sector: 'AI model, Generative Media, Computer Vision' },
  { name: 'Moonlake AI', cb: 'Infrastructure & compute > Development & deployment > Models', sector: 'AI model, Generative Media' },
  { name: 'Moonvalley', cb: 'Infrastructure & compute > Development & deployment > Models', sector: 'AI model, Generative Media, Media & Entertainment' },
  { name: 'Paid', cb: 'Infrastructure & compute > Development & deployment > Monetization', sector: 'Financial Services, Agentic, Operations' },
  { name: 'ChipAgents', cb: 'Infrastructure & compute > Hardware & computing > Chips', sector: 'Semiconductors, Developer Tools, Agentic' },
  { name: 'SiPearl', cb: 'Infrastructure & compute > Hardware & computing > Chips', sector: 'Semiconductors, Hardware' },
  { name: 'Unconventional AI', cb: 'Infrastructure & compute > Hardware & computing > Computing infrastructure', sector: 'Hardware, Infrastructure' },
  { name: 'Majestic Labs AI', cb: 'Infrastructure & compute > Hardware & computing > Servers', sector: 'Hardware, Semiconductors, Infrastructure' },
  { name: 'Positron', cb: 'Infrastructure & compute > Hardware & computing > Servers', sector: 'Hardware, Semiconductors, Inference & Model Serving' },
  { name: 'Dash0', cb: 'Infrastructure & compute > Observability & evaluation > AI observability & governance', sector: 'Developer Tools, Operations, Infrastructure' },
  { name: 'Geordie AI', cb: 'Infrastructure & compute > Observability & evaluation > AI observability & governance', sector: 'Operations, Agentic' },
  { name: 'InCountry', cb: 'Infrastructure & compute > Observability & evaluation > AI observability & governance', sector: 'Data, IT & Security, Infrastructure' },
  { name: 'Knostic', cb: 'Infrastructure & compute > Observability & evaluation > AI observability & governance', sector: 'IT & Security, Data' },
  { name: 'Thinking Machines Lab', cb: 'Infrastructure & compute > Observability & evaluation > Fine-tuning', sector: 'AI model, R&D' },
  { name: 'LMArena', cb: 'Infrastructure & compute > Observability & evaluation > LLM benchmarking & model routing', sector: 'AI model, R&D, Developer Tools' },
  { name: 'Keycard', cb: 'Infrastructure & compute > Observability & evaluation > Model & agent security', sector: 'IT & Security, Agentic' },
  { name: 'Straiker', cb: 'Infrastructure & compute > Observability & evaluation > Model & agent security', sector: 'IT & Security, Agentic' },
  { name: 'Virtue AI', cb: 'Infrastructure & compute > Observability & evaluation > Model & agent security', sector: 'IT & Security, AI model' },
  { name: 'Augmentus', cb: 'Physical AI > Robotics software & models', sector: 'Robotics, Industrial & Manufacturing, Automation' },
  { name: 'FieldAI', cb: 'Physical AI > Robotics software & models', sector: 'Robotics, AI model, Automation' },
  { name: 'Generalist AI', cb: 'Physical AI > Robotics software & models', sector: 'Robotics, AI model' },
  { name: 'InOrbit', cb: 'Physical AI > Robotics software & models', sector: 'Robotics, Operations, Automation' },
  { name: 'Blue Water Autonomy', cb: 'Physical AI > Robots & enabling hardware', sector: 'Naval, Defence, Robotics' },
  { name: 'BOS Semiconductors', cb: 'Physical AI > Robots & enabling hardware', sector: 'Semiconductors, Mobility & Transport, Hardware' },
  { name: 'DYNA', cb: 'Physical AI > Robots & enabling hardware', sector: 'Robotics, Hardware' },
  { name: 'Gravis Robotics', cb: 'Physical AI > Robots & enabling hardware', sector: 'Robotics, Construction, Automation' },
  { name: 'Humanoid', cb: 'Physical AI > Robots & enabling hardware', sector: 'Robotics, Hardware' },
  { name: 'Persona AI', cb: 'Physical AI > Robots & enabling hardware', sector: 'Robotics, Hardware, Industrial & Manufacturing' },
  { name: 'The Bot Company', cb: 'Physical AI > Robots & enabling hardware', sector: 'Robotics, Hardware' },
];

// Complementary attributes for records to create. Only reasonably documented facts
// are filled here; unknown values are deliberately left empty (NULL in database).
const DETAILS = {
  'Anam': { country: 'United Kingdom', city: 'London', desc: 'Builds real-time AI video personas that hold face-to-face conversations for customer support and onboarding use cases.' },
  'Strella': { country: 'United States', desc: 'AI research platform running moderated customer interviews at scale and synthesizing the transcripts into product and marketing insights.' },
  '7AI': { country: 'United States', city: 'Boston', founded: 2024, desc: 'Agentic security platform automating alert triage and investigation workflows for security operations teams.' },
  'Aurascape': { country: 'United States', city: 'Santa Clara', desc: 'Security platform giving enterprises visibility and control over employee and agent usage of generative AI applications.' },
  'depthfirst': { country: 'United States', desc: 'Applies AI agents to security operations, automating detection engineering and investigation tasks for enterprise defenders.' },
  'Lumana': { country: 'United States', city: 'Palo Alto', desc: 'Cloud video security platform using computer vision to turn existing surveillance cameras into real-time physical security analytics.' },
  'Prophet Security': { country: 'United States', desc: 'Agentic AI security operations platform that autonomously investigates and triages alerts to reduce analyst workload.' },
  'Simbian': { country: 'United States', city: 'Mountain View', desc: 'Provides AI security agents that automate SOC tasks such as alert triage, threat hunting and compliance reporting.' },
  'Alex': { country: 'United States', desc: 'AI recruiting platform conducting voice-based candidate screening interviews and feeding structured results back to hiring teams.' },
  'Tako': { desc: 'Applies AI to human resources processes, automating repetitive people-operations and workforce management tasks for employers.' },
  'Bluefish': { country: 'United States', desc: 'Helps brands monitor and influence how they are represented inside AI assistants and generative search answers.' },
  'Creatify AI': { country: 'United States', city: 'San Francisco', desc: 'Generative video platform turning product pages into AI-generated advertising creatives with synthetic presenters.' },
  'Newton Research': { desc: 'Develops AI tooling for marketing teams, automating campaign research, analysis and content generation workflows.' },
  'Profound': { country: 'United States', city: 'New York', desc: 'Answer-engine optimization platform measuring and improving brand visibility inside AI chatbots and generative search results.' },
  'MainFunc': { country: 'United States', city: 'Palo Alto', desc: 'Developer of Genspark, an agentic AI workspace that plans and executes multi-step research and productivity tasks for users.' },
  'Narada': { country: 'United States', desc: 'Enterprise AI agent platform connecting business applications to execute cross-tool workflows from natural language instructions.' },
  'Pokee AI': { country: 'United States', city: 'Palo Alto', desc: 'Builds general-purpose AI agents based on reinforcement learning that chain external tools to complete end-to-end user tasks.' },
  'Serval': { country: 'United States', desc: 'AI agent platform for internal IT and employee support, resolving service desk tickets across enterprise systems.' },
  'Actively AI': { country: 'United States', desc: 'Applies reasoning models to sales pipelines, prioritizing accounts and generating targeted outbound actions for revenue teams.' },
  'Netic': { country: 'United States', desc: 'AI platform for home services businesses, automating inbound sales calls, scheduling and revenue operations.' },
  'Reevo': { country: 'United States', desc: 'AI-native CRM that automates pipeline management, meeting capture and follow-up execution for sales organizations.' },
  'Antithesis': { country: 'United States', desc: 'Autonomous software testing platform that continuously explores program state to find and deterministically reproduce hard bugs.' },
  'PlayerZero': { country: 'United States', desc: 'AI platform that analyzes code and production telemetry to predict, detect and resolve software defects before release.' },
  'Superblocks': { country: 'United States', city: 'New York', desc: 'Platform for building internal enterprise applications, combining AI generation with governed developer tooling.' },
  'Alta': { country: 'United States', city: 'New York', desc: 'AI personal styling service that recommends and assembles fashion outfits for consumers from partner retail catalogs.' },
  'Oboe': { country: 'United States', city: 'New York', desc: 'Consumer learning application that generates personalized AI-built courses on any topic requested by the user.' },
  'Raspberry AI': { country: 'United States', city: 'New York', desc: 'Generative design platform for fashion and apparel brands, accelerating creation of technical designs and product visuals.' },
  'AgentSmyth': { country: 'United States', desc: 'Builds AI agents for financial market research and trading workflows, automating analysis of market data and news.' },
  'Avantos': { country: 'United States', desc: 'Enterprise AI agent platform automating document-heavy back-office workflows for financial services organizations.' },
  'Bretton AI': { desc: 'Applies AI agents to financial services operations, automating analysis and processing tasks in regulated environments.' },
  'Casap': { country: 'United States', desc: 'Automates payment dispute and chargeback resolution for banks and fintechs using AI agents connected to case systems.' },
  'Further AI': { country: 'United States', desc: 'AI agents for insurance operations, automating submission intake, quoting and policy servicing workflows for brokers and carriers.' },
  'Questflow': { desc: 'Orchestration platform for autonomous AI agents executing financial and on-chain workflows on behalf of users.' },
  'Salient': { country: 'United States', desc: 'Voice AI platform for consumer lenders, automating loan servicing, collections and borrower communication at scale.' },
  'TidalWave': { country: 'United States', desc: 'AI assistant for mortgage lending that guides borrowers through application, documentation and qualification steps.' },
  'Boltz': { country: 'United States', city: 'Cambridge', desc: 'Develops open biomolecular structure prediction models for drug discovery, originating from MIT research work.' },
  'Elicit': { country: 'United States', city: 'Oakland', desc: 'AI research assistant that automates systematic literature review by extracting and synthesizing findings from scientific papers.' },
  'Ellipsis Health': { country: 'United States', city: 'San Francisco', desc: 'Uses voice biomarkers and conversational AI to screen and support patients for behavioral and mental health conditions.' },
  'Layer Health': { country: 'United States', city: 'Boston', desc: 'Clinical large language model platform extracting structured information from unstructured medical records for care and research.' },
  'Penguin Ai': { country: 'United States', desc: 'Provides AI infrastructure and agents for healthcare payers and providers, automating administrative and claims workflows.' },
  'Periodic Labs': { country: 'United States', city: 'San Francisco', founded: 2025, desc: 'Builds autonomous AI scientists combining models and robotic laboratories to accelerate materials and physical sciences discovery.' },
  'Qualified Health': { country: 'United States', desc: 'Generative AI governance and deployment platform purpose-built for hospitals and health systems.' },
  'Atomic Canyon': { country: 'United States', desc: 'AI search and document intelligence platform for the nuclear energy industry and its regulatory documentation.' },
  'Leo AI': { country: 'Israel', desc: 'Generative engineering copilot assisting mechanical designers with CAD modeling and part design decisions.' },
  'Procure Ai': { desc: 'AI platform for industrial procurement, automating sourcing, spend analysis and supplier negotiation workflows.' },
  'Qbiq': { country: 'Israel', city: 'Tel Aviv', desc: 'Generative design platform producing and evaluating architectural space plans for real estate and construction projects.' },
  'Ankar': { desc: 'AI assistant for intellectual property and patent legal work, automating prior art analysis and prosecution tasks.' },
  'Enter': { country: 'United States', desc: 'Automates healthcare revenue cycle management, using AI to process claims and accelerate provider reimbursement.' },
  'Rhino Federated Computing': { country: 'United States', city: 'Boston', desc: 'Federated computing platform enabling AI training and analytics on distributed sensitive datasets without moving the data.' },
  'Aaru': { country: 'United States', city: 'New York', desc: 'Builds simulation models populated with synthetic agents to forecast collective human behavior and decision outcomes.' },
  'LanceDB': { country: 'United States', city: 'San Francisco', desc: 'Open-source multimodal vector database and lakehouse format designed for AI retrieval and training workloads.' },
  'AMESA': { desc: 'Provides tooling to develop, orchestrate and operate AI agents across enterprise systems.' },
  'Applied Compute': { country: 'United States', city: 'San Francisco', founded: 2025, desc: 'Builds reinforcement learning infrastructure allowing enterprises to train specialized models on their own task data.' },
  'E2B': { country: 'United States', city: 'San Francisco', desc: 'Open-source secure cloud sandboxes that execute AI-generated code for agents and code interpreter applications.' },
  'Lyzr': { country: 'United States', desc: 'Agent development framework and platform enabling enterprises to build and deploy autonomous AI agents on their own stack.' },
  'Maisa AI': { country: 'Spain', city: 'Valencia', desc: 'Enterprise agent platform based on a knowledge processing unit approach aiming at auditable and deterministic agent execution.' },
  'Seekr': { country: 'United States', desc: 'Builds trustworthy AI models and infrastructure with a focus on content scoring, transparency and enterprise deployment.' },
  'StackOne': { country: 'United Kingdom', city: 'London', desc: 'Unified integration API giving AI agents and SaaS products governed access to enterprise applications.' },
  'Thread AI': { country: 'United States', city: 'New York', desc: 'Composable orchestration platform embedding AI workflows and agents into existing enterprise business processes.' },
  'FriendliAI': { country: 'South Korea', city: 'Seoul', desc: 'Inference serving platform optimizing throughput and cost for deploying generative AI models in production.' },
  'Moonlake AI': { desc: 'Develops generative AI models and applications for media creation.' },
  'Moonvalley': { country: 'United States', city: 'Los Angeles', desc: 'Builds Marey, a generative video model trained on licensed footage and targeted at professional film production workflows.' },
  'ChipAgents': { country: 'United States', city: 'Santa Barbara', desc: 'AI agents for semiconductor design and verification, automating RTL debugging and testbench generation tasks.' },
  'Unconventional AI': { desc: 'Develops alternative computing architectures aimed at improving energy efficiency of AI workloads.' },
  'Majestic Labs AI': { country: 'United States', founded: 2025, desc: 'Designs high-memory AI server systems intended to run large models with far fewer machines than conventional GPU clusters.' },
  'Positron': { country: 'United States', desc: 'Builds purpose-built inference servers and accelerators offering energy-efficient alternatives to GPUs for transformer serving.' },
  'Geordie AI': { desc: 'Provides observability and governance tooling for monitoring the behavior of AI agents in production.' },
  'InCountry': { country: 'United States', city: 'San Francisco', desc: 'Data residency platform helping enterprises store and process regulated data inside required national jurisdictions.' },
  'Knostic': { country: 'United States', desc: 'Enforces need-to-know access controls on enterprise large language model deployments to prevent oversharing of sensitive knowledge.' },
  'LMArena': { country: 'United States', city: 'Berkeley', desc: 'Crowdsourced evaluation platform ranking large language models through blind pairwise human preference comparisons.' },
  'Keycard': { country: 'United States', desc: 'Identity and access management infrastructure designed for authenticating and authorizing autonomous AI agents.' },
  'Straiker': { country: 'United States', city: 'Sunnyvale', desc: 'Security platform that red-teams and protects enterprise AI applications and agents against adversarial attacks.' },
  'Virtue AI': { country: 'United States', city: 'San Francisco', desc: 'AI safety and security company providing automated red-teaming, guardrails and compliance evaluation for models and agents.' },
  'Generalist AI': { country: 'United States', desc: 'Develops general-purpose robot foundation models aimed at enabling dexterous manipulation across many physical tasks.' },
  'InOrbit': { country: 'United States', city: 'Mountain View', desc: 'Cloud robot operations platform for monitoring, orchestrating and optimizing fleets of heterogeneous autonomous robots.' },
  'Blue Water Autonomy': { country: 'United States', city: 'Boston', desc: 'Develops fully autonomous unmanned ships for defense and maritime logistics missions.' },
  'BOS Semiconductors': { country: 'South Korea', desc: 'Designs automotive AI system-on-chips and computing platforms for advanced driver assistance and autonomous vehicles.' },
  'DYNA': { country: 'United States', founded: 2024, desc: 'Builds general-purpose robot arms and foundation models for dexterous manipulation in commercial service environments.' },
  'Gravis Robotics': { country: 'Switzerland', city: 'Zurich', desc: 'ETH Zurich spinoff automating heavy construction machinery with autonomous control software for earthmoving operations.' },
  'Persona AI': { country: 'United States', city: 'Houston', desc: 'Develops industrial humanoid robots for shipyard welding and other heavy manufacturing tasks.' },
  'The Bot Company': { country: 'United States', city: 'San Francisco', founded: 2024, desc: 'Develops consumer robots designed to perform household chores in domestic environments.' },
};

function normalizeKey(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|sa|sas|gmbh|bv|plc|co)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

const db = new sqlite3.Database(DB_PATH);
const all = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (e, r) => (e ? rej(e) : res(r))));
const run = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function (e) { return e ? rej(e) : res(this); }));

(async () => {
  const rows = await all('SELECT id, name, sector, country, is_validated FROM enterprises');
  const index = new Map();
  for (const row of rows) {
    const key = normalizeKey(row.name);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(row);
  }

  const decisions = [];
  const toCreate = [];

  for (const company of COMPANIES) {
    const key = normalizeKey(company.name);
    const matches = index.get(key) || [];
    if (matches.length === 1) {
      decisions.push({ name: company.name, decision: 'existing', matched_id: matches[0].id, matched_name: matches[0].name, sector: matches[0].sector || '' });
    } else if (matches.length > 1) {
      decisions.push({ name: company.name, decision: 'ambiguous', matched_id: matches.map((m) => m.id).join('|'), matched_name: matches.map((m) => m.name).join('|'), sector: '' });
    } else {
      decisions.push({ name: company.name, decision: 'created', matched_id: '', matched_name: '', sector: company.sector });
      toCreate.push(company);
    }
  }

  const counts = decisions.reduce((acc, d) => ({ ...acc, [d.decision]: (acc[d.decision] || 0) + 1 }), {});
  console.log(`Base: ${DB_PATH}`);
  console.log(`Liste CB Insights 2026: ${COMPANIES.length} entreprises`);
  console.log('Décisions:', counts);
  console.log('\n--- Déjà en base ---');
  decisions.filter((d) => d.decision !== 'created').forEach((d) => console.log(`  [${d.decision}] ${d.name} -> #${d.matched_id} ${d.matched_name}`));
  console.log('\n--- À créer ---');
toCreate.forEach((c) => {
    const d = DETAILS[c.name] || {};
    console.log(`  ${c.name} | ${c.sector} | ${d.country || 'NA'} | ${d.desc ? 'desc ok' : 'DESC MANQUANTE'}`);
  });

  if (APPLY && toCreate.length) {
    await run('BEGIN TRANSACTION');
    try {
      for (const c of toCreate) {
        const d = DETAILS[c.name] || {};
        const description = `${d.desc || 'AI company with no verified public description at import time.'} Listed by CB Insights among the most promising AI startups for 2026, category "${c.cb}".`;
        await run(
          `INSERT INTO enterprises (name, sector, organization_type, country, headquarter_city, founded_year, description, is_validated)
           VALUES (?, ?, ?, ?, ?, ?, ?, 3)`,
          [c.name, c.sector, 'Startup', d.country || null, d.city || null, d.founded || null, description]
        );
      }
      await run('COMMIT');
      console.log(`\n✓ ${toCreate.length} fiches créées (is_validated = 3).`);
    } catch (e) {
      await run('ROLLBACK');
      console.error('Rollback:', e.message);
      process.exitCode = 1;
    }
  } else if (!APPLY) {
    console.log('\n(Mode aperçu — relancer avec --apply pour écrire.)');
  }

  const outDir = path.join(ROOT, 'exports');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'cbinsights_ai100_2026_audit.json');
  fs.writeFileSync(outPath, JSON.stringify({ applied: APPLY, source: 'CB Insights company profiles', consulted_at: '2026-08-23', counts, decisions }, null, 2), 'utf8');
  console.log(`Audit: ${outPath}`);

  db.close();
})();
