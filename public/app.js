// ===== STATE =====
let enterprises = [];
let partnerships = [];
let filteredEnterprises = [];
let filteredPartnerships = [];
let currentEditingId = null;
let isEditingEnterprise = false;
let enterpriseOptions = [];
let enterpriseOptionsLoaded = false;
let enterpriseOptionsLoadingPromise = null;
let enterpriseSearchQuery = '';
let enterpriseAnythingQuery = '';
let enterpriseSearchDebounceTimer = null;
let enterpriseSegment = 'later';
let enterpriseSectorFilter = '';
let enterpriseCountryFilter = '';
let enterpriseOrgTypeFilter = '';  // set to 'Investor' when on investors tab
let enterpriseFilterOptionsLoadingPromise = null;
let enterpriseListAbortController = null;
let enterpriseCountsAbortController = null;
let enterpriseFiltersAbortController = null;
let partnershipSearchQuery = '';
let partnershipSearchDebounceTimer = null;
let partnershipSegment = 'later';
let partnershipListAbortController = null;
let partnershipCountsAbortController = null;
let hasLoadedPartnershipTab = false;
let hasLoadedInvestorTab = false;
let investorPage = 1;
let investorSearchQuery = '';
let investorSearchAbortController = null;
const enterpriseMetricHistoryCache = new Map();
const enterpriseSegmentCounts = {
  pending: 0,
  partial: 0,
  validated: 0,
  later: 0,
  investor: 0,
  companieswithoutcompetitors: 0,
  top100: 0
};
const partnershipSegmentCounts = {
  pending: 0,
  partial: 0,
  validated: 0,
  later: 0,
  top100: 0
};
const selectedSectorLabels = new Set();
const METRIC_HISTORY_INDICATOR_OPTIONS = [
  'capitalization',
  'funds_raised',
  'revenue_millions',
  'profit_millions',
  'rd_expenses_millions',
  'capex_millions',
  'employees_count',
  'community_size'
];
const METRIC_HISTORY_UNIT_OPTIONS = [
  'usd_m',
  'employees',
  'users',
  'developers',
  'downloads',
  'customers',
  'percent',
  'index'
];
const METRIC_HISTORY_DEFAULT_UNIT_BY_INDICATOR = {
  capitalization: 'usd_m',
  funds_raised: 'usd_m',
  revenue_millions: 'usd_m',
  profit_millions: 'usd_m',
  rd_expenses_millions: 'usd_m',
  capex_millions: 'usd_m',
  employees_count: 'employees',
  community_size: 'users'
};
const TOP_RANKING_SEGMENTS = new Set(['top100', 'top50']);
const SECTOR_LABEL_GROUPS = [
  {
    name: 'AI & Data',
    labels: new Set(['AI model', 'Agentic', 'Audio AI', 'Computer Vision', 'Data', 'Generative Media', 'Inference & Model Serving', 'Model Serving', 'Natural Language Processing', 'Voice & Audio AI', 'Artificial Intelligence', 'Image generation', 'Inference', 'Quantic', 'Sound', 'Voice'])
  },
  {
    name: 'Infrastructure & Engineering',
    labels: new Set(['Cloud Provider', 'Developer Tools', 'Hardware', 'ICT', 'Infrastructure', 'Productivity', 'Semiconductors', 'Workflow', 'Workflow & Productivity', 'GPU', 'IT', 'Security'])
  },
  {
    name: 'Industry & Mobility',
    labels: new Set(['Aerospace', 'Automation', 'Construction', 'Drone & UAV', 'Industrial', 'Industrial & Manufacturing', 'Logistics', 'Logistics & Supply Chain', 'Mobility & Transport', 'Operations', 'Robotics', 'Spatial Computing', 'Supply Chain', 'UAV', 'Defence', 'Drone', 'Manufacturing', 'Transport', 'Mobility'])
  },
  {
    name: 'Business Functions',
    labels: new Set(['Advertising', 'Blockchain', 'Blockchain & Web3', 'Customer Experience', 'Financial Services', 'HRM', 'LegalTech', 'Marketing', 'Professional Services', 'Sales', 'Venture Capital', 'Web3'])
  },
  {
    name: 'Sector Applications',
    labels: new Set(['Agriculture', 'Agriculture & Forestry', 'Biotech', 'ClimateTech', 'Document AI', 'Education', 'Energy & ClimateTech', 'Forestry', 'Gaming', 'HealthTech', 'MedTech', 'Media & Entertainment', 'PropTech', 'Real Estate', 'Real Estate & PropTech', 'Retail & E-commerce', 'E-commerce', 'Energy', 'Entertainment', 'Health', 'Media', 'Oncology', 'Retail', 'Social Care', 'Utilities'])
  },
  {
    name: 'Public, Research & Trust',
    labels: new Set(['IT & Security', 'Public Sector', 'R&D', 'Sustainability'])
  }
];
let sectorLabelGroups = SECTOR_LABEL_GROUPS;
let sectorOntologyEntries = [];
let sectorLabelOptions = [
  'Aerospace',
  'Defence',
  'Agriculture & Forestry',
  'AI model',
  'Artificial Intelligence',
  'Biotech',
  'Cloud Provider',
  'Computer Vision',
  'Construction',
  'Data',
  'Defence',
  'Drone',
  'Education',
  'Energy',
  'Utilities',
  'Financial Services',
  'GPU',
  'Hardware',
  'Health',
  'Social Care',
  'ICT',
  'Image generation',
  'Inference',
  'IT',
  'Security',
  'Manufacturing',
  'Operations',
  'Media',
  'Entertainment',
  'Oncology',
  'Professional Services',
  'Public Sector',
  'Quantic',
  'R&D',
  'Real Estate Activities',
  'Retail',
  'E-commerce',
  'Robotics',
  'Sales',
  'Marketing',
  'Transport',
  'Mobility',
  'Voice',
];
const enterprisePagination = {
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};
const partnershipPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false
};

function normalizeValidationLevel(value) {
  const level = Number.parseInt(value, 10);
  if (Number.isNaN(level) || level < 0) return 0;
  if (level > 3) return 3;
  return level;
}

function getValidationLevelForSegment(segment) {
  if (segment === 'partial') return 1;
  if (segment === 'validated') return 2;
  if (segment === 'later') return 3;
  return 0;
}

function isTopRankingSegment(segment) {
  return TOP_RANKING_SEGMENTS.has(segment);
}

function getRankTierClass(rank, total) {
  if (!Number.isFinite(rank) || rank <= 0 || !Number.isFinite(total) || total <= 0) {
    return { cssClass: 'rank-sticker-default', percentile: 100 };
  }

  const percentile = (rank / total) * 100;
  if (percentile <= 1) {
    return { cssClass: 'rank-sticker-top1', percentile };
  }
  if (percentile <= 5) {
    return { cssClass: 'rank-sticker-top5', percentile };
  }
  if (percentile <= 10) {
    return { cssClass: 'rank-sticker-top10', percentile };
  }

  return { cssClass: 'rank-sticker-default', percentile };
}

function parseMillionsValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  let sanitized = text
    .replace(/[^0-9,.-]/g, '')
    .replace(/\s+/g, '');

  const lastComma = sanitized.lastIndexOf(',');
  const lastDot = sanitized.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      sanitized = sanitized.replace(/\./g, '').replace(',', '.');
    } else {
      sanitized = sanitized.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const isThousandsGrouping = /^-?\d{1,3}(,\d{3})+$/.test(sanitized);
    if (isThousandsGrouping) {
      sanitized = sanitized.replace(/,/g, '');
    } else if (/^-?\d+,\d+$/.test(sanitized)) {
      sanitized = sanitized.replace(',', '.');
    } else {
      sanitized = sanitized.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    const isThousandsGrouping = /^-?\d{1,3}(\.\d{3})+$/.test(sanitized);
    if (isThousandsGrouping) {
      sanitized = sanitized.replace(/\./g, '');
    } else if (!/^-?\d+\.\d+$/.test(sanitized)) {
      sanitized = sanitized.replace(/\./g, '');
    }
  }

  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumberFr(value, maxFractionDigits = 3) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits
  }).format(value);
}

function formatMillionsUsd(value) {
  const millions = parseMillionsValue(value);
  if (millions === null) {
    return '—';
  }

  const sign = millions < 0 ? '-' : '';
  const absoluteMillions = Math.abs(millions);

  if (absoluteMillions >= 1000) {
    const billions = absoluteMillions / 1000;
    return `${sign}${formatNumberFr(billions, 3)} billion USD`;
  }

  if (absoluteMillions >= 1) {
    return `${sign}${formatNumberFr(absoluteMillions, 3)} million USD`;
  }

  const thousands = absoluteMillions * 1000;
  return `${sign}${formatNumberFr(thousands, 3)} thousand USD`;
}

function formatAbsoluteUsd(value) {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '—';
  }

  if (numeric >= 1_000_000_000) {
    const billions = numeric / 1_000_000_000;
    return `${formatNumberFr(billions, 3)} billion USD`;
  }

  if (numeric >= 1_000_000) {
    const millions = numeric / 1_000_000;
    return `${formatNumberFr(millions, 3)} million USD`;
  }

  const thousands = numeric / 1_000;
  return `${formatNumberFr(thousands, 3)} thousand USD`;
}

