// ============================================================================
// SUUN TERVEYSTALO - Demo Service
// Manages demo mode state and simulated data
// ============================================================================

// Demo user credentials
export const DEMO_CREDENTIALS = {
  email: 'demo@norr3.fi',
  password: 'Demo@123!'
};

// Demo mode storage key
const DEMO_MODE_KEY = 'norr3-demo-mode';
const DEMO_WIZARD_COMPLETED_KEY = 'norr3-demo-wizard-completed';
const DEMO_WIZARD_STEP_KEY = 'norr3-demo-wizard-step';
const DEMO_TOOLTIPS_SHOWN_KEY = 'norr3-demo-tooltips-shown';
const DEMO_CREATED_CAMPAIGNS_KEY = 'norr3-demo-created-campaigns';

// ============================================================================
// DEMO MODE STATE MANAGEMENT
// ============================================================================

// Check if currently in demo mode - requires both the flag AND matching demo email
export const isDemoMode = (): boolean => {
  const demoFlag = localStorage.getItem(DEMO_MODE_KEY) === 'true';
  if (!demoFlag) return false;
  
  // Also verify the current user is the demo user by checking stored email
  const storedEmail = localStorage.getItem('norr3-demo-user-email');
  return storedEmail === DEMO_CREDENTIALS.email;
};

// Check if a specific user is the demo user
export const isDemoUser = (email: string | undefined): boolean => {
  return email === DEMO_CREDENTIALS.email;
};

export const setDemoMode = (enabled: boolean, userEmail?: string): void => {
  if (enabled) {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    if (userEmail) {
      localStorage.setItem('norr3-demo-user-email', userEmail);
    }
    // Reset wizard state when entering demo mode
    localStorage.removeItem(DEMO_WIZARD_COMPLETED_KEY);
    localStorage.setItem(DEMO_WIZARD_STEP_KEY, '0');
    localStorage.removeItem(DEMO_TOOLTIPS_SHOWN_KEY);
    localStorage.removeItem(DEMO_CREATED_CAMPAIGNS_KEY);
  } else {
    localStorage.removeItem(DEMO_MODE_KEY);
    localStorage.removeItem('norr3-demo-user-email');
    localStorage.removeItem(DEMO_WIZARD_COMPLETED_KEY);
    localStorage.removeItem(DEMO_WIZARD_STEP_KEY);
    localStorage.removeItem(DEMO_TOOLTIPS_SHOWN_KEY);
    localStorage.removeItem(DEMO_CREATED_CAMPAIGNS_KEY);
  }
};

export const isDemoWizardCompleted = (): boolean => {
  return localStorage.getItem(DEMO_WIZARD_COMPLETED_KEY) === 'true';
};

export const setDemoWizardCompleted = (completed: boolean): void => {
  localStorage.setItem(DEMO_WIZARD_COMPLETED_KEY, completed ? 'true' : 'false');
};

export const getDemoWizardStep = (): number => {
  const step = localStorage.getItem(DEMO_WIZARD_STEP_KEY);
  return step ? parseInt(step, 10) : 0;
};

export const setDemoWizardStep = (step: number): void => {
  localStorage.setItem(DEMO_WIZARD_STEP_KEY, step.toString());
};

// Tooltip tracking
export const getShownTooltips = (): string[] => {
  const shown = localStorage.getItem(DEMO_TOOLTIPS_SHOWN_KEY);
  return shown ? JSON.parse(shown) : [];
};

export const markTooltipShown = (tooltipId: string): void => {
  const shown = getShownTooltips();
  if (!shown.includes(tooltipId)) {
    shown.push(tooltipId);
    localStorage.setItem(DEMO_TOOLTIPS_SHOWN_KEY, JSON.stringify(shown));
  }
};

export const isTooltipShown = (tooltipId: string): boolean => {
  return getShownTooltips().includes(tooltipId);
};

export const resetTooltips = (): void => {
  localStorage.removeItem(DEMO_TOOLTIPS_SHOWN_KEY);
};

// Demo created campaigns
export const getDemoCreatedCampaigns = (): DemoCampaign[] => {
  const campaigns = localStorage.getItem(DEMO_CREATED_CAMPAIGNS_KEY);
  return campaigns ? JSON.parse(campaigns) : [];
};

