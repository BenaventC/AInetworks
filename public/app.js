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
let enterpriseSearchDebounceTimer = null;
let enterpriseSegment = 'later';
let enterpriseSectorFilter = '';
let enterpriseCountryFilter = '';
let enterpriseFilterOptionsLoadingPromise = null;
let partnershipSearchQuery = '';
let partnershipSearchDebounceTimer = null;
let partnershipSegment = 'later';
const enterpriseSegmentCounts = {
  pending: 0,
  partial: 0,
  validated: 0,
  later: 0,
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
const TOP_RANKING_SEGMENTS = new Set(['top100', 'top50']);
const SECTOR_LABEL_OPTIONS = [
  'Aerospace',
  'Aerospace & Defence',
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
  'Energy & Utilities',
  'Financial Services',
  'GPU',
  'Hardware',
  'Health & Social Care',
  'ICT',
  'Image generation',
  'Inference',
  'IT & Security',
  'Manufacturing & Operations',
  'Media & Entertainment',
  'Oncology',
  'Professional Services',
  'Public Sector',
  'Quantic',
  'R&D',
  'Real Estate Activities',
  'Retail & E-commerce',
  'Robotics',
  'Sales & Marketing',
  'Transport & Mobility',
  'Voice',
];
const enterprisePagination = {
  page: 1,
  limit: 50,
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
    return 'N/A';
  }

  if (millions >= 1000) {
    const billions = millions / 1000;
    return `${formatNumberFr(billions, 3)} billion USD`;
  }

  if (millions >= 1) {
    return `${formatNumberFr(millions, 3)} million USD`;
  }

  const thousands = millions * 1000;
  return `${formatNumberFr(thousands, 3)} thousand USD`;
}

function formatAbsoluteUsd(value) {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 'N/A';
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

function parseMillionsInputValue(elementId, fieldLabel) {
  const raw = document.getElementById(elementId).value.trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
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
    { level: 1, label: 'Partial', activeClass: 'btn-validation-partial-active' },
    { level: 2, label: 'Validated', activeClass: 'btn-validation-success-active' },
    { level: 3, label: 'Review later', activeClass: 'btn-validation-later-active' }
  ];
}

function renderValidationButtons(kind, id, currentLevel) {
  const safeLevel = normalizeValidationLevel(currentLevel);
  const handlerName = kind === 'enterprise' ? 'toggleEnterpriseValidation' : 'togglePartnershipValidation';

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
  initTabs();
  initEventListeners();
  loadEnterpriseFilterOptions();
  refreshEnterpriseSegmentCounts();
  refreshPartnershipSegmentCounts();
  loadEnterprises();
  loadPartnerships();
});

// ===== TABS =====
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(tabName).classList.add('active');
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
  document.getElementById('enterpriseSearch').addEventListener('input', searchEnterprises);
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