function parseMillionsInputValue(elementId, fieldLabel, options = {}) {
  const { allowNegative = false } = options;
  const raw = document.getElementById(elementId).value.trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldLabel} must be a numeric value in USD millions`);
  }

  if (!allowNegative && parsed < 0) {
    throw new Error(`${fieldLabel} must be a numeric value in USD millions`);
  }

  return parsed;
}

function formatAuditTimestamp(value) {
  if (!value) {
    return 'N/A';
  }

  const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return escapeHtml(String(value));
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function getValidationMeta(level, feminine = true) {
  const safeLevel = normalizeValidationLevel(level);

  if (safeLevel === 3) {
    return {
      label: 'To review later',
      badgeClass: 'badge-status-planned',
      nextLevel: 0,
      nextActionLabel: 'Set as not validated'
    };
  }

  if (safeLevel === 2) {
    return {
      label: 'Validated',
      badgeClass: 'badge-status-active',
      nextLevel: 3,
      nextActionLabel: 'Mark as review later'
    };
  }

  if (safeLevel === 1) {
    return {
      label: 'Partially validated',
      badgeClass: 'badge-status-planned',
      nextLevel: 2,
      nextActionLabel: 'Mark as validated'
    };
  }

  return {
    label: 'Not validated',
    badgeClass: 'badge-status-inactive',
    nextLevel: 1,
    nextActionLabel: 'Mark as partially validated'
  };
}

function getValidationButtonOptions() {
  return [
    { level: 0, label: 'Not validated', activeClass: 'btn-validation-neutral-active' },
    { level: 3, label: 'Review later', activeClass: 'btn-validation-later-active' },
    { level: 1, label: 'Partial', activeClass: 'btn-validation-partial-active' },
    { level: 2, label: 'Validated', activeClass: 'btn-validation-success-active' }
  ];
}

function renderValidationButtons(kind, id, currentLevel) {
  const safeLevel = normalizeValidationLevel(currentLevel);
  const handlerName = kind === 'enterprise' ? 'toggleEnterpriseValidation'
    : kind === 'investor' ? 'validateInvestor'
    : 'togglePartnershipValidation';

  return `
    <div class="validation-actions">
      ${getValidationButtonOptions().map((option) => `
        <button
          class="btn btn-validation ${safeLevel === option.level ? option.activeClass : 'btn-secondary'}"
          onclick="${handlerName}(${id}, ${option.level})"
        >
          ${option.label}
        </button>
      `).join('')}
    </div>
  `;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderSectorLabelOptions();
  loadSectorLabelOptions();
  initTabs();
  initEventListeners();
  initInvestorForm();
  loadEnterpriseFilterOptions();
  refreshEnterpriseSegmentCounts();
  loadEnterprises();
});

// ===== TABS =====
function initTabs() {
  document.querySelectorAll('.tab-btn:not(#explorerBtn)').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });
  
  const explorerBtn = document.getElementById('explorerBtn');
  if (explorerBtn) {
    explorerBtn.addEventListener('click', () => {
      window.open('/data-explorer.html', '_blank');
    });
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  if (tabName === 'investors') {
    document.getElementById('investors').classList.add('active');
    if (!hasLoadedInvestorTab) { hasLoadedInvestorTab = true; refreshInvestorCounts(); }
    loadInvestors();
    return;
  }

  document.getElementById(tabName).classList.add('active');

  // Reset investor filter when navigating away from investor view
  if (enterpriseOrgTypeFilter && tabName !== 'investors') {
    enterpriseOrgTypeFilter = '';
  }

  if (tabName === 'investors' && !hasLoadedInvestorTab) {
    hasLoadedInvestorTab = true;
    loadInvestors();
  }
  if (tabName === 'partnerships' && !hasLoadedPartnershipTab) {
    hasLoadedPartnershipTab = true;
    refreshPartnershipSegmentCounts();
    loadPartnerships();
  }
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
  // Close button
  document.getElementById('closeBtn').addEventListener('click', () => {
    closeApplication();
  });

  // Companies
  document.getElementById('addEnterpriseBtn').addEventListener('click', () => {
    openEnterpriseForm();
  });

  document.getElementById('cancelEnterpriseBtn').addEventListener('click', () => {
    closeEnterpriseForm();
  });

  document.getElementById('enterpriseInputForm').addEventListener('submit', submitEnterpriseForm);
  document.getElementById('entSectorLabels').addEventListener('click', onSectorLabelPickerClick);
  document.getElementById('entEndYear').addEventListener('input', toggleDeadCompanyButton);
  document.getElementById('confirmDeadCompanyBtn').addEventListener('click', confirmDeadCompany);
  document.getElementById('investorSearch').addEventListener('input', (e) => {
    investorSearchQuery = e.target.value.trim();
    investorPage = 1;
    refreshInvestorCounts();
    loadInvestors();
  });
  document.querySelectorAll('.investor-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchInvestorSegment(btn.dataset.investorSegment));
  });
  document.getElementById('enterpriseSearch').addEventListener('input', searchEnterprises);
  document.getElementById('enterpriseAnythingSearch').addEventListener('input', searchAnythingEnterprises);
  document.getElementById('enterpriseSectorFilter').addEventListener('change', onEnterpriseFiltersChanged);
  document.getElementById('enterpriseCountryFilter').addEventListener('change', onEnterpriseFiltersChanged);
  document.getElementById('resetEnterpriseFiltersBtn').addEventListener('click', resetEnterpriseFilters);
  document.querySelectorAll('.enterprise-subtab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchEnterpriseSegment(btn.dataset.enterpriseSegment);
    });
  });

  // Partnerships
  document.getElementById('addPartnershipBtn').addEventListener('click', () => {
    openPartnershipForm();
  });

  document.getElementById('cancelPartnershipBtn').addEventListener('click', () => {
    closePartnershipForm();
  });

  document.getElementById('partnershipInputForm').addEventListener('submit', submitPartnershipForm);
  document.getElementById('partnershipSearch').addEventListener('input', searchPartnerships);
  document.querySelectorAll('.partnership-subtab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchPartnershipSegment(btn.dataset.partnershipSegment);
    });
  });
}

// ===== INVESTORS =====
let investorSegment = 'later';
const investorSegmentCounts = { pending:0, partial:0, validated:0, later:0, total:0 };

async function refreshInvestorCounts() {
  const params = new URLSearchParams();
  if (investorSearchQuery) params.set('q', investorSearchQuery);
  try {
    const r = await fetch(`/api/investors/counts?${params}`);
    const d = await r.json();
    Object.assign(investorSegmentCounts, d);
    renderInvestorSubtabCounters();
    const btn = document.querySelector('.tab-btn[data-tab="investors"]');
    if (btn) btn.textContent = `Investors (${d.total || 0})`;
  } catch(e) { console.error(e); }
}

function renderInvestorSubtabCounters() {
  const labels = { pending:'Not validated', partial:'Partially validated', validated:'Validated', later:'To review later' };
  document.querySelectorAll('.investor-subtab-btn').forEach(btn => {
    const seg = btn.dataset.investorSegment;
    btn.textContent = `${labels[seg]} (${investorSegmentCounts[seg] || 0})`;
    btn.classList.toggle('active', seg === investorSegment);
  });
}

function switchInvestorSegment(segment) {
  investorSegment = segment;
  investorPage = 1;
  renderInvestorSubtabCounters();
  loadInvestors();
}

async function loadInvestors() {
  if (investorSearchAbortController) investorSearchAbortController.abort();
  const abortController = new AbortController();
  investorSearchAbortController = abortController;

  const params = new URLSearchParams({ segment: investorSegment, page: investorPage, limit: 50 });
  if (investorSearchQuery) params.set('q', investorSearchQuery);

  try {
    const response = await fetch(`/api/investors?${params}`, { signal: abortController.signal });
    const data = await response.json();
    const container = document.getElementById('investorsList');

    if (!data.items || data.items.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💼</div><div class="empty-state-text">No investor found</div></div>';
    } else {
      container.innerHTML = data.items.map(inv => `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title-row">
                <div class="card-title">${escapeHtml(inv.name || '')}</div>
              </div>
              <div class="card-subtitle">
                ${inv.investor_type ? `<span class="badge">${escapeHtml(inv.investor_type)}</span>` : ''}
                ${inv.sector ? `<span class="badge badge-sector">${escapeHtml(inv.sector)}</span>` : ''}
                ${inv.country ? `<span class="badge badge-country">${escapeHtml(inv.country)}</span>` : ''}
                ${inv.founded_year ? `<span class="badge">${inv.founded_year}</span>` : ''}
                <span class="badge ${getValidationMeta(inv.is_validated, true).badgeClass}">${getValidationMeta(inv.is_validated, true).label}</span>
              </div>
            </div>
            <div class="card-actions">
              ${renderValidationButtons('investor', inv.id, inv.is_validated)}
              <button class="btn btn-warning" onclick="editInvestor(${inv.id})">✏️ Edit</button>
              <button class="btn btn-danger" onclick="deleteInvestor(${inv.id})">🗑️ Delete</button>
            </div>
          </div>
          <div class="card-content">
            <div class="enterprise-fields-grid">
              ${inv.description ? `<div class="field field-full"><div class="field-label">Description</div><div class="field-value">${escapeHtml(inv.description)}</div></div>` : ''}
              ${inv.headquarter_city ? `<div class="field"><div class="field-label">HQ city</div><div class="field-value">${escapeHtml(inv.headquarter_city)}</div></div>` : ''}
              ${inv.ownership ? `<div class="field field-wide"><div class="field-label">Owned by</div><div class="field-value">${escapeHtml(inv.ownership)}</div></div>` : ''}
              ${inv.participations ? `<div class="field field-wide"><div class="field-label">Participations (minority)</div><div class="field-value">${escapeHtml(inv.participations)}</div></div>` : ''}
              ${inv.main_competitors ? `<div class="field field-wide"><div class="field-label">Competitors</div><div class="field-value">${escapeHtml(inv.main_competitors)}</div></div>` : ''}
              ${inv.acquisitions ? `<div class="field field-wide"><div class="field-label">Acquisitions (control)</div><div class="field-value">${escapeHtml(inv.acquisitions)}</div></div>` : ''}
              ${inv.key_resources ? `<div class="field field-wide"><div class="field-label">Key resources</div><div class="field-value">${escapeHtml(inv.key_resources)}</div></div>` : ''}
              ${inv.strategic_partnerships ? `<div class="field field-wide"><div class="field-label">Strategic partners</div><div class="field-value">${escapeHtml(inv.strategic_partnerships)}</div></div>` : ''}
              <div class="field"><div class="field-label">Mkt cap</div><div class="field-value">${formatMillionsUsd(inv.capitalization)}</div></div>
              <div class="field"><div class="field-label">Capital investi</div><div class="field-value">${formatMillionsUsd(inv.capital_investi)}</div></div>
              <div class="field"><div class="field-label">Revenue</div><div class="field-value">${formatMillionsUsd(inv.revenue_millions)}</div></div>
              ${inv.employees_count ? `<div class="field"><div class="field-label">Staff</div><div class="field-value">${inv.employees_count}</div></div>` : ''}
              ${inv.website ? `<div class="field field-wide"><div class="field-label">Website</div><div class="field-value"><a href="${escapeHtml(inv.website)}" target="_blank">${escapeHtml(inv.website)}</a></div></div>` : ''}
              ${inv.logo_url ? `<div class="field field-full field-logo"><div class="field-label">Logo</div><div class="field-value logo-field-value"><div class="logo-frame"><img src="${escapeHtml(inv.logo_url)}" alt="${escapeHtml(inv.name)}" loading="lazy"></div></div></div>` : ''}
              <div class="field field-timestamps field-full"><div class="field-label">Tracking</div><div class="field-value timestamp-grid"><span><strong>Created:</strong> ${formatAuditTimestamp(inv.created_at)}</span><span><strong>Last updated:</strong> ${formatAuditTimestamp(inv.updated_at)}</span></div></div>
            </div>
          </div>
        </div>
      `).join('');
    }

    const pag = data.pagination;
    const pagEl = document.getElementById('investorsPagination');
    pagEl.innerHTML = pag && pag.totalPages > 1 ? `
      <button onclick="investorPage=${Math.max(1,investorPage-1)};loadInvestors()" ${investorPage===1?'disabled':''}>Previous</button>
      <span>Page ${pag.page} / ${pag.totalPages} (${pag.total})</span>
      <button onclick="investorPage=${Math.min(pag.totalPages,investorPage+1)};loadInvestors()" ${investorPage===pag.totalPages?'disabled':''}>Next</button>
    ` : (pag ? `<span>${pag.total} investors</span>` : '');
  } catch (e) {
    if (e.name !== 'AbortError') console.error(e);
  }
}

async function validateInvestor(id, level) {
  await fetch(`/api/investors/${id}/validation`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({is_validated:level}) });
  refreshInvestorCounts();
  loadInvestors();
}

async function deleteInvestor(id) {
  if (!confirm('Delete this investor?')) return;
  await fetch(`/api/investors/${id}`, { method: 'DELETE' });
  refreshInvestorCounts();
  loadInvestors();
}

async function editInvestor(id) {
  const r = await fetch(`/api/investors/${id}`);
  if (!r.ok) return alert('Investor not found');
  const inv = await r.json();

  document.getElementById('investorFormTitle').textContent = `Edit: ${inv.name}`;
  document.getElementById('invId').value = inv.id;
  document.getElementById('invInvestorType').value = inv.investor_type || '';
  document.getElementById('invName').value = inv.name || '';
  document.getElementById('invCountry').value = inv.country || '';
  document.getElementById('invCity').value = inv.headquarter_city || '';
  document.getElementById('invYear').value = inv.founded_year || '';
  document.getElementById('invStatus').value = inv.company_status || 'Active';
  document.getElementById('invDescription').value = inv.description || '';
  document.getElementById('invCapitalization').value = inv.capitalization || '';
  document.getElementById('invFunds').value = inv.capital_investi || '';
  document.getElementById('invRevenue').value = inv.revenue_millions || '';
  document.getElementById('invEmployees').value = inv.employees_count || '';
  document.getElementById('invOwnership').value = inv.ownership || '';
  document.getElementById('invParticipation').value = inv.participations || '';
  document.getElementById('invAcquisitions').value = inv.acquisitions || '';
  document.getElementById('invPartnerships').value = inv.strategic_partnerships || '';
  document.getElementById('invKeyResources').value = inv.key_resources || '';
  document.getElementById('invCompetitors').value = inv.main_competitors || '';
  document.getElementById('invWebsite').value = inv.website || '';
  document.getElementById('invLogo').value = inv.logo_url || '';
  document.getElementById('invValidated').value = inv.is_validated ?? 3;

  document.getElementById('investorForm').classList.remove('hidden');
  document.getElementById('investorForm').scrollIntoView({ behavior: 'smooth' });
}

function initInvestorForm() {
  document.getElementById('addInvestorBtn').addEventListener('click', () => {
    document.getElementById('investorFormTitle').textContent = 'New Investor';
    document.getElementById('investorInputForm').reset();
    document.getElementById('invId').value = '';
    document.getElementById('investorForm').classList.remove('hidden');
    document.getElementById('investorForm').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('cancelInvestorBtn').addEventListener('click', () => {
    document.getElementById('investorForm').classList.add('hidden');
  });

  document.getElementById('investorInputForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('invId').value;
    const body = {
      investor_type: document.getElementById('invInvestorType').value || null,
      name: document.getElementById('invName').value.trim(),
      country: document.getElementById('invCountry').value.trim() || null,
      headquarter_city: document.getElementById('invCity').value.trim() || null,
      founded_year: parseInt(document.getElementById('invYear').value) || null,
      company_status: document.getElementById('invStatus').value || null,
      description: document.getElementById('invDescription').value.trim() || null,
      capitalization: parseFloat(document.getElementById('invCapitalization').value) || null,
      capital_investi: parseFloat(document.getElementById('invFunds').value) || null,
      revenue_millions: parseFloat(document.getElementById('invRevenue').value) || null,
      employees_count: parseInt(document.getElementById('invEmployees').value) || null,
      ownership: document.getElementById('invOwnership').value.trim() || null,
      participations: document.getElementById('invParticipation').value.trim() || null,
      acquisitions: document.getElementById('invAcquisitions').value.trim() || null,
      strategic_partnerships: document.getElementById('invPartnerships').value.trim() || null,
      key_resources: document.getElementById('invKeyResources').value.trim() || null,
      main_competitors: document.getElementById('invCompetitors').value.trim() || null,
      website: document.getElementById('invWebsite').value.trim() || null,
      logo_url: document.getElementById('invLogo').value.trim() || null,
      is_validated: parseInt(document.getElementById('invValidated').value),
    };

    const url = id ? `/api/investors/${id}` : '/api/investors';
    const method = id ? 'PATCH' : 'POST';
    const r = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (!r.ok) { const err = await r.json(); return alert(err.error); }

    document.getElementById('investorForm').classList.add('hidden');
    refreshInvestorCounts();
    loadInvestors();
  });
}

// ===== ENTERPRISES =====
async function loadEnterprises() {
  if (enterpriseListAbortController) {
    enterpriseListAbortController.abort();
  }

  const abortController = new AbortController();
  enterpriseListAbortController = abortController;

  try {
    const params = new URLSearchParams({
      page: String(enterprisePagination.page),
      limit: String(enterprisePagination.limit)
    });

    params.set('segment', enterpriseSegment);

    if (enterpriseSearchQuery) {
      params.set('q', enterpriseSearchQuery);
    }
    if (enterpriseAnythingQuery) {
      params.set('anything', enterpriseAnythingQuery);
    }
    if (enterpriseSectorFilter) {
      params.set('sector', enterpriseSectorFilter);
    }
    if (enterpriseCountryFilter) {
      params.set('country', enterpriseCountryFilter);
    }
    if (enterpriseOrgTypeFilter) {
      params.set('orgType', enterpriseOrgTypeFilter);
    }

    const response = await fetch(`/api/enterprises?${params.toString()}`, {
      signal: abortController.signal
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Server error');
    }

    enterprises = payload.items || [];
  enterpriseMetricHistoryCache.clear();
    filteredEnterprises = enterprises;
    if (payload.pagination) {
      Object.assign(enterprisePagination, payload.pagination);
    }
    renderEnterprises();
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error while loading companies:', error);
    showError('Error while loading companies');
  } finally {
    if (enterpriseListAbortController === abortController) {
      enterpriseListAbortController = null;
    }
  }
}

function renderEnterprises() {
  const container = document.getElementById('enterprisesList');

  if (filteredEnterprises.length === 0) {
    const emptyLabel = getEnterpriseEmptyLabel();
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏢</div>
        <div class="empty-state-text">${emptyLabel}</div>
      </div>
    `;
    renderEnterprisePagination();
    return;
  }

  const totalRankedItems = filteredEnterprises.length;
  const topRankingSegment = isTopRankingSegment(enterpriseSegment);
  const rankOffset = topRankingSegment
    ? Math.max((enterprisePagination.page - 1) * enterprisePagination.limit, 0)
    : 0;

  container.innerHTML = filteredEnterprises.map((ent, index) => {
    const rank = rankOffset + index + 1;
    const rankTier = getRankTierClass(rank, totalRankedItems);

    return `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title-row">
            <div class="card-title">${ent.name}</div>
            ${topRankingSegment ? `<span class="rank-sticker ${rankTier.cssClass}" title="Top ${rankTier.percentile.toFixed(1)}%">#${rank}</span>` : ''}
          </div>
          <div class="card-subtitle">
            ${ent.sector ? `<span class="badge badge-sector">${ent.sector}</span>` : ''}
            ${ent.organization_type ? `<span class="badge">${escapeHtml(ent.organization_type)}</span>` : ''}
            ${ent.country ? `<span class="badge badge-country">${ent.country}</span>` : ''}
            ${ent.founded_year ? `<span class="badge">${ent.founded_year}</span>` : ''}
            <span class="badge ${getValidationMeta(ent.is_validated, true).badgeClass}">${getValidationMeta(ent.is_validated, true).label}</span>
          </div>
        </div>
        <div class="card-actions">
          ${renderValidationButtons('enterprise', ent.id, ent.is_validated)}
          <button class="btn btn-warning" onclick="editEnterprise(${ent.id})">✏️ Edit</button>
          <button class="btn btn-danger" onclick="deleteEnterprise(${ent.id})">🗑️ Delete</button>
        </div>
      </div>
      <div class="card-content">
        <div class="enterprise-fields-grid">
        ${ent.description ? `<div class="field field-full"><div class="field-label">Description</div><div class="field-value">${escapeHtml(ent.description)}</div></div>` : ''}
        ${ent.organization_type ? `<div class="field"><div class="field-label">Org type</div><div class="field-value">${escapeHtml(ent.organization_type)}</div></div>` : ''}
        ${ent.headquarter_city ? `<div class="field"><div class="field-label">HQ city</div><div class="field-value">${escapeHtml(ent.headquarter_city)}</div></div>` : ''}
        ${ent.main_investors ? `<div class="field field-wide"><div class="field-label">Investors</div><div class="field-value">${escapeHtml(ent.main_investors)}</div></div>` : ''}
        ${ent.main_competitors ? `<div class="field field-wide"><div class="field-label">Competitors</div><div class="field-value">${escapeHtml(ent.main_competitors)}</div></div>` : ''}
        ${ent.participation ? `<div class="field field-wide"><div class="field-label">Participation</div><div class="field-value">${escapeHtml(ent.participation)}</div></div>` : ''}
        ${ent.main_acquisitions ? `<div class="field field-wide"><div class="field-label">Acquisitions</div><div class="field-value">${escapeHtml(ent.main_acquisitions)}</div></div>` : ''}
        ${ent.key_resources ? `<div class="field field-wide"><div class="field-label">Key resources</div><div class="field-value">${escapeHtml(ent.key_resources)}</div></div>` : ''}
        ${ent.strategic_partnerships ? `<div class="field field-wide"><div class="field-label">Strategic partners</div><div class="field-value">${escapeHtml(ent.strategic_partnerships)}</div></div>` : ''}
        ${topRankingSegment ? `<div class="field"><div class="field-label">Top score</div><div class="field-value">${formatAbsoluteUsd(ent.ranking_score)}</div></div>` : ''}
        <div class="field"><div class="field-label">Mkt cap</div><div class="field-value">${formatMillionsUsd(ent.capitalization)}</div></div>
        <div class="field"><div class="field-label">Funds</div><div class="field-value">${formatMillionsUsd(ent.funds_raised)}</div></div>
        <div class="field"><div class="field-label">Revenue</div><div class="field-value">${formatMillionsUsd(ent.revenue_millions)}</div></div>
        <div class="field"><div class="field-label">Profit</div><div class="field-value">${formatMillionsUsd(ent.profit_millions)}</div></div>
        <div class="field"><div class="field-label">R&D</div><div class="field-value">${formatMillionsUsd(ent.rd_expenses_millions)}</div></div>
        <div class="field"><div class="field-label">Capex</div><div class="field-value">${formatMillionsUsd(ent.capex_millions)}</div></div>
        ${ent.employees_count ? `<div class="field"><div class="field-label">Staff</div><div class="field-value">${ent.employees_count}</div></div>` : ''}
        ${ent.community_size ? `<div class="field"><div class="field-label">Community size</div><div class="field-value">${ent.community_size}${ent.community_unit ? ` ${escapeHtml(ent.community_unit)}` : ''}</div></div>` : ''}
        ${ent.website ? `<div class="field field-wide"><div class="field-label">Website</div><div class="field-value"><a href="${ent.website}" target="_blank">${ent.website}</a></div></div>` : ''}
        ${ent.logo_url ? `<div class="field field-full field-logo"><div class="field-label">Logo</div><div class="field-value logo-field-value"><div class="logo-frame"><img src="${ent.logo_url}" alt="${ent.name}" loading="lazy" decoding="async"></div></div></div>` : ''}
        <div class="field field-timestamps field-full">
          <div class="field-label">Tracking</div>
          <div class="field-value timestamp-grid">
            <span><strong>Created:</strong> ${formatAuditTimestamp(ent.created_at)}</span>
            <span><strong>Last updated:</strong> ${formatAuditTimestamp(ent.updated_at)}</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  `;
  }).join('');

  renderEnterprisePagination();
}

function getEnterpriseEmptyLabel() {
  if (enterpriseSegment === 'partial') {
    return 'No partially validated company';
  }
  if (enterpriseSegment === 'validated') {
    return 'No validated company';
  }
  if (enterpriseSegment === 'later') {
    return 'No company marked for later review';
  }
  if (enterpriseSegment === 'investor') {
    return 'No investor found';
  }
  if (enterpriseSegment === 'companieswithoutcompetitors') {
    return 'No company without competitors';
  }
  if (enterpriseSegment === 'top100') {
    return 'No available valuation for Top100';
  }
  return 'No company to validate';
}

function switchEnterpriseSegment(segment) {
  enterpriseSegment = segment;
  enterprisePagination.page = 1;
  document.querySelectorAll('.enterprise-subtab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.enterpriseSegment === segment);
  });
  loadEnterprises();
}

function renderEnterpriseSubtabCounters() {
  const labels = {
    pending: 'Not validated',
    partial: 'Partially validated',
    validated: 'Validated',
    later: 'To review later',
    investor: 'Investors',
    companieswithoutcompetitors: 'Companies without competitors',
    top100: 'Top100'
  };

  document.querySelectorAll('.enterprise-subtab-btn').forEach((btn) => {
    const segment = btn.dataset.enterpriseSegment;
    const count = enterpriseSegmentCounts[segment] || 0;
    btn.textContent = `${labels[segment]} (${count})`;
  });

  // Update the main nav Investors tab button
  const investorNavBtn = document.querySelector('.tab-btn[data-tab="investors"]');
  if (investorNavBtn) {
    investorNavBtn.textContent = `Investors (${enterpriseSegmentCounts.investor || 0})`;
  }
}

async function refreshEnterpriseSegmentCounts() {
  if (enterpriseCountsAbortController) {
    enterpriseCountsAbortController.abort();
  }

  const abortController = new AbortController();
  enterpriseCountsAbortController = abortController;

  try {
    const params = new URLSearchParams();
    if (enterpriseSearchQuery) {
      params.set('q', enterpriseSearchQuery);
    }
    if (enterpriseAnythingQuery) {
      params.set('anything', enterpriseAnythingQuery);
    }
    if (enterpriseSectorFilter) {
      params.set('sector', enterpriseSectorFilter);
    }
    if (enterpriseCountryFilter) {
      params.set('country', enterpriseCountryFilter);
    }
    if (enterpriseOrgTypeFilter) {
      params.set('orgType', enterpriseOrgTypeFilter);
    }

    const response = await fetch(`/api/enterprises/counts?${params.toString()}`, {
      signal: abortController.signal
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error('Error while loading counters');
    }

    enterpriseSegmentCounts.pending = payload.pending || 0;
    enterpriseSegmentCounts.partial = payload.partial || 0;
    enterpriseSegmentCounts.validated = payload.validated || 0;
    enterpriseSegmentCounts.later = payload.later || 0;
    enterpriseSegmentCounts.investor = payload.investor || 0;
    enterpriseSegmentCounts.companieswithoutcompetitors = payload.companieswithoutcompetitors || 0;
    enterpriseSegmentCounts.top100 = payload.top100 || 0;
    renderEnterpriseSubtabCounters();
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error while loading company counters:', error);
  } finally {
    if (enterpriseCountsAbortController === abortController) {
      enterpriseCountsAbortController = null;
    }
  }
}

function renderEnterprisePagination() {
  const container = document.getElementById('enterprisePagination');
  if (!container) return;

  if (enterprisePagination.total <= enterprisePagination.limit) {
    container.innerHTML = '';
    return;
  }

  const from = enterprisePagination.total === 0
    ? 0
    : ((enterprisePagination.page - 1) * enterprisePagination.limit) + 1;
  const to = Math.min(
    enterprisePagination.page * enterprisePagination.limit,
    enterprisePagination.total
  );

  container.innerHTML = `
    <div class="pagination-content">
      <button class="btn btn-secondary" onclick="goToPreviousEnterprisePage()" ${enterprisePagination.hasPreviousPage ? '' : 'disabled'}>
        ← Previous
      </button>
      <div class="pagination-info">
        Page ${enterprisePagination.page} / ${enterprisePagination.totalPages} - ${from}-${to} of ${enterprisePagination.total}
      </div>
      <button class="btn btn-secondary" onclick="goToNextEnterprisePage()" ${enterprisePagination.hasNextPage ? '' : 'disabled'}>
        Next →
      </button>
    </div>
  `;
}

function openEnterpriseForm() {
  isEditingEnterprise = false;
  currentEditingId = null;
  document.getElementById('formTitle').textContent = 'New Company';
  clearEnterpriseForm();
  hideEnterpriseFormMetricsPanel();
  document.getElementById('entValidated').value = String(getValidationLevelForSegment(enterpriseSegment));
  setEnterpriseSectorFromValue('');
  document.getElementById('enterpriseForm').classList.remove('hidden');
}

function editEnterprise(id) {
  isEditingEnterprise = true;
  currentEditingId = id;
  const ent = enterprises.find(e => e.id === id);

  if (ent) {
    document.getElementById('formTitle').textContent = 'Edit Company';
    document.getElementById('entName').value = ent.name;
    setEnterpriseSectorFromValue(ent.sector || '');
    document.getElementById('entOrganizationType').value = ent.organization_type || '';
    document.getElementById('entCompanyStatus').value = ent.company_status || 'Active';
    document.getElementById('entCountry').value = ent.country || '';
    document.getElementById('entHeadquarterCity').value = ent.headquarter_city || '';
    document.getElementById('entYear').value = ent.founded_year || '';
    document.getElementById('entEndYear').value = ent.end_year || '';
    document.getElementById('entEndReason').value = ent.end_reason || '';
    toggleDeadCompanyButton();
    document.getElementById('entDescription').value = ent.description || '';
    document.getElementById('entMainInvestors').value = ent.main_investors || '';
    document.getElementById('entMainCompetitors').value = ent.main_competitors || '';
    document.getElementById('entParticipation').value = ent.participation || '';
    document.getElementById('entMainAcquisitions').value = ent.main_acquisitions || '';
    document.getElementById('entKeyResources').value = ent.key_resources || '';
    document.getElementById('entStrategicPartnerships').value = ent.strategic_partnerships || '';
    document.getElementById('entWebsite').value = ent.website || '';
    document.getElementById('entLogo').value = ent.logo_url || '';
    document.getElementById('entCapitalization').value = parseMillionsValue(ent.capitalization) ?? '';
    document.getElementById('entFundsRaised').value = parseMillionsValue(ent.funds_raised) ?? '';
    document.getElementById('entRevenueMillions').value = parseMillionsValue(ent.revenue_millions) ?? '';
    document.getElementById('entProfitMillions').value = parseMillionsValue(ent.profit_millions) ?? '';
    document.getElementById('entRdExpensesMillions').value = parseMillionsValue(ent.rd_expenses_millions) ?? '';
    document.getElementById('entCapexMillions').value = parseMillionsValue(ent.capex_millions) ?? '';
    document.getElementById('entEmployees').value = ent.employees_count || '';
    document.getElementById('entCommunitySize').value = ent.community_size || '';
    document.getElementById('entCommunityUnit').value = ent.community_unit || '';
    document.getElementById('entValidated').value = String(normalizeValidationLevel(ent.is_validated));
    document.getElementById('enterpriseForm').classList.remove('hidden');
    renderEnterpriseFormMetricsPanel(id);
    document.getElementById('enterpriseForm').scrollIntoView({ behavior: 'auto' });
  }
}

function clearEnterpriseForm() {
  document.getElementById('enterpriseInputForm').reset();
}

function closeEnterpriseForm() {
  document.getElementById('enterpriseForm').classList.add('hidden');
  hideEnterpriseFormMetricsPanel();
  clearEnterpriseForm();
  isEditingEnterprise = false;
  currentEditingId = null;
}

function toggleDeadCompanyButton() {
  const endYear = document.getElementById('entEndYear').value.trim();
  const container = document.getElementById('deadCompanyButtonContainer');
  if (endYear) {
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}

function confirmDeadCompany() {
  const endReason = document.getElementById('entEndReason').value;
  const statusMap = {
    'Acquisition': 'Acquired',
    'Bankruptcy': 'Bankrupt',
    'Merger': 'Inactive',
    'Closure': 'Inactive'
  };
  const newStatus = statusMap[endReason] || 'Inactive';
  document.getElementById('entCompanyStatus').value = newStatus;
  showSuccess(`Company status set to "${newStatus}"`);
}

async function submitEnterpriseForm(e) {
  e.preventDefault();

  const selectedSectorLabels = getEnterpriseSectorLabels();
  if (selectedSectorLabels.length > 5) {
    showError('Please select up to 5 sector labels');
    return;
  }

  const name = document.getElementById('entName').value.trim();
  if (!name) {
    showError('Company name is required');
    return;
  }

  let capitalizationMillions;
  let fundsRaisedMillions;
  let revenueMillions;
  let profitMillions;
  let rdExpensesMillions;
  let capexMillions;

  try {
    capitalizationMillions = parseMillionsInputValue('entCapitalization', 'Market cap');
    fundsRaisedMillions = parseMillionsInputValue('entFundsRaised', 'Funds raised');
    revenueMillions = parseMillionsInputValue('entRevenueMillions', 'Revenue');
    profitMillions = parseMillionsInputValue('entProfitMillions', 'Profit', { allowNegative: true });
    rdExpensesMillions = parseMillionsInputValue('entRdExpensesMillions', 'R&D expenses');
    capexMillions = parseMillionsInputValue('entCapexMillions', 'Capex');
  } catch (error) {
    showError(error.message);
    return;
  }

  const data = {
    name,
    sector: selectedSectorLabels.length > 0 ? selectedSectorLabels.join(', ') : null,
    organization_type: document.getElementById('entOrganizationType').value?.trim() || null,
    company_status: document.getElementById('entCompanyStatus').value?.trim() || null,
    country: document.getElementById('entCountry').value?.trim() || null,
    headquarter_city: document.getElementById('entHeadquarterCity').value?.trim() || null,
    founded_year: document.getElementById('entYear').value ? parseInt(document.getElementById('entYear').value, 10) : null,
    end_year: document.getElementById('entEndYear').value ? parseInt(document.getElementById('entEndYear').value, 10) : null,
    end_reason: document.getElementById('entEndReason').value?.trim() || null,
    description: document.getElementById('entDescription').value?.trim() || null,
    main_investors: document.getElementById('entMainInvestors').value?.trim() || null,
    main_competitors: document.getElementById('entMainCompetitors').value?.trim() || null,
    participation: document.getElementById('entParticipation').value?.trim() || null,
    main_acquisitions: document.getElementById('entMainAcquisitions').value?.trim() || null,
    key_resources: document.getElementById('entKeyResources').value?.trim() || null,
    strategic_partnerships: document.getElementById('entStrategicPartnerships').value?.trim() || null,
    website: document.getElementById('entWebsite').value?.trim() || null,
    logo_url: document.getElementById('entLogo').value?.trim() || null,
    capitalization: capitalizationMillions,
    funds_raised: fundsRaisedMillions,
    revenue_millions: revenueMillions,
    profit_millions: profitMillions,
    rd_expenses_millions: rdExpensesMillions,
    capex_millions: capexMillions,
    employees_count: document.getElementById('entEmployees').value ? parseInt(document.getElementById('entEmployees').value, 10) : null,
    community_size: document.getElementById('entCommunitySize').value ? parseInt(document.getElementById('entCommunitySize').value, 10) : null,
    community_unit: document.getElementById('entCommunityUnit').value?.trim() || null,
    is_validated: normalizeValidationLevel(document.getElementById('entValidated').value)
  };

  try {
    let response;
    if (isEditingEnterprise && currentEditingId) {
      response = await fetch(`/api/enterprises/${currentEditingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      response = await fetch('/api/enterprises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    const responseBody = await response.text();
    let parsedBody = null;
    try {
      parsedBody = responseBody ? JSON.parse(responseBody) : null;
    } catch (err) {
      parsedBody = null;
    }

    if (response.ok) {
      showSuccess(isEditingEnterprise ? 'Company updated ✓' : 'Company created ✓');
      closeEnterpriseForm();
      refreshEnterpriseSegmentCounts();
      loadEnterprises();
    } else {
      const message = parsedBody?.error || responseBody || 'Error while saving';
      showError(message);
      console.error('Save failed:', message);
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error while saving');
  }
}

async function deleteEnterprise(id) {
  if (!confirm('Are you sure you want to delete this company? Related relationships will also be deleted.')) {
    return;
  }

  try {
    const response = await fetch(`/api/enterprises/${id}`, { method: 'DELETE' });
    if (response.ok) {
      showSuccess('Company deleted ✓');
      refreshEnterpriseSegmentCounts();
      loadEnterprises();
      loadPartnerships();
    } else {
      showError('Error while deleting');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error while deleting');
  }
}

async function toggleEnterpriseValidation(id, validationLevel) {
  try {
    const response = await fetch(`/api/enterprises/${id}/validation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_validated: normalizeValidationLevel(validationLevel) })
    });

    if (response.ok) {
      showSuccess('Validation level updated ✓');
      refreshEnterpriseSegmentCounts();
      loadEnterprises();
    } else {
      const error = await response.json();
      showError(error.error || 'Error while updating validation');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error while updating validation');
  }
}

function searchEnterprises(e) {
  enterpriseSearchQuery = e.target.value.trim();
  enterprisePagination.page = 1;

  if (enterpriseSearchDebounceTimer) {
    clearTimeout(enterpriseSearchDebounceTimer);
  }

  enterpriseSearchDebounceTimer = setTimeout(async () => {
    loadEnterprises();
  }, 400);
}

function searchAnythingEnterprises(e) {
  enterpriseAnythingQuery = e.target.value.trim();
  enterprisePagination.page = 1;

  if (enterpriseSearchDebounceTimer) {
    clearTimeout(enterpriseSearchDebounceTimer);
  }

  enterpriseSearchDebounceTimer = setTimeout(async () => {
    await Promise.all([
      refreshEnterpriseSegmentCounts(),
      loadEnterprises()
    ]);
  }, 400);
}

async function onEnterpriseFiltersChanged() {
  enterpriseSectorFilter = document.getElementById('enterpriseSectorFilter').value;
  enterpriseCountryFilter = document.getElementById('enterpriseCountryFilter').value;
  enterprisePagination.page = 1;
  await loadEnterpriseFilterOptions();
  syncEnterpriseFilterStateFromInputs();
  await Promise.all([
    refreshEnterpriseSegmentCounts(),
    loadEnterprises()
  ]);
}

async function resetEnterpriseFilters() {
  enterpriseSearchQuery = '';
  enterpriseAnythingQuery = '';
  enterpriseSectorFilter = '';
  enterpriseCountryFilter = '';
  enterprisePagination.page = 1;

  const searchInput = document.getElementById('enterpriseSearch');
  const anythingSearchInput = document.getElementById('enterpriseAnythingSearch');
  const sectorSelect = document.getElementById('enterpriseSectorFilter');
  const countrySelect = document.getElementById('enterpriseCountryFilter');

  if (searchInput) searchInput.value = '';
  if (anythingSearchInput) anythingSearchInput.value = '';
  if (sectorSelect) sectorSelect.value = '';
  if (countrySelect) countrySelect.value = '';

  await loadEnterpriseFilterOptions();
  syncEnterpriseFilterStateFromInputs();
  await Promise.all([
    refreshEnterpriseSegmentCounts(),
    loadEnterprises()
  ]);
}

async function loadEnterpriseFilterOptions() {
  if (enterpriseFiltersAbortController) {
    enterpriseFiltersAbortController.abort();
  }

  const abortController = new AbortController();
  enterpriseFiltersAbortController = abortController;

  if (enterpriseFilterOptionsLoadingPromise) {
    await enterpriseFilterOptionsLoadingPromise;
    return;
  }

  enterpriseFilterOptionsLoadingPromise = (async () => {
    const params = new URLSearchParams();
    if (enterpriseSectorFilter) {
      params.set('sector', enterpriseSectorFilter);
    }
    if (enterpriseCountryFilter) {
      params.set('country', enterpriseCountryFilter);
    }

    const response = await fetch(`/api/enterprises/filters?${params.toString()}`, {
      signal: abortController.signal
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Server error');
    }

    populateEnterpriseFilterSelect('enterpriseSectorFilter', payload.sectors || [], 'All sectors');
    populateEnterpriseFilterSelect('enterpriseCountryFilter', payload.countries || [], 'All countries');
  })();

  try {
    await enterpriseFilterOptionsLoadingPromise;
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error while loading company filters:', error);
    showError('Error while loading filters');
  } finally {
    enterpriseFilterOptionsLoadingPromise = null;
    if (enterpriseFiltersAbortController === abortController) {
      enterpriseFiltersAbortController = null;
    }
  }
}

function syncEnterpriseFilterStateFromInputs() {
  const sectorSelect = document.getElementById('enterpriseSectorFilter');
  const countrySelect = document.getElementById('enterpriseCountryFilter');

  enterpriseSectorFilter = sectorSelect ? sectorSelect.value : '';
  enterpriseCountryFilter = countrySelect ? countrySelect.value : '';
}

function populateEnterpriseFilterSelect(selectId, values, defaultLabel) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = defaultLabel;
  select.appendChild(defaultOption);

  const normalizedValues = (values || []).map((item) => {
    if (typeof item === 'string') {
      return { value: item, count: null };
    }
    return {
      value: item?.value || '',
      count: Number.isFinite(item?.count) ? item.count : null
    };
  }).filter((item) => item.value);

  normalizedValues.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.count !== null ? `${item.value} (${item.count})` : item.value;
    select.appendChild(option);
  });

  if (currentValue && normalizedValues.some((item) => item.value === currentValue)) {
    select.value = currentValue;
  }
}

function goToPreviousEnterprisePage() {
  if (!enterprisePagination.hasPreviousPage) return;
  enterprisePagination.page -= 1;
  loadEnterprises();
}

function goToNextEnterprisePage() {
  if (!enterprisePagination.hasNextPage) return;
  enterprisePagination.page += 1;
  loadEnterprises();
}

function formatMetricHistoryValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'NA';
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return escapeHtml(String(value));
  }

  return numeric.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatMetricHistoryUnit(unit) {
  if (!unit) {
    return 'NA';
  }
  return escapeHtml(String(unit));
}

function buildMetricHistoryIndicatorOptionsHtml() {
  return METRIC_HISTORY_INDICATOR_OPTIONS
    .map((indicator) => `<option value="${indicator}">${indicator}</option>`)
    .join('');
}

function buildMetricHistoryUnitOptionsHtml() {
  return METRIC_HISTORY_UNIT_OPTIONS
    .map((unit) => `<option value="${unit}">${unit}</option>`)
    .join('');
}

function sortMetricHistoryYearsAsc(items) {
  return [...new Set((items || []).map((item) => item.year).filter((year) => Number.isFinite(Number(year))))]
    .map((year) => Number(year))
    .sort((a, b) => a - b);
}

function buildMetricHistoryCellIndex(items) {
  const byYear = new Map();

  (items || []).forEach((item) => {
    const numericYear = Number(item?.year);
    if (!Number.isFinite(numericYear) || !item?.indicator) {
      return;
    }

    let byIndicator = byYear.get(numericYear);
    if (!byIndicator) {
      byIndicator = new Map();
      byYear.set(numericYear, byIndicator);
    }

    byIndicator.set(item.indicator, item);
  });

  return byYear;
}

function buildEnterpriseMetricsHistoryHtml(enterpriseId, enterpriseName, items) {
  const indicators = METRIC_HISTORY_INDICATOR_OPTIONS;
  const years = sortMetricHistoryYearsAsc(items);
  const itemIndex = buildMetricHistoryCellIndex(items);

  const tableRows = years.length === 0
    ? `<tr><td colspan="${indicators.length + 1}" class="metric-history-empty">No history yet</td></tr>`
    : years.map((year) => {
      const byIndicator = itemIndex.get(year) || new Map();
      const indicatorCells = indicators.map((indicator) => {
        const cell = byIndicator.get(indicator);
        if (!cell) {
          return '<td class="metric-cell-empty">-</td>';
        }

        return `
          <td class="metric-cell-filled">
            <div class="metric-cell-value">${formatMetricHistoryValue(cell.value)}</div>
            <div class="metric-cell-unit">${formatMetricHistoryUnit(cell.unit)}</div>
            <div class="metric-cell-actions">
              <button type="button" class="btn btn-warning btn-mini" onclick="editEnterpriseMetricHistoryCell(${enterpriseId}, ${cell.id})">Edit</button>
              <button type="button" class="btn btn-danger btn-mini" onclick="deleteEnterpriseMetricHistory(${enterpriseId}, ${cell.id})">Delete</button>
            </div>
          </td>
        `;
      }).join('');

      return `
        <tr>
          <td class="metric-history-year">${year}</td>
          ${indicatorCells}
        </tr>
      `;
    }).join('');

  return `
    <div class="metric-history-vignette">
      <div class="metric-history-title">Metric history - ${escapeHtml(enterpriseName || '')}</div>
      <div class="metric-history-form">
        <select id="metricIndicator-${enterpriseId}" onchange="syncMetricHistoryUnit(${enterpriseId})">
          ${buildMetricHistoryIndicatorOptionsHtml()}
        </select>
        <input type="number" id="metricYear-${enterpriseId}" placeholder="year" min="1900" max="3000" step="1">
        <input type="number" id="metricValue-${enterpriseId}" placeholder="value" step="0.000001">
        <select id="metricUnit-${enterpriseId}">
          ${buildMetricHistoryUnitOptionsHtml()}
        </select>
        <button type="button" class="btn btn-success btn-mini" onclick="saveEnterpriseMetricHistory(${enterpriseId})">Add</button>
      </div>
      <div class="metric-history-table-wrap">
        <table class="metric-history-table">
          <thead>
            <tr>
              <th>Year</th>
              ${indicators.map((indicator) => `<th>${escapeHtml(indicator)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function editEnterpriseMetricHistoryCell(enterpriseId, metricId) {
  const payload = enterpriseMetricHistoryCache.get(enterpriseId);
  const item = payload?.items?.find((entry) => Number(entry.id) === Number(metricId));
  if (!item) {
    showError('Metric entry not found');
    return;
  }

  const indicatorInput = document.getElementById(`metricIndicator-${enterpriseId}`);
  const yearInput = document.getElementById(`metricYear-${enterpriseId}`);
  const valueInput = document.getElementById(`metricValue-${enterpriseId}`);
  const unitInput = document.getElementById(`metricUnit-${enterpriseId}`);

  if (!indicatorInput || !yearInput || !valueInput || !unitInput) {
    return;
  }

  indicatorInput.value = item.indicator || '';
  yearInput.value = item.year ?? '';
  valueInput.value = item.value ?? '';
  unitInput.value = item.unit || '';
  valueInput.focus();
}

async function loadEnterpriseMetricsHistory(enterpriseId, { force = false } = {}) {
  if (!force && enterpriseMetricHistoryCache.has(enterpriseId)) {
    return enterpriseMetricHistoryCache.get(enterpriseId);
  }

  const response = await fetch(`/api/enterprises/${enterpriseId}/metrics-history`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || 'Error while loading metric history');
  }

  enterpriseMetricHistoryCache.set(enterpriseId, payload);
  return payload;
}

async function renderEnterpriseFormMetricsPanel(enterpriseId, { force = false } = {}) {
  const panel = document.getElementById('enterpriseFormMetricsPanel');
  if (!panel) {
    return;
  }

  panel.classList.remove('hidden');
  panel.innerHTML = '<div class="metric-history-loading">Loading history...</div>';

  try {
    const payload = await loadEnterpriseMetricsHistory(enterpriseId, { force });
    panel.innerHTML = buildEnterpriseMetricsHistoryHtml(enterpriseId, payload.enterprise_name, payload.items || []);
    syncMetricHistoryUnit(enterpriseId);
  } catch (error) {
    console.error('Error while loading metric history:', error);
    panel.innerHTML = `<div class="metric-history-error">${escapeHtml(error.message || 'Unable to load history')}</div>`;
  }
}

function hideEnterpriseFormMetricsPanel() {
  const panel = document.getElementById('enterpriseFormMetricsPanel');
  if (!panel) {
    return;
  }

  panel.classList.add('hidden');
  panel.innerHTML = '';
}

function syncMetricHistoryUnit(enterpriseId) {
  const indicatorInput = document.getElementById(`metricIndicator-${enterpriseId}`);
  const unitInput = document.getElementById(`metricUnit-${enterpriseId}`);
  if (!indicatorInput || !unitInput) {
    return;
  }

  const suggestedUnit = METRIC_HISTORY_DEFAULT_UNIT_BY_INDICATOR[indicatorInput.value];
  if (suggestedUnit && METRIC_HISTORY_UNIT_OPTIONS.includes(suggestedUnit)) {
    unitInput.value = suggestedUnit;
  }
}

async function saveEnterpriseMetricHistory(enterpriseId) {
  const indicatorInput = document.getElementById(`metricIndicator-${enterpriseId}`);
  const yearInput = document.getElementById(`metricYear-${enterpriseId}`);
  const valueInput = document.getElementById(`metricValue-${enterpriseId}`);
  const unitInput = document.getElementById(`metricUnit-${enterpriseId}`);

  if (!indicatorInput || !yearInput || !valueInput || !unitInput) {
    return;
  }

  const indicator = indicatorInput.value.trim();
  const unit = unitInput.value.trim();
  const year = yearInput.value ? parseInt(yearInput.value, 10) : null;
  const value = valueInput.value ? Number(valueInput.value) : null;

  if (!indicator) {
    showError('Indicator is required');
    return;
  }

  if (!year || Number.isNaN(year)) {
    showError('Year is required');
    return;
  }

  if (value === null || Number.isNaN(value)) {
    showError('Value must be numeric');
    return;
  }

  if (!unit) {
    showError('Unit is required');
    return;
  }

  try {
    const response = await fetch(`/api/enterprises/${enterpriseId}/metrics-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ indicator, year, value, unit })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || 'Save failed');
    }

    showSuccess('Metric history saved ✓');
    if (isEditingEnterprise && currentEditingId === enterpriseId) {
      await renderEnterpriseFormMetricsPanel(enterpriseId, { force: true });
    }
  } catch (error) {
    console.error('Error while saving metric history:', error);
    showError(error.message || 'Error while saving metric history');
  }
}

async function deleteEnterpriseMetricHistory(enterpriseId, metricId) {
  try {
    const response = await fetch(`/api/enterprises/${enterpriseId}/metrics-history/${metricId}`, {
      method: 'DELETE'
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || 'Delete failed');
    }

    showSuccess('Metric history deleted ✓');
    if (isEditingEnterprise && currentEditingId === enterpriseId) {
      await renderEnterpriseFormMetricsPanel(enterpriseId, { force: true });
    }
  } catch (error) {
    console.error('Error while deleting metric history:', error);
    showError(error.message || 'Error while deleting metric history');
  }
}

window.saveEnterpriseMetricHistory = saveEnterpriseMetricHistory;
window.deleteEnterpriseMetricHistory = deleteEnterpriseMetricHistory;
window.syncMetricHistoryUnit = syncMetricHistoryUnit;
window.editEnterpriseMetricHistoryCell = editEnterpriseMetricHistoryCell;

async function ensureEnterpriseOptionsLoaded() {
  if (enterpriseOptionsLoaded) return;
  if (enterpriseOptionsLoadingPromise) {
    await enterpriseOptionsLoadingPromise;
    return;
  }

  enterpriseOptionsLoadingPromise = (async () => {
    const response = await fetch('/api/enterprises/options');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server error');
    }

    enterpriseOptions = data;
    enterpriseOptionsLoaded = true;
    updatePartnershipSelects();
  })();

  try {
    await enterpriseOptionsLoadingPromise;
  } catch (error) {
    console.error('Error while loading company options:', error);
    showError('Error while loading company list');
  } finally {
    enterpriseOptionsLoadingPromise = null;
  }
}

// ===== PARTNERSHIPS =====
async function loadPartnerships() {
  if (partnershipListAbortController) {
    partnershipListAbortController.abort();
  }

  const abortController = new AbortController();
  partnershipListAbortController = abortController;

  try {
    const params = new URLSearchParams({
      page: String(partnershipPagination.page),
      limit: String(partnershipPagination.limit)
    });

    params.set('segment', partnershipSegment);

    if (partnershipSearchQuery) {
      params.set('q', partnershipSearchQuery);
    }

    const response = await fetch(`/api/partnerships?${params.toString()}`, {
      signal: abortController.signal
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Server error');
    }

    partnerships = payload.items || [];
    filteredPartnerships = partnerships;
    if (payload.pagination) {
      Object.assign(partnershipPagination, payload.pagination);
    }
    renderPartnerships();
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error while loading relationships:', error);
    showError('Error while loading relationships');
  } finally {
    if (partnershipListAbortController === abortController) {
      partnershipListAbortController = null;
    }
  }
}

function renderPartnerships() {
  const container = document.getElementById('partnershipsList');

  if (filteredPartnerships.length === 0) {
    const emptyLabel = getPartnershipEmptyLabel();
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🤝</div>
        <div class="empty-state-text">${emptyLabel}</div>
      </div>
    `;
    renderPartnershipPagination();
    return;
  }

  container.innerHTML = filteredPartnerships.map(part => `
    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-title">
            Focal company: ${part.focal_enterprise_name || part.enterprise1_name}
          </div>
          <div class="card-title">
            Partner: ${part.partner_enterprise_name || part.enterprise2_name}
          </div>
          <div class="card-subtitle">
            ${part.type_relation ? `<span class="badge">${escapeHtml(part.type_relation)}</span>` : ''}
            ${part.partnership_type ? `<span class="badge">${part.partnership_type}</span>` : ''}
            <span class="badge badge-status-${part.status}">${part.status}</span>
            <span class="badge ${getValidationMeta(part.is_validated, false).badgeClass}">${getValidationMeta(part.is_validated, false).label}</span>
          </div>
        </div>
        <div class="card-actions">
          ${renderValidationButtons('partnership', part.id, part.is_validated)}
          <button class="btn btn-warning" onclick="editPartnership(${part.id})">✏️ Edit</button>
          <button class="btn btn-danger" onclick="deletePartnership(${part.id})">🗑️ Delete</button>
        </div>
      </div>
      <div class="card-content">
        <div class="enterprise-fields-grid">
        ${part.start_date ? `<div class="field"><div class="field-label">Start</div><div class="field-value">${part.start_date}</div></div>` : ''}
        ${part.end_year ? `<div class="field"><div class="field-label">End yr</div><div class="field-value">${part.end_year}</div></div>` : ''}
        ${part.value_millions ? `<div class="field"><div class="field-label">Value</div><div class="field-value">${formatMillionsUsd(part.value_millions)}</div></div>` : ''}
        ${part.infra_commitment_text ? `<div class="field field-wide"><div class="field-label">Infra</div><div class="field-value">${escapeHtml(part.infra_commitment_text)}</div></div>` : ''}
        ${part.description ? `<div class="field field-wide"><div class="field-label">Description</div><div class="field-value">${escapeHtml(part.description)}</div></div>` : ''}
        ${part.sources_information ? `<div class="field field-wide"><div class="field-label">Sources</div><div class="field-value">${escapeHtml(part.sources_information)}</div></div>` : ''}
        <div class="field field-timestamps field-full">
          <div class="field-label">Tracking</div>
          <div class="field-value timestamp-grid">
            <span><strong>Creation:</strong> ${formatAuditTimestamp(part.created_at)}</span>
            <span><strong>Last updated:</strong> ${formatAuditTimestamp(part.updated_at)}</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  `).join('');

  renderPartnershipPagination();
}

function getPartnershipEmptyLabel() {
  if (partnershipSegment === 'partial') {
    return 'No partially validated relationship';
  }
  if (partnershipSegment === 'validated') {
    return 'No validated relationship';
  }
  if (partnershipSegment === 'later') {
    return 'No relationship marked for later review';
  }
  if (partnershipSegment === 'top100') {
    return 'No relationship with available valuation for Top100';
  }
  return 'No relationship to validate';
}

function switchPartnershipSegment(segment) {
  partnershipSegment = segment;
  partnershipPagination.page = 1;
  document.querySelectorAll('.partnership-subtab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.partnershipSegment === segment);
  });
  loadPartnerships();
}

function renderPartnershipSubtabCounters() {
  const labels = {
    pending: 'Not validated',
    partial: 'Partially validated',
    validated: 'Validated',
    later: 'To review later',
    top100: 'Top100'
  };

  document.querySelectorAll('.partnership-subtab-btn').forEach((btn) => {
    const segment = btn.dataset.partnershipSegment;
    const count = partnershipSegmentCounts[segment] || 0;
    btn.textContent = `${labels[segment]} (${count})`;
  });
}

async function refreshPartnershipSegmentCounts() {
  if (partnershipCountsAbortController) {
    partnershipCountsAbortController.abort();
  }

  const abortController = new AbortController();
  partnershipCountsAbortController = abortController;

  try {
    const response = await fetch('/api/partnerships/counts', {
      signal: abortController.signal
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error('Error while loading relationship counters');
    }

    partnershipSegmentCounts.pending = payload.pending || 0;
    partnershipSegmentCounts.partial = payload.partial || 0;
    partnershipSegmentCounts.validated = payload.validated || 0;
    partnershipSegmentCounts.later = payload.later || 0;
    partnershipSegmentCounts.top100 = payload.top100 || 0;
    renderPartnershipSubtabCounters();
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    console.error('Error while loading relationship counters:', error);
  } finally {
    if (partnershipCountsAbortController === abortController) {
      partnershipCountsAbortController = null;
    }
  }
}

function renderPartnershipPagination() {
  const container = document.getElementById('partnershipPagination');
  if (!container) return;

  if (partnershipSegment === 'top100') {
    container.innerHTML = '';
    return;
  }

  if (partnershipPagination.total <= partnershipPagination.limit) {
    container.innerHTML = '';
    return;
  }

  const from = partnershipPagination.total === 0
    ? 0
    : ((partnershipPagination.page - 1) * partnershipPagination.limit) + 1;
  const to = Math.min(
    partnershipPagination.page * partnershipPagination.limit,
    partnershipPagination.total
  );

  container.innerHTML = `
    <div class="pagination-content">
      <button class="btn btn-secondary" onclick="goToPreviousPartnershipPage()" ${partnershipPagination.hasPreviousPage ? '' : 'disabled'}>
        ← Previous
      </button>
      <div class="pagination-info">
        Page ${partnershipPagination.page} / ${partnershipPagination.totalPages} - ${from}-${to} of ${partnershipPagination.total}
      </div>
      <button class="btn btn-secondary" onclick="goToNextPartnershipPage()" ${partnershipPagination.hasNextPage ? '' : 'disabled'}>
        Next →
      </button>
    </div>
  `;
}

function goToPreviousPartnershipPage() {
  if (!partnershipPagination.hasPreviousPage) return;
  partnershipPagination.page -= 1;
  loadPartnerships();
}

function goToNextPartnershipPage() {
  if (!partnershipPagination.hasNextPage) return;
  partnershipPagination.page += 1;
  loadPartnerships();
}

function updatePartnershipSelects() {
  const select1 = document.getElementById('partner1');
  const select2 = document.getElementById('partner2');
  const currentValue1 = select1.value;
  const currentValue2 = select2.value;

  const optionsHtml = enterpriseOptions
    .map((ent) => `<option value="${ent.id}">${ent.name}</option>`)
    .join('');
  const fullOptions = `<option value="">Select a company</option>${optionsHtml}`;

  select1.innerHTML = fullOptions;
  select2.innerHTML = fullOptions;

  if (currentValue1) select1.value = currentValue1;
  if (currentValue2) select2.value = currentValue2;
}

function openPartnershipForm() {
  currentEditingId = null;
  clearPartnershipForm();
  document.getElementById('partValidated').value = String(getValidationLevelForSegment(partnershipSegment));
  document.getElementById('partnershipForm').classList.remove('hidden');
  ensureEnterpriseOptionsLoaded();
}

async function editPartnership(id) {
  currentEditingId = id;
  const part = partnerships.find(p => p.id === id);

  if (part) {
    const partner1Select = document.getElementById('partner1');
    const partner2Select = document.getElementById('partner2');
    if (!enterpriseOptionsLoaded) {
      partner1Select.innerHTML = '<option value="">Loading companies...</option>';
      partner2Select.innerHTML = '<option value="">Loading companies...</option>';
    }

    document.getElementById('partRelationType').value = part.type_relation || part.partnership_type || '';
    document.getElementById('partType').value = normalizePartnershipType(part.partnership_type) || '';
    document.getElementById('partStatus').value = part.status;
    document.getElementById('partValidated').value = String(normalizeValidationLevel(part.is_validated));
    document.getElementById('partStartDate').value = part.start_date || '';
    document.getElementById('partEndYear').value = part.end_year || '';
    document.getElementById('partValue').value = part.value_millions || '';
    document.getElementById('partDescription').value = part.description || '';
    document.getElementById('partSourcesInfo').value = part.sources_information || '';
    document.getElementById('partInfraCommitment').value = part.infra_commitment_text || '';
    document.getElementById('partnershipForm').classList.remove('hidden');
    document.getElementById('partnershipForm').scrollIntoView({ behavior: 'smooth' });

    await ensureEnterpriseOptionsLoaded();
    document.getElementById('partner1').value = part.enterprise1_id;
    document.getElementById('partner2').value = part.enterprise2_id;
  }
}

function clearPartnershipForm() {
  document.getElementById('partnershipInputForm').reset();
  currentEditingId = null;
}

function closePartnershipForm() {
  document.getElementById('partnershipForm').classList.add('hidden');
  clearPartnershipForm();
}

async function submitPartnershipForm(e) {
  e.preventDefault();

  const partner1 = parseInt(document.getElementById('partner1').value);
  const partner2 = parseInt(document.getElementById('partner2').value);

  if (!Number.isInteger(partner1) || !Number.isInteger(partner2)) {
    showError('Please select two valid companies');
    return;
  }

  if (partner1 === partner2) {
    showError('Both companies must be different');
    return;
  }

  const data = {
    enterprise1_id: partner1,
    enterprise2_id: partner2,
    type_relation: document.getElementById('partRelationType').value || null,
    partnership_type: normalizePartnershipType(document.getElementById('partType').value) || null,
    description: document.getElementById('partDescription').value || null,
    start_date: document.getElementById('partStartDate').value || null,
    end_year: parseInt(document.getElementById('partEndYear').value, 10) || null,
    status: document.getElementById('partStatus').value || 'active',
    sources_information: document.getElementById('partSourcesInfo').value || null,
    infra_commitment_text: document.getElementById('partInfraCommitment').value || null,
    value_millions: document.getElementById('partValue').value ? parseFloat(document.getElementById('partValue').value) : null,
    is_validated: normalizeValidationLevel(document.getElementById('partValidated').value)
  };

  try {
    let response;
    if (currentEditingId) {
      response = await fetch(`/api/partnerships/${currentEditingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      response = await fetch('/api/partnerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    if (response.ok) {
      showSuccess(currentEditingId ? 'Relationship updated ✓' : 'Relationship created ✓');
      closePartnershipForm();
      refreshPartnershipSegmentCounts();
      loadPartnerships();
    } else {
      const error = await response.json();
      showError(error.error || 'Error while saving');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error while saving');
  }
}

async function deletePartnership(id) {
  if (!confirm('Are you sure you want to delete this relationship?')) {
    return;
  }

  try {
    const response = await fetch(`/api/partnerships/${id}`, { method: 'DELETE' });
    if (response.ok) {
      showSuccess('Relationship deleted ✓');
      refreshPartnershipSegmentCounts();
      loadPartnerships();
    } else {
      showError('Error while deleting');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error while deleting');
  }
}

async function togglePartnershipValidation(id, validationLevel) {
  try {
    const response = await fetch(`/api/partnerships/${id}/validation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_validated: normalizeValidationLevel(validationLevel) })
    });

    if (response.ok) {
      showSuccess('Relationship validation level updated ✓');
      refreshPartnershipSegmentCounts();
      loadPartnerships();
    } else {
      const error = await response.json();
      showError(error.error || 'Error while updating validation');
    }
  } catch (error) {
    console.error('Error:', error);
    showError('Error while updating validation');
  }
}

function normalizePartnershipType(value) {
  if (!value || typeof value !== 'string') {
    return value;
  }

  const tokenMap = new Map([
    ['investissement', 'Investment'],
    ['partenariat technologique', 'Technology Partnership'],
    ['autre', 'Other'],
    ['acquisition', 'Acquisition / Integration'],
    ['integration', 'Acquisition / Integration'],
    ['partnership', 'Partnership']
  ]);

  const tokens = value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const normalized = token
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return tokenMap.get(normalized) || token;
    });

  return [...new Set(tokens)].join(', ');
}

function searchPartnerships(e) {
  partnershipSearchQuery = e.target.value.trim();
  partnershipPagination.page = 1;

  if (partnershipSearchDebounceTimer) {
    clearTimeout(partnershipSearchDebounceTimer);
  }

  partnershipSearchDebounceTimer = setTimeout(() => {
    loadPartnerships();
  }, 250);
}

// ===== UTILS =====
function showSuccess(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #52c41a;
    color: white;
    padding: 15px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 2000;
    animation: slideIn 0.3s;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

function showError(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4d4f;
    color: white;
    padding: 15px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 2000;
    animation: slideIn 0.3s;
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

function closeApplication() {
  if (window.opener) {
    window.close();
  } else {
    if (confirm('Close the application? You will be redirected to a blank page.')) {
      window.location.href = 'about:blank';
    }
  }
}

function renderSectorLabelOptions() {
  const picker = document.getElementById('entSectorLabels');
  if (!picker) return;

  const assignedLabels = new Set();
  const groups = sectorLabelGroups
    .map((group) => {
      const labels = sectorLabelOptions.filter((label) => group.labels.has(label));
      labels.forEach((label) => assignedLabels.add(label));
      return { ...group, labels };
    })
    .filter((group) => group.labels.length > 0);
  const remainingLabels = sectorLabelOptions.filter((label) => !assignedLabels.has(label));
  if (remainingLabels.length > 0) {
    groups.push({ name: 'Other labels', labels: remainingLabels });
  }

  picker.innerHTML = groups.map((group) => `
    <details class="sector-label-group" open>
      <summary>${escapeHtml(group.name)} <span>${group.labels.length}</span></summary>
      <div class="sector-label-group-chips">
        ${group.labels.map((label) => {
          const isSelected = selectedSectorLabels.has(label);
          return `<button type="button" class="sector-chip${isSelected ? ' selected' : ''}" data-sector-label="${escapeHtml(label)}" role="option" aria-selected="${isSelected ? 'true' : 'false'}">${escapeHtml(label)}</button>`;
        }).join('')}
      </div>
    </details>
  `).join('');
}

function buildSectorLabelGroups(entries, labels) {
  if (!entries.length) return SECTOR_LABEL_GROUPS;

  const grouped = new Map(entries.map((entry) => [entry.group, []]));
  const other = [];
  for (const label of labels) {
    const normalized = label.toLowerCase();
    const exactEntry = entries.find((candidate) => (
      candidate.canonicalLabel.toLowerCase() === normalized
      || candidate.aliases.some((alias) => alias.toLowerCase() === normalized)
    ));
    const keywordEntry = entries.find((candidate) => (
      candidate.keywords.some((keyword) => normalized.includes(keyword))
    ));
    const entry = exactEntry || keywordEntry;
    if (entry) {
      grouped.get(entry.group).push(label);
    } else {
      other.push(label);
    }
  }

  const groups = [...grouped.entries()]
    .map(([name, groupLabels]) => ({ name, labels: new Set(groupLabels) }))
    .filter((group) => group.labels.size > 0);
  if (other.length) groups.push({ name: 'Other labels', labels: new Set(other) });
  return groups;
}

async function loadSectorLabelOptions() {
  try {
    const [response, ontologyResponse] = await Promise.all([
      fetch('/api/enterprises/filters'),
      fetch('/sector_ontology.csv')
    ]);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Server error');
    }

    if (ontologyResponse.ok) {
      const ontologyText = await ontologyResponse.text();
      sectorOntologyEntries = ontologyText.trim().split(/\r?\n/).slice(1)
        .map((row) => row.split(',', 5))
        .map(([canonicalLabel, group, aliases, keywords]) => ({
          canonicalLabel,
          group,
          aliases: (aliases || '').split('|').map((value) => value.trim()).filter(Boolean),
          keywords: (keywords || '').split('|').map((value) => value.trim().toLowerCase()).filter(Boolean)
        }))
        .filter((entry) => entry.canonicalLabel && entry.group);
    }

    sectorLabelOptions = (payload.sectors || [])
      .map((item) => typeof item === 'string' ? item : item.value)
      .flatMap((label) => splitSectorLabels(label))
      .filter(Boolean)
      .filter((label, index, labels) => labels.indexOf(label) === index)
      .sort((left, right) => left.localeCompare(right));
    sectorLabelGroups = buildSectorLabelGroups(sectorOntologyEntries, sectorLabelOptions);
    renderSectorLabelOptions();
  } catch (error) {
    console.error('Error while loading sector label options:', error);
  }
}

function splitSectorLabels(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniqueLabels(labels) {
  return [...new Set(labels.filter(Boolean))];
}

function getEnterpriseSectorLabels() {
  const customInput = document.getElementById('entSectorCustom');
  const selected = [...selectedSectorLabels];
  const custom = customInput ? splitSectorLabels(customInput.value) : [];

  return uniqueLabels([...selected, ...custom]);
}

function setEnterpriseSectorFromValue(value) {
  const picker = document.getElementById('entSectorLabels');
  const customInput = document.getElementById('entSectorCustom');
  const labels = uniqueLabels(splitSectorLabels(value));

  selectedSectorLabels.clear();
  labels
    .filter((label) => sectorLabelOptions.includes(label))
    .forEach((label) => selectedSectorLabels.add(label));

  if (picker) {
    const chips = picker.querySelectorAll('.sector-chip');
    chips.forEach((chip) => {
      const label = chip.dataset.sectorLabel;
      const isSelected = selectedSectorLabels.has(label);
      chip.classList.toggle('selected', isSelected);
      chip.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });
  }

  if (customInput) {
    const customLabels = labels.filter((label) => !sectorLabelOptions.includes(label));
    customInput.value = customLabels.join(', ');
  }
}

function onSectorLabelPickerClick(event) {
  const chip = event.target.closest('.sector-chip');
  if (!chip) return;

  const label = chip.dataset.sectorLabel;
  const isSelected = selectedSectorLabels.has(label);

  if (!isSelected && selectedSectorLabels.size >= 5) {
    showError('Maximum 5 sector labels');
    return;
  }

  if (isSelected) {
    selectedSectorLabels.delete(label);
  } else {
    selectedSectorLabels.add(label);
  }

  chip.classList.toggle('selected', !isSelected);
  chip.setAttribute('aria-selected', !isSelected ? 'true' : 'false');
}