export const addDemoCreatedCampaign = (campaign: DemoCampaign): void => {
  const campaigns = getDemoCreatedCampaigns();
  campaigns.unshift(campaign);
  localStorage.setItem(DEMO_CREATED_CAMPAIGNS_KEY, JSON.stringify(campaigns));
};

// Clear all demo data on logout
export const clearDemoData = (): void => {
  localStorage.removeItem(DEMO_MODE_KEY);
  localStorage.removeItem('norr3-demo-user-email');
  localStorage.removeItem(DEMO_WIZARD_COMPLETED_KEY);
  localStorage.removeItem(DEMO_WIZARD_STEP_KEY);
  localStorage.removeItem(DEMO_TOOLTIPS_SHOWN_KEY);
  localStorage.removeItem(DEMO_CREATED_CAMPAIGNS_KEY);
};

// ============================================================================
// DEMO DATA TYPES
// ============================================================================

export interface DemoCampaign {
  id: string;
  name: string;
  status: 'draft' | 'pending' | 'active' | 'paused' | 'completed';
  service_name: string;
  branch_name: string;
  total_budget: number;
  spent_budget: number;
  daily_budget: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  channels: string[];
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface DemoCreative {
  id: string;
  name: string;
  preview_url: string;
  width: number;
  height: number;
  channel: string;
  service_name: string;
  created_at: string;
}

// ============================================================================
// DEMO DATA
// ============================================================================

export const DEMO_CAMPAIGNS: DemoCampaign[] = [
  {
    id: 'demo-1',
    name: 'Hammashoito Kampanja - Helsinki',
    status: 'active',
    service_name: 'Hammashoito',
    branch_name: 'Helsinki Keskusta',
    total_budget: 5000,
    spent_budget: 2340,
    daily_budget: 150,
    impressions: 125000,
    clicks: 3200,
    conversions: 45,
    ctr: 2.56,
    channels: ['display', 'pdooh'],
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-2',
    name: 'Oikomishoito - Espoo',
    status: 'active',
    service_name: 'Oikomishoito',
    branch_name: 'Espoo Tapiola',
    total_budget: 3500,
    spent_budget: 1800,
    daily_budget: 100,
    impressions: 85000,
    clicks: 2100,
    conversions: 32,
    ctr: 2.47,
    channels: ['display', 'meta'],
    start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-3',
    name: 'Implantit - Tampere',
    status: 'completed',
    service_name: 'Implantit',
    branch_name: 'Tampere Keskusta',
    total_budget: 2000,
    spent_budget: 2000,
    daily_budget: 80,
    impressions: 65000,
    clicks: 1500,
    conversions: 28,
    ctr: 2.31,
    channels: ['pdooh'],
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-4',
    name: 'Valkaisuhoito - Vantaa',
    status: 'paused',
    service_name: 'Valkaisuhoito',
    branch_name: 'Vantaa Tikkurila',
    total_budget: 1500,
    spent_budget: 750,
    daily_budget: 60,
    impressions: 42000,
    clicks: 980,
    conversions: 15,
    ctr: 2.33,
    channels: ['display'],
    start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-5',
    name: 'Hammastarkastus - Oulu',
    status: 'draft',
    service_name: 'Hammastarkastus',
    branch_name: 'Oulu Keskusta',
    total_budget: 2500,
    spent_budget: 0,
    daily_budget: 100,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    channels: ['display', 'pdooh', 'digital_audio'],
    start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const DEMO_DASHBOARD_STATS = {
  totalImpressions: 317000,
  totalClicks: 7780,
  totalConversions: 120,
  totalSpent: 6890,
  totalBudget: 14500,
  activeCampaigns: 2,
  totalCampaigns: 5,
  avgCTR: 2.45,
  avgConversionRate: 1.54,
  costPerClick: 0.89,
  costPerConversion: 57.42,
  impressionsChange: 12.5,
  clicksChange: 8.3,
  conversionsChange: 15.2,
  spentChange: 10.1,
};

export const DEMO_ANALYTICS = {
  totalImpressions: 317000,
  totalClicks: 7780,
  totalConversions: 120,
  totalSpent: 6890,
  ctr: 2.45,
  conversionRate: 1.54,
  costPerClick: 0.89,
  costPerConversion: 57.42,
  weeklyData: [
    { date: '2026-01-27', impressions: 42000, clicks: 1020, conversions: 16, spent: 920 },
    { date: '2026-01-28', impressions: 45000, clicks: 1100, conversions: 18, spent: 980 },
    { date: '2026-01-29', impressions: 48000, clicks: 1180, conversions: 19, spent: 1050 },
    { date: '2026-01-30', impressions: 44000, clicks: 1080, conversions: 17, spent: 960 },
    { date: '2026-01-31', impressions: 52000, clicks: 1280, conversions: 22, spent: 1140 },
    { date: '2026-02-01', impressions: 48000, clicks: 1170, conversions: 18, spent: 1040 },
    { date: '2026-02-02', impressions: 38000, clicks: 950, conversions: 10, spent: 800 },
  ],
  channelData: [
    { channel: 'Display', impressions: 180000, clicks: 4500, conversions: 68, spent: 3800, ctr: 2.5 },
    { channel: 'PDOOH', impressions: 95000, clicks: 2100, conversions: 35, spent: 2200, ctr: 2.21 },
    { channel: 'Meta', impressions: 42000, clicks: 1180, conversions: 17, spent: 890, ctr: 2.81 },
  ],
  geoData: [
    { city: 'Helsinki', impressions: 125000, clicks: 3200, conversions: 45 },
    { city: 'Espoo', impressions: 85000, clicks: 2100, conversions: 32 },
    { city: 'Tampere', impressions: 65000, clicks: 1500, conversions: 28 },
    { city: 'Vantaa', impressions: 42000, clicks: 980, conversions: 15 },
  ],
  serviceData: [
    { service: 'Hammashoito', impressions: 125000, clicks: 3200, conversions: 45, revenue: 2250 },
    { service: 'Oikomishoito', impressions: 85000, clicks: 2100, conversions: 32, revenue: 4800 },
    { service: 'Implantit', impressions: 65000, clicks: 1500, conversions: 28, revenue: 8400 },
    { service: 'Valkaisuhoito', impressions: 42000, clicks: 980, conversions: 15, revenue: 750 },
  ],
};

export const DEMO_CREATIVES: DemoCreative[] = [
  {
    id: 'creative-1',
    name: 'Hammashoito - Perus',
    preview_url: 'https://placehold.co/300x250/00A5B5/FFFFFF?text=Hammashoito+59%E2%82%AC',
    width: 300,
    height: 250,
    channel: 'display',
    service_name: 'Hammashoito',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'creative-2',
    name: 'Hammashoito - Leaderboard',
    preview_url: 'https://placehold.co/728x90/00A5B5/FFFFFF?text=Hammashoito+-+Varaa+aika+nyt!',
    width: 728,
    height: 90,
    channel: 'display',
    service_name: 'Hammashoito',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'creative-3',
    name: 'Oikomishoito - PDOOH',
    preview_url: 'https://placehold.co/1080x1920/1B365D/FFFFFF?text=Oikomishoito%0A%0ASuun+Terveystalo',
    width: 1080,
    height: 1920,
    channel: 'dooh',
    service_name: 'Oikomishoito',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'creative-4',
    name: 'Implantit - Square',
    preview_url: 'https://placehold.co/300x300/E31E24/FFFFFF?text=Implantit%0A%0AKorkealaatuista+hoitoa',
    width: 300,
    height: 300,
    channel: 'display',
    service_name: 'Implantit',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'creative-5',
    name: 'Valkaisuhoito - Mobile',
    preview_url: 'https://placehold.co/320x480/00A5B5/FFFFFF?text=Valkaisuhoito%0A%0A-30%25',
    width: 320,
    height: 480,
    channel: 'display',
    service_name: 'Valkaisuhoito',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'creative-6',
    name: 'Hammastarkastus - Half Page',
    preview_url: 'https://placehold.co/300x600/1B365D/FFFFFF?text=Hammastarkastus%0A%0AVaraa+nyt!',
    width: 300,
    height: 600,
    channel: 'display',
    service_name: 'Hammastarkastus',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const DEMO_AI_RESPONSES: Record<string, string> = {
  'default': `Tervetuloa demo-tilaan! 👋

Tässä tilassa voit kokeilla AI-assistenttia demo-datalla. Tässä on yhteenveto demokampanjoistasi:

📊 **Kampanjatilanne:**
- Aktiivisia kampanjoita: 2
- Kokonaisbudjetti: 14 500€
- Käytetty: 6 890€

🏆 **Parhaat tulokset:**
- Hammashoito-kampanja Helsingissä: CTR 2.56%
- 120 konversiota yhteensä

💡 **Suositus:**
Harkitse budjetin lisäämistä Hammashoito-kampanjalle, sillä se toimii erinomaisesti!`,

  'performance': `📈 **Kampanjasuorituskyky tällä viikolla:**

**Hammashoito - Helsinki** (Aktiivinen)
- Näyttökerrat: 125 000 (+12%)
- Klikkaukset: 3 200 (CTR: 2.56%)
- Konversiot: 45
- Käytetty: 2 340€ / 5 000€

**Oikomishoito - Espoo** (Aktiivinen)
- Näyttökerrat: 85 000 (+8%)
- Klikkaukset: 2 100 (CTR: 2.47%)
- Konversiot: 32
- Käytetty: 1 800€ / 3 500€

🎯 **Analyysi:**
Molemmat aktiiviset kampanjat toimivat hyvin. Helsinki-kampanjan CTR on erityisen hyvä. Suosittelen lisäämään budjettia parhaiten toimiville.`,

  'recommendation': `💡 **Suositukset seuraavalle kampanjalle:**

1. **Palvelu:** Implantit
   - Korkea konversioprosentti historiassa
   - Hyvä keskiostos

2. **Sijainti:** Tampere
   - Edellinen kampanja toimi hyvin
   - Vähän kilpailua

3. **Kanavat:** Display + PDOOH
   - Parhaat tulokset tällä yhdistelmällä
   - CTR keskimäärin 2.4%

4. **Budjetti:** 3 000€
   - 100€ / päivä
   - 30 päivän kesto

5. **Ajoitus:** Arkipäivät klo 8-20
   - Paras konversioaika

Haluatko, että luon kampanjaluonnoksen näillä asetuksilla?`,

  'channels': `📊 **Kanavien tehokkuusvertailu:**

**Display-mainonta**
- Näyttökerrat: 180 000
- CTR: 2.5%
- Konversiot: 68
- Kustannus/konversio: 55.88€
✅ Tasainen suorituskyky

**PDOOH (Ulkomainonta)**
- Näyttökerrat: 95 000
- CTR: 2.21%
- Konversiot: 35
- Kustannus/konversio: 62.86€
📍 Hyvä näkyvyys liikennöidyillä paikoilla

**Meta (Facebook/Instagram)**
- Näyttökerrat: 42 000
- CTR: 2.81%
- Konversiot: 17
- Kustannus/konversio: 52.35€
🏆 Paras CTR!

**Suositus:** Lisää Meta-mainonnan budjettia parhaan CTR:n vuoksi.`,

  'services': `🦷 **Palveluiden suorituskyky:**

**1. Implantit** ⭐ Paras ROI
- Konversiot: 28
- Keskiostos: 300€
- Tuotto: 8 400€
- ROAS: 3.82

**2. Oikomishoito**
- Konversiot: 32
- Keskiostos: 150€
- Tuotto: 4 800€
- ROAS: 2.67

**3. Hammashoito**
- Konversiot: 45
- Keskiostos: 50€
- Tuotto: 2 250€
- ROAS: 0.96

**4. Valkaisuhoito**
- Konversiot: 15
- Keskiostos: 50€
- Tuotto: 750€
- ROAS: 1.00

💡 **Huomio:** Implantit tuottavat parhaan ROI:n. Harkitse budjetin siirtämistä sinne.`,
};

// Helper function to get AI response based on query
export const getDemoAIResponse = (query: string): string => {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('suorituskyky') || lowerQuery.includes('viikko') || lowerQuery.includes('analys')) {
    return DEMO_AI_RESPONSES['performance'];
  }
  if (lowerQuery.includes('suosit') || lowerQuery.includes('seuraav') || lowerQuery.includes('ehdot')) {
    return DEMO_AI_RESPONSES['recommendation'];
  }
  if (lowerQuery.includes('kanav') || lowerQuery.includes('dooh') || lowerQuery.includes('display') || lowerQuery.includes('meta')) {
    return DEMO_AI_RESPONSES['channels'];
  }
  if (lowerQuery.includes('palvelu') || lowerQuery.includes('parhai') || lowerQuery.includes('toimii')) {
    return DEMO_AI_RESPONSES['services'];
  }
  
  return DEMO_AI_RESPONSES['default'];
};

// ============================================================================
// WIZARD STEPS CONFIGURATION
// ============================================================================

export interface WizardStep {
  id: number;
  title: string;
  titleFi: string;
  description: string;
  descriptionFi: string;
  icon: string;
  content: 'welcome' | 'dashboard' | 'create-campaign' | 'analytics' | 'finish';
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 0,
    title: 'Welcome to Demo Mode',
    titleFi: 'Tervetuloa Demo-tilaan',
    description: 'Explore the platform features without affecting real data',
    descriptionFi: 'Tutustu alustan ominaisuuksiin ilman vaikutusta oikeaan dataan',
    icon: 'sparkles',
    content: 'welcome',
  },
  {
    id: 1,
    title: 'Dashboard Overview',
    titleFi: 'Kojelaudan yleiskatsaus',
    description: 'See your campaign performance at a glance',
    descriptionFi: 'Näe kampanjoidesi suorituskyky yhdellä silmäyksellä',
    icon: 'layout-dashboard',
    content: 'dashboard',
  },
  {
    id: 2,
    title: 'Create a Campaign',
    titleFi: 'Luo kampanja',
    description: 'Learn how to create and configure campaigns',
    descriptionFi: 'Opi luomaan ja konfiguroimaan kampanjoita',
    icon: 'megaphone',
    content: 'create-campaign',
  },
  {
    id: 3,
    title: 'View Analytics',
    titleFi: 'Analytiikan tarkastelu',
    description: 'Understand your campaign metrics and insights',
    descriptionFi: 'Ymmärrä kampanjasi mittarit ja oivallukset',
    icon: 'chart-bar',
    content: 'analytics',
  },
  {
    id: 4,
    title: 'Ready to Go!',
    titleFi: 'Valmis aloittamaan!',
    description: 'You\'re all set to explore the platform',
    descriptionFi: 'Olet valmis tutkimaan alustaa',
    icon: 'check-circle',
    content: 'finish',
  },
];

// ============================================================================
// DEMO TOOLTIP CONFIGURATION
// ============================================================================

export interface DemoTooltipConfig {
  id: string;
  page: string;
  targetSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  order: number;
}

export const DEMO_TOOLTIPS: DemoTooltipConfig[] = [
  // Dashboard tooltips
  {
    id: 'dashboard-stats',
    page: 'dashboard',
    targetSelector: '[data-demo-tooltip="stats"]',
    title: 'Kampanjatilastot',
    description: 'Täällä näet kampanjoidesi tärkeimmät mittarit yhdellä silmäyksellä.',
    position: 'bottom',
    order: 1,
  },
  {
    id: 'dashboard-create',
    page: 'dashboard',
    targetSelector: '[data-demo-tooltip="create-campaign"]',
    title: 'Luo uusi kampanja',
    description: 'Klikkaa tästä luodaksesi uuden kampanjan.',
    position: 'bottom',
    order: 2,
  },
  {
    id: 'dashboard-chart',
    page: 'dashboard',
    targetSelector: '[data-demo-tooltip="chart"]',
    title: 'Suorituskykykaavio',
    description: 'Tämä kaavio näyttää kampanjoidesi kehityksen ajan myötä.',
    position: 'top',
    order: 3,
  },
  // Campaigns tooltips
  {
    id: 'campaigns-list',
    page: 'campaigns',
    targetSelector: '[data-demo-tooltip="campaign-list"]',
    title: 'Kampanjalista',
    description: 'Tässä näet kaikki kampanjasi. Klikkaa kampanjaa nähdäksesi lisätiedot.',
    position: 'top',
    order: 1,
  },
  {
    id: 'campaigns-filter',
    page: 'campaigns',
    targetSelector: '[data-demo-tooltip="filter"]',
    title: 'Suodata kampanjat',
    description: 'Käytä suodattimia löytääksesi haluamasi kampanjat nopeasti.',
    position: 'bottom',
    order: 2,
  },
  // Analytics tooltips
  {
    id: 'analytics-metrics',
    page: 'analytics',
    targetSelector: '[data-demo-tooltip="metrics"]',
    title: 'Analytiikkamittarit',
    description: 'Nämä kortit näyttävät kampanjoidesi tärkeimmät KPI:t.',
    position: 'bottom',
    order: 1,
  },
  {
    id: 'analytics-channels',
    page: 'analytics',
    targetSelector: '[data-demo-tooltip="channels"]',
    title: 'Kanavien vertailu',
    description: 'Vertaile eri mainoskanavien tehokkuutta täällä.',
    position: 'top',
    order: 2,
  },
];