// ===== ENTERPRISES =====
async function loadEnterprises() {
  try {
    const params = new URLSearchParams({
      page: String(enterprisePagination.page),
      limit: String(enterprisePagination.limit)
    });

    params.set('segment', enterpriseSegment);

    if (enterpriseSearchQuery) {
      params.set('q', enterpriseSearchQuery);
    }
    if (enterpriseSectorFilter) {
      params.set('sector', enterpriseSectorFilter);
    }
    if (enterpriseCountryFilter) {
      params.set('country', enterpriseCountryFilter);
    }

    const response = await fetch(`/api/enterprises?${params.toString()}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Server error');
    }

    enterprises = payload.items || [];
    filteredEnterprises = enterprises;
    if (payload.pagination) {
      Object.assign(enterprisePagination, payload.pagination);
    }
    renderEnterprises();
  } catch (error) {
    console.error('Error while loading companies:', error);
    showError('Error while loading companies');
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

  container.innerHTML = filteredEnterprises.map((ent, index) => {
    const rank = index + 1;
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
        ${ent.employees_count ? `<div class="field"><div class="field-label">Staff</div><div class="field-value">${ent.employees_count}</div></div>` : ''}
        ${ent.website ? `<div class="field field-wide"><div class="field-label">Website</div><div class="field-value"><a href="${ent.website}" target="_blank">${ent.website}</a></div></div>` : ''}
        ${ent.logo_url ? `<div class="field field-full field-logo"><div class="field-label">Logo</div><div class="field-value logo-field-value"><div class="logo-frame"><img src="${ent.logo_url}" alt="${ent.name}" loading="lazy"></div></div></div>` : ''}
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
    companieswithoutcompetitors: 'Companies without competitors',
    top100: 'Top100'
  };

  document.querySelectorAll('.enterprise-subtab-btn').forEach((btn) => {
    const segment = btn.dataset.enterpriseSegment;
    const count = enterpriseSegmentCounts[segment] || 0;
    btn.textContent = `${labels[segment]} (${count})`;
  });
}

async function refreshEnterpriseSegmentCounts() {
  try {
    const filterParams = new URLSearchParams();
    if (enterpriseSearchQuery) {
      filterParams.set('q', enterpriseSearchQuery);
    }
    if (enterpriseSectorFilter) {
      filterParams.set('sector', enterpriseSectorFilter);
    }
    if (enterpriseCountryFilter) {
      filterParams.set('country', enterpriseCountryFilter);
    }

    const withFilters = (segment) => {
      const params = new URLSearchParams(filterParams);
      params.set('segment', segment);
      params.set('page', '1');
      params.set('limit', '1');
      return `/api/enterprises?${params.toString()}`;
    };

    const [pendingRes, partialRes, validatedRes, laterRes, competitionWithoutRes, top100Res] = await Promise.all([
      fetch(withFilters('pending')),
      fetch(withFilters('partial')),
      fetch(withFilters('validated')),
      fetch(withFilters('later')),
      fetch(withFilters('companieswithoutcompetitors')),
      fetch(withFilters('top100'))
    ]);

    const [pendingData, partialData, validatedData, laterData, competitionWithoutData, top100Data] = await Promise.all([
      pendingRes.json(),
      partialRes.json(),
      validatedRes.json(),
      laterRes.json(),
      competitionWithoutRes.json(),
      top100Res.json()
    ]);

    if (!pendingRes.ok || !partialRes.ok || !validatedRes.ok || !laterRes.ok || !competitionWithoutRes.ok || !top100Res.ok) {
      throw new Error('Error while loading counters');
    }

    enterpriseSegmentCounts.pending = pendingData.pagination?.total || 0;
    enterpriseSegmentCounts.partial = partialData.pagination?.total || 0;
    enterpriseSegmentCounts.validated = validatedData.pagination?.total || 0;
    enterpriseSegmentCounts.later = laterData.pagination?.total || 0;
    enterpriseSegmentCounts.companieswithoutcompetitors = competitionWithoutData.pagination?.total || 0;
    enterpriseSegmentCounts.top100 = top100Data.pagination?.total || 0;
    renderEnterpriseSubtabCounters();
  } catch (error) {
    console.error('Error while loading company counters:', error);
  }
}

function renderEnterprisePagination() {
  const container = document.getElementById('enterprisePagination');
  if (!container) return;

  if (enterpriseSegment === 'top100') {
    container.innerHTML = '';
    return;
  }

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
    document.getElementById('entEmployees').value = ent.employees_count || '';
    document.getElementById('entValidated').value = String(normalizeValidationLevel(ent.is_validated));
    document.getElementById('enterpriseForm').classList.remove('hidden');
    document.getElementById('enterpriseForm').scrollIntoView({ behavior: 'smooth' });
  }
}

function clearEnterpriseForm() {
  document.getElementById('enterpriseInputForm').reset();
}

function closeEnterpriseForm() {
  document.getElementById('enterpriseForm').classList.add('hidden');
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

  try {
    capitalizationMillions = parseMillionsInputValue('entCapitalization', 'Market cap');
    fundsRaisedMillions = parseMillionsInputValue('entFundsRaised', 'Funds raised');
    revenueMillions = parseMillionsInputValue('entRevenueMillions', 'Revenue');
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
    employees_count: document.getElementById('entEmployees').value ? parseInt(document.getElementById('entEmployees').value, 10) : null,
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
    await loadEnterpriseFilterOptions();
    refreshEnterpriseSegmentCounts();
    loadEnterprises();
  }, 250);
}

async function onEnterpriseFiltersChanged() {
  enterpriseSectorFilter = document.getElementById('enterpriseSectorFilter').value;
  enterpriseCountryFilter = document.getElementById('enterpriseCountryFilter').value;
  enterprisePagination.page = 1;
  await loadEnterpriseFilterOptions();
  syncEnterpriseFilterStateFromInputs();
  refreshEnterpriseSegmentCounts();
  loadEnterprises();
}

async function resetEnterpriseFilters() {
  enterpriseSearchQuery = '';
  enterpriseSectorFilter = '';
  enterpriseCountryFilter = '';
  enterprisePagination.page = 1;

  const searchInput = document.getElementById('enterpriseSearch');
  const sectorSelect = document.getElementById('enterpriseSectorFilter');
  const countrySelect = document.getElementById('enterpriseCountryFilter');

  if (searchInput) searchInput.value = '';
  if (sectorSelect) sectorSelect.value = '';
  if (countrySelect) countrySelect.value = '';

  await loadEnterpriseFilterOptions();
  syncEnterpriseFilterStateFromInputs();
  refreshEnterpriseSegmentCounts();
  loadEnterprises();
}

async function loadEnterpriseFilterOptions() {
  if (enterpriseFilterOptionsLoadingPromise) {
    await enterpriseFilterOptionsLoadingPromise;
    return;
  }

  enterpriseFilterOptionsLoadingPromise = (async () => {
    const params = new URLSearchParams();
    if (enterpriseSearchQuery) {
      params.set('q', enterpriseSearchQuery);
    }
    if (enterpriseSectorFilter) {
      params.set('sector', enterpriseSectorFilter);
    }
    if (enterpriseCountryFilter) {
      params.set('country', enterpriseCountryFilter);
    }

    const response = await fetch(`/api/enterprises/filters?${params.toString()}`);
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
    console.error('Error while loading company filters:', error);
    showError('Error while loading filters');
  } finally {
    enterpriseFilterOptionsLoadingPromise = null;
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
  try {
    const params = new URLSearchParams({
      page: String(partnershipPagination.page),
      limit: String(partnershipPagination.limit)
    });

    params.set('segment', partnershipSegment);

    if (partnershipSearchQuery) {
      params.set('q', partnershipSearchQuery);
    }

    const response = await fetch(`/api/partnerships?${params.toString()}`);
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
    console.error('Error while loading relationships:', error);
    showError('Error while loading relationships');
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
  try {
    const [pendingRes, partialRes, validatedRes, laterRes, top100Res] = await Promise.all([
      fetch('/api/partnerships?segment=pending&page=1&limit=1'),
      fetch('/api/partnerships?segment=partial&page=1&limit=1'),
      fetch('/api/partnerships?segment=validated&page=1&limit=1'),
      fetch('/api/partnerships?segment=later&page=1&limit=1'),
      fetch('/api/partnerships?segment=top100&page=1&limit=1')
    ]);

    const [pendingData, partialData, validatedData, laterData, top100Data] = await Promise.all([
      pendingRes.json(),
      partialRes.json(),
      validatedRes.json(),
      laterRes.json(),
      top100Res.json()
    ]);

    if (!pendingRes.ok || !partialRes.ok || !validatedRes.ok || !laterRes.ok || !top100Res.ok) {
      throw new Error('Error while loading relationship counters');
    }

    partnershipSegmentCounts.pending = pendingData.pagination?.total || 0;
    partnershipSegmentCounts.partial = partialData.pagination?.total || 0;
    partnershipSegmentCounts.validated = validatedData.pagination?.total || 0;
    partnershipSegmentCounts.later = laterData.pagination?.total || 0;
    partnershipSegmentCounts.top100 = top100Data.pagination?.total || 0;
    renderPartnershipSubtabCounters();
  } catch (error) {
    console.error('Error while loading relationship counters:', error);
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
  return text.replace(/[&<>"']/g, m => map[m]);
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

  picker.innerHTML = SECTOR_LABEL_OPTIONS
    .map((label) => `<button type="button" class="sector-chip" data-sector-label="${escapeHtml(label)}" role="option" aria-selected="false">${escapeHtml(label)}</button>`)
    .join('');
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
    .filter((label) => SECTOR_LABEL_OPTIONS.includes(label))
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
    const customLabels = labels.filter((label) => !SECTOR_LABEL_OPTIONS.includes(label));
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
