# Suun Terveystalo - Complete Development Plan

---

## 🎯 Vision & Requirements

### Background
The current setup was built for **Kiinteistömaailma** (real estate). We are now building a complete setup for **Suun Terveystalo** (dental health services).

### Core Principles
1. **Everything SQL-driven** - No hardcoded values. All configuration, branding, templates from database
2. **Superior UI/UX** - Much better than the current implementation
3. **AI-Powered** - Integrated AI assistant with database access for insights and recommendations
4. **Dynamic & Flexible** - Easy to adjust campaigns, budgets, creatives

### Required Pages
| Page | Purpose |
|------|---------|
| **Dashboard** | Overview with AI insights, performance metrics |
| **Analytics** | Advanced analytics with interactive charts |
| **Campaigns** | List, create, edit, manage campaigns |
| **Reports** | Advanced filtering, exportation (CSV/Excel/PDF) |
| **Creatives** | Gallery of generated creatives, preview, download in different formats |
| **Pisteet (Branches)** | Manage all 40+ branch locations |
| **Users** | User management with branch assignments |
| **Settings** | AI config, brand assets, app settings |

### Campaign Creation Flow (7 Steps)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CAMPAIGN CREATION WIZARD                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 1: SERVICE SELECTION                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐                    │
│  │  Hammastarkastus    │    │ Suuhygienistikäynti │                    │
│  │       59€           │    │        79€          │                    │
│  └─────────────────────┘    └─────────────────────┘                    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 2: BRANCH SELECTION                                               │
│  Select target branch from 40+ locations across Finland                 │
│  - Search/filter branches                                               │
│  - Map view of locations                                                │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 3: LOCATION & RADIUS                                              │
│  - Interactive Google Map                                               │
│  - Draggable radius circle (cool visual)                                │
│  - Show DOOH screens in area on map                                     │
│  - Display count of screens available                                   │
│  - Uses existing screen data from BidTheatre sync                       │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 4: CREATIVE TYPE & SCHEDULE                                       │
│  Creative Options:                                                      │
│  ┌─────────────────────┐    ┌─────────────────────┐                    │
│  │    Nation-wide      │    │  Paikkakuntakohtainen│                    │
│  │  (without address)  │    │  (with branch addr)  │                    │
│  └─────────────────────┘    └─────────────────────┘                    │
│  Or BOTH (with weight adjustment for which ads show more)              │
│                                                                         │
│  + Date range picker (start/end dates)                                  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 5: BUDGET & CHANNELS                                              │
│  Total Budget: [___________] €                                          │
│                                                                         │
│  Channel Selection & Allocation:                                        │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ ☑ Meta          [====|========] 40%  €400                      │    │
│  │ ☑ Display       [====|====]     25%  €250                      │    │
│  │ ☑ PDOOH         [====|======]   30%  €300  (15 screens avail)  │    │
│  │ ☐ Digital Audio [          ]     5%   €50                      │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  Total: 100% = €1000                                                    │
│                                                                         │
│  - Dynamic sliders that auto-adjust to 100%                            │
│  - PDOOH shows suggestion based on available screens                   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 6: CREATIVE GENERATION & PREVIEW                                  │
│  - Auto-generate creatives using HTML templates                        │
│  - Preview all sizes for each channel                                  │
│  - Edit text, choose background images                                 │
│  - Regenerate options                                                  │
│  - Download preview                                                    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 7: REVIEW & LAUNCH                                                │
│  - Summary of all selections                                           │
│  - Validation checks                                                   │
│  - Edit any step                                                       │
│  - [Launch Campaign] button                                            │
│                                                                         │
│  On Launch:                                                            │
│  → Save to dental_campaigns table                                      │
│  → Feed to Google Sheets (master feed)                                 │
│  → Create BidTheatre campaign (Display/PDOOH)                          │
│  → Generate & upload creatives                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Creative Templates Requirements
- **Exact match** to reference images in `refs/` folder
- Same logo, typography, branding, style
- Placeholders for:
  - Background images (select or upload)
  - Headline text
  - Offer/price
  - CTA button
  - Branch address (optional)
- All sizes for all channels:
  - Display: 300x600, 300x300, 160x600, 728x90, 320x50
  - PDOOH: 1080x1920 (portrait), 1920x1080 (landscape)
  - Meta: 1080x1080, 1200x628, 1080x1350

### AI Integration
- **Provider**: OpenRouter
- **Configurable**: API key and model selectable from database
- **Capabilities**:
  - Access to database for real data
  - Campaign performance insights
  - Budget recommendations
  - Anomaly detection
  - Natural language queries
  - Report generation assistance

### Integration Flow
```
Campaign Created
      │
      ▼
┌─────────────────┐
│  Supabase DB    │◄── dental_campaigns table
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Google Sheets  │◄── Master feed for tracking
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   BidTheatre    │◄── Display & PDOOH campaigns
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Meta/Audio     │◄── Future integration
└─────────────────┘
```

---

## 🤖 AI Development Instructions

> **IMPORTANT**: These instructions guide AI assistants in building this system. Follow them strictly for consistency, quality, and best practices.

### General Principles

1. **Read before writing** - Always read existing files before modifying to understand patterns
2. **SQL-first** - All configuration comes from database, never hardcode values
3. **Type safety** - Use TypeScript strictly, no `any` types
4. **Error handling** - Always handle errors gracefully with user feedback
5. **Accessibility** - Follow WCAG guidelines, proper ARIA labels
6. **Mobile-first** - Design for mobile, enhance for desktop
7. **Performance** - Optimize for speed, lazy load when possible

### Tech Stack Reference

```
Frontend:
├── React 18+ with hooks
├── TypeScript (strict mode)
├── TailwindCSS for styling
├── React Router v6 for navigation
├── Chart.js + react-chartjs-2 for charts
├── @googlemaps/js-api-loader for maps
├── Lucide React for icons
└── date-fns for date handling

Backend:
├── Supabase (PostgreSQL + Auth + Storage + Realtime)
├── Netlify Functions (serverless)
└── BidTheatre API (advertising)

State Management:
├── React useState/useReducer for local state
├── React Context for global state (auth, settings)
└── Supabase realtime for live updates
```

### UI/UX Guidelines

#### Color Palette (Use These Exactly)
```css
/* Primary - Teal */
--color-primary: #00A5B5;
--color-primary-dark: #008B99;
--color-primary-light: #E0F7F9;

/* Secondary - Red (for CTAs, alerts) */
--color-secondary: #E31E24;
--color-secondary-dark: #C4191E;

/* Accent - Navy (for text, headers) */
--color-accent: #1B365D;

/* Neutrals */
--color-background: #F8FAFB;
--color-surface: #FFFFFF;
--color-border: #E5E7EB;
--color-text: #1A1A1A;
--color-text-light: #6B7280;
--color-text-muted: #9CA3AF;

/* Status */
--color-success: #10B981;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #3B82F6;
```

#### Typography
```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

#### Spacing System
```css
/* Use Tailwind's spacing scale consistently */
/* 4px base: p-1, p-2, p-3, p-4, p-6, p-8, p-12, p-16 */

/* Component spacing */
--spacing-card: 1.5rem;      /* p-6 */
--spacing-section: 2rem;     /* p-8 */
--spacing-page: 2rem;        /* p-8 */
--spacing-gap: 1rem;         /* gap-4 */
```

#### Component Styling Patterns

**Cards:**
```jsx
<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
  {/* Content */}
</div>
```

**Buttons:**
```jsx
// Primary Button
<button className="bg-primary hover:bg-primary-dark text-white font-medium px-6 py-3 rounded-lg transition-colors focus:ring-2 focus:ring-primary/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed">
  Button Text
</button>

// Secondary Button
<button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium px-6 py-3 rounded-lg transition-colors">
  Button Text
</button>

// Danger Button
<button className="bg-red-500 hover:bg-red-600 text-white font-medium px-6 py-3 rounded-lg transition-colors">
  Delete
</button>
```

**Inputs:**
```jsx
<input 
  type="text"
  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder-gray-400"
  placeholder="Enter value..."
/>
```

**Tables:**
```jsx
<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
  <table className="w-full">
    <thead className="bg-gray-50 border-b border-gray-100">
      <tr>
        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Header</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 text-sm text-gray-700">Cell</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Modals:**
```jsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
  <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
    <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-900">Modal Title</h2>
      <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
        <X className="w-5 h-5 text-gray-500" />
      </button>
    </div>
    <div className="p-6">
      {/* Content */}
    </div>
  </div>
</div>
```

#### Animation Guidelines
```jsx
// Use subtle transitions
className="transition-all duration-200 ease-out"

// Hover effects
className="hover:scale-[1.02] hover:shadow-lg transition-all"

// Loading states - use skeleton screens
<div className="animate-pulse bg-gray-200 rounded-lg h-8 w-32" />

// Page transitions - fade in
className="animate-in fade-in duration-300"
```

### Component Patterns

#### Page Layout Template
```jsx
export default function PageName() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DataType[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('table').select('*');
      if (error) throw error;
      setData(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
          <p className="text-gray-500 mt-1">Page description</p>
        </div>
        <button className="btn-primary">Action</button>
      </div>

      {/* Page Content */}
      <div className="space-y-6">
        {/* ... */}
      </div>
    </div>
  );
}
```

#### Wizard/Stepper Pattern
```jsx
const STEPS = [
  { id: 1, title: 'Step 1', description: 'Description' },
  { id: 2, title: 'Step 2', description: 'Description' },
  // ...
];

const [currentStep, setCurrentStep] = useState(1);
const [formData, setFormData] = useState<FormData>({});

const handleNext = () => {
  if (validateStep(currentStep)) {
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  }
};

const handleBack = () => {
  setCurrentStep(prev => Math.max(prev - 1, 1));
};

// Step indicator
<div className="flex items-center justify-between mb-8">
  {STEPS.map((step, index) => (
    <div key={step.id} className="flex items-center">
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center font-semibold
        ${currentStep >= step.id 
          ? 'bg-primary text-white' 
          : 'bg-gray-100 text-gray-400'}
      `}>
        {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
      </div>
      {index < STEPS.length - 1 && (
        <div className={`h-1 w-24 mx-2 ${currentStep > step.id ? 'bg-primary' : 'bg-gray-200'}`} />
      )}
    </div>
  ))}
</div>
```

### Data Fetching Patterns

#### Supabase Queries
```typescript
// Fetch with relations
const { data, error } = await supabase
  .from('dental_campaigns')
  .select(`
    *,
    branch:branches(*),
    service:services(*),
    creatives(*)
  `)
  .eq('status', 'active')
  .order('created_at', { ascending: false });

// Insert with return
const { data, error } = await supabase
  .from('dental_campaigns')
  .insert({ ...campaignData })
  .select()
  .single();

// Update
const { error } = await supabase
  .from('dental_campaigns')
  .update({ status: 'paused' })
  .eq('id', campaignId);

// Realtime subscription
useEffect(() => {
  const subscription = supabase
    .channel('campaigns')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'dental_campaigns' },
      (payload) => {
        // Handle update
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

#### App Settings Helper
```typescript
// Always fetch settings from database
const getAppSetting = async (key: string) => {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single();
  return data?.value;
};

// Usage
const brandColors = await getAppSetting('brand_colors');
const brandName = await getAppSetting('brand_name');
```

### Error Handling Patterns

```typescript
// Toast notifications for user feedback
import { toast } from 'react-hot-toast'; // or similar

// Success
toast.success('Campaign created successfully!');

// Error
toast.error('Failed to create campaign. Please try again.');

// Promise-based
toast.promise(createCampaign(data), {
  loading: 'Creating campaign...',
  success: 'Campaign created!',
  error: 'Failed to create campaign'
});

// Error boundary for components
class ErrorBoundary extends React.Component {
  // ... standard error boundary implementation
}
```

### Performance Guidelines

1. **Lazy load pages**:
```jsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
```

2. **Memoize expensive computations**:
```jsx
const filteredData = useMemo(() => 
  data.filter(item => item.status === filter),
  [data, filter]
);
```

3. **Debounce search inputs**:
```jsx
const debouncedSearch = useMemo(
  () => debounce((query) => setSearchQuery(query), 300),
  []
);
```

4. **Virtual lists for large data**:
```jsx
// Use react-window or similar for 100+ items
import { FixedSizeList } from 'react-window';
```

5. **Image optimization**:
```jsx
// Use Supabase Storage transforms
const imageUrl = supabase.storage
  .from('creatives')
  .getPublicUrl(path, { transform: { width: 300, height: 300 } });
```

### File Naming Conventions

```
src/
├── components/
│   ├── ComponentName.tsx      # PascalCase
│   └── ComponentName.test.tsx # Tests alongside
├── lib/
│   └── serviceName.ts         # camelCase
├── pages/
│   └── PageName.tsx           # PascalCase
├── types/
│   └── index.ts               # Centralized types
└── hooks/
    └── useHookName.ts         # camelCase with 'use' prefix
```

### Code Quality Checklist

Before completing any file, verify:
- [ ] No TypeScript errors (`any` types)
- [ ] All async functions have try/catch
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Mobile responsive
- [ ] Accessible (ARIA labels, keyboard nav)
- [ ] Console free of warnings
- [ ] No hardcoded strings (use database)

### Testing Strategy

```typescript
// Test files alongside components
// ComponentName.test.tsx

// Test critical paths:
// 1. Campaign creation flow
// 2. Authentication
// 3. Data fetching
// 4. Form validation
```

### Git Commit Messages

```
feat: add campaign creation wizard
fix: resolve budget allocation rounding error
refactor: extract branch selector component
style: update dashboard card shadows
docs: add API documentation
chore: update dependencies
```

### Common Mistakes to Avoid

❌ **DON'T:**
- Hardcode colors, text, or configuration
- Use `any` type in TypeScript
- Ignore loading/error states
- Forget mobile responsiveness
- Skip form validation
- Leave console.logs in code
- Use inline styles
- Ignore accessibility

✅ **DO:**
- Fetch all config from `app_settings` table
- Use proper TypeScript types
- Show skeletons during loading
- Handle errors gracefully
- Test on mobile viewports
- Validate all user inputs
- Use TailwindCSS classes
- Add ARIA labels

### Integration Checklist

When building campaign creation:
1. [ ] Read existing `createBidTheatreCampaign-background` function
2. [ ] Understand Google Sheets feed format
3. [ ] Check BidTheatre API requirements
4. [ ] Review media screens data structure
5. [ ] Test with real BidTheatre credentials

### API Reference

**Supabase Tables:**
- `app_settings` - Configuration
- `ai_config` - AI settings
- `services` - Service catalog
- `branches` - Branch locations
- `users` - User accounts
- `dental_campaigns` - Campaigns
- `creatives` - Generated creatives
- `creative_templates` - HTML templates
- `campaign_analytics` - Metrics
- `media_screens` - DOOH screens

**Netlify Functions:**
- `/api/createBidTheatreCampaign` - Create campaign
- `/api/updateBidTheatreCampaign` - Update campaign
- `/api/pauseBidTheatreCampaign` - Pause campaign
- `/api/syncMediaScreens` - Sync DOOH screens

---

## Project Overview

Transform the existing Kiinteistömaailma real estate marketing platform into a dental health services marketing platform for **Suun Terveystalo**.

### Brand Identity
- **Name**: Suun Terveystalo
- **Tagline**: "Hymyile huoletta" (Smile without worry)
- **Primary Color**: #00A5B5 (Teal)
- **Secondary Color**: #E31E24 (Red)
- **Accent Color**: #1B365D (Navy)

### Services
1. **Hammastarkastus** (Dental checkup) - 59€
2. **Suuhygienistikäynti** (Dental hygienist visit) - 79€

### Advertising Channels
- **Meta** (Facebook/Instagram)
- **Display** (Programmatic banners)
- **PDOOH** (Programmatic Digital Out-of-Home)
- **Digital Audio** (Spotify, podcasts)

---

## Current State ✅

### Database (Completed)
- [x] Complete SQL migration created (`20260203000000_suun_terveystalo_complete.sql`)
- [x] User policies fixed (`20260203000001_fix_user_policies.sql`)
- [x] Old KM schema cleanup (`20260203000002_cleanup_old_km_schema.sql`)

### Tables Created
| Table | Purpose |
|-------|---------|
| `app_settings` | SQL-driven configuration (no hardcoding) |
| `ai_config` | OpenRouter AI settings |
| `services` | Dental services catalog |
| `branches` | 40+ Suun Terveystalo locations |
| `users` | User management with branch assignments |
| `dental_campaigns` | Campaign management |
| `creatives` | Generated creative assets |
| `creative_templates` | HTML templates for each size |
| `brand_assets` | Logos, fonts, colors |
| `campaign_analytics` | Performance metrics |
| `ai_chat_history` | AI conversation logs |
| `ai_insights` | AI-generated recommendations |
| `activity_logs` | Audit trail |
| `notifications` | User notifications |
| `scheduled_reports` | Automated reporting |
| `export_history` | Export tracking |
| `campaign_queue` | Background job queue |
| `bidtheatre_credentials` | BidTheatre API auth |
| `bidtheatre_bid_strategies` | Bidding configurations |

### Files Cleaned
- [x] Removed KM-specific files (kiinteistomaailma.html, train-schema.sql, etc.)
- [x] Removed apartment-related pages and services
- [x] Removed creatopy.ts (will use HTML templates)
- [x] Kept BidTheatre functions, media costs sync, Google Sheets

---

## Phase 1: Core Types & Services

### 1.1 Update TypeScript Types
**File**: `src/types/index.ts`

```typescript
// New interfaces to add:
- Branch
- DentalCampaign
- Creative
- CreativeTemplate
- BrandAsset
- Service
- CampaignAnalytics
- AIConfig
- AIMessage
- AIInsight
- Notification
- ScheduledReport
- ExportRecord
- AppSetting
```

### 1.2 Create Core Services
**Files to create**:
- `src/lib/branchService.ts` - Branch CRUD operations
- `src/lib/campaignService.ts` - Campaign management
- `src/lib/creativeService.ts` - Creative generation & management
- `src/lib/analyticsService.ts` - Analytics & reporting
- `src/lib/aiService.ts` - OpenRouter AI integration
- `src/lib/settingsService.ts` - App settings management

---

## Phase 2: Layout & Navigation

### 2.1 Update Layout Component
**File**: `src/pages/Layout.tsx`

Navigation structure:
```
├── Dashboard (/)
├── Campaigns
│   ├── All Campaigns (/campaigns)
│   └── Create Campaign (/campaigns/new)
├── Analytics (/analytics)
├── Reports (/reports)
├── Creatives (/creatives)
├── Branches (/branches) - "Pisteet"
├── Media Screens (/media-screens)
├── Settings
│   ├── Users (/users)
│   ├── AI Config (/settings/ai)
│   └── Brand Assets (/settings/brand)
└── Activity Log (/activity)
```

### 2.2 Update App Router
**File**: `src/App.tsx`

Add routes for all new pages.

---

## Phase 3: Dashboard

### 3.1 New Dashboard Design
**File**: `src/pages/Dashboard.tsx`

**Components**:
1. **Stats Cards Row**
   - Active Campaigns
   - Total Spend (MTD)
   - Total Impressions
   - Average CTR

2. **AI Insights Panel**
   - Latest AI recommendations
   - Quick actions based on insights

3. **Performance Charts**
   - Spend over time (line chart)
   - Channel distribution (pie chart)
   - Branch performance (bar chart)

4. **Recent Campaigns Table**
   - Campaign name, branch, status, spend, impressions

5. **Quick Actions**
   - Create Campaign button
   - View Reports button

---

## Phase 4: Campaign Management

### 4.1 Campaign List Page
**File**: `src/pages/Campaigns.tsx`

Features:
- Filterable/sortable table
- Status filters (draft, active, paused, completed)
- Channel filters
- Branch filters
- Date range filter
- Bulk actions (pause, activate, delete)

### 4.2 Campaign Creation Wizard
**File**: `src/pages/CampaignCreate.tsx`

**7-Step Wizard**:

| Step | Name | Description |
|------|------|-------------|
| 1 | Service Selection | Choose Hammastarkastus or Suuhygienistikäynti |
| 2 | Branch Selection | Select target branch(es) |
| 3 | Location & Radius | Map interface, set targeting radius |
| 4 | Channel Selection | Meta, Display, PDOOH, Digital Audio |
| 5 | Budget Allocation | Total budget, per-channel split, scheduling |
| 6 | Creative Preview | Auto-generated creatives, edit options |
| 7 | Review & Launch | Summary, validation, submit |

### 4.3 Campaign Detail Page
**File**: `src/pages/CampaignDetail.tsx`

- Campaign overview
- Performance metrics
- Channel breakdown
- Creative gallery
- Edit/Pause/Delete actions
- Activity history

---

## Phase 5: Analytics & Reporting

### 5.1 Analytics Dashboard
**File**: `src/pages/Analytics.tsx`

**Features**:
- Date range picker
- Channel comparison
- Branch comparison
- Service comparison
- Interactive charts (Chart.js)
- KPI cards with trends

**Metrics**:
- Impressions, Clicks, CTR
- Spend, CPM, CPC
- Conversions (if tracked)
- ROAS

### 5.2 Reports Page
**File**: `src/pages/Reports.tsx`

**Features**:
- Advanced filtering
- Column customization
- Export to CSV/Excel/PDF
- Scheduled reports
- Saved report templates
- Email delivery settings

---

## Phase 6: Creative Management

### 6.1 Creatives Gallery
**File**: `src/pages/Creatives.tsx`

**Features**:
- Grid view of all creatives
- Filter by campaign, channel, size, status
- Preview modal (full-size)
- Download options (PNG, JPG, HTML)
- Regenerate creative
- Edit template values

### 6.2 Creative Generator Service
**File**: `src/lib/creativeGenerator.ts`

- Render HTML templates with data
- Use Puppeteer/Playwright for image generation
- Support all sizes:
  - 300x600 (Display)
  - 300x300 (Display)
  - 160x600 (Display)
  - 728x90 (Display)
  - 1080x1920 (PDOOH Portrait)
  - 1920x1080 (PDOOH Landscape)
  - 1080x1080 (Meta Square)
  - 1200x628 (Meta Landscape)

---

## Phase 7: Branch Management

### 7.1 Branches Page ("Pisteet")
**File**: `src/pages/Branches.tsx`

**Features**:
- List all 40+ branches
- Add/Edit/Delete branches
- Map view of all locations
- Branch performance stats
- Assign users to branches
- Bulk import/export

**Branch Fields**:
- Name, Address, City, Postal Code
- Coordinates (lat/lng)
- Phone, Email
- Opening hours
- Status (active/inactive)
- Manager assignment

---

## Phase 8: AI Integration

### 8.1 AI Chat Component
**File**: `src/components/AIChat.tsx`

**Features**:
- Floating chat button
- Chat window with history
- Context-aware responses
- Access to database for insights
- Suggested actions
- Voice input (optional)

### 8.2 AI Service
**File**: `src/lib/aiService.ts`

**Capabilities**:
- Campaign recommendations
- Budget optimization suggestions
- Performance analysis
- Anomaly detection
- Natural language queries
- Report generation

**Configuration** (from `ai_config` table):
- Provider: OpenRouter
- Model: anthropic/claude-3.5-sonnet (configurable)
- API Key: Stored securely
- System prompt: Customizable

---

## Phase 9: Settings & Configuration

### 9.1 AI Settings Page
**File**: `src/pages/settings/AISettings.tsx`

- Configure API key
- Select model
- Adjust temperature/tokens
- Test connection
- View usage stats

### 9.2 Brand Assets Page
**File**: `src/pages/settings/BrandAssets.tsx`

- Upload logos
- Configure colors
- Set default fonts
- Preview brand kit

### 9.3 User Management
**File**: `src/pages/UserManagement.tsx` (Update existing)

- Assign branches to users
- Role management (admin, manager, partner, viewer)
- Permissions configuration
- Activity history per user

---

## Phase 10: Functions & Integrations

### 10.1 Update BidTheatre Functions
**Files**:
- `functions/createBidTheatreCampaign-background/index.mts`
- `functions/updateBidTheatreCampaign-background/index.mts`
- `functions/pauseBidTheatreCampaign-background/index.mts`

Changes:
- Update to use `dental_campaigns` table
- Use `branches` instead of agencies
- Update creative generation flow

### 10.2 Create Creative Generation Function
**File**: `functions/generateCreative-background/index.mts`

- Accept template ID and data
- Render HTML template
- Generate PNG/JPG
- Upload to Cloudinary
- Save to `creatives` table

### 10.3 Update Media Screens Sync
**File**: `functions/syncMediaScreens-background/index.mts`

- Continue syncing BidTheatre screens
- No major changes needed

---

## Phase 11: Components

### 11.1 New Components to Create

| Component | Purpose |
|-----------|---------|
| `BranchSelector.tsx` | Multi-select branch picker |
| `ServiceSelector.tsx` | Service selection cards |
| `ChannelSelector.tsx` | Channel selection with icons |
| `BudgetAllocator.tsx` | Budget split interface |
| `RadiusMap.tsx` | Google Maps with radius picker |
| `CreativePreview.tsx` | Creative preview modal |
| `AnalyticsChart.tsx` | Reusable chart component |
| `DateRangePicker.tsx` | Date range selection |
| `ExportButton.tsx` | Export dropdown |
| `AIChat.tsx` | AI chat interface |
| `InsightCard.tsx` | AI insight display |
| `StatsCard.tsx` | KPI display card |
| `BranchCard.tsx` | Branch info card |
| `CampaignCard.tsx` | Campaign summary card |

### 11.2 Update Existing Components

| Component | Changes |
|-----------|---------|
| `CampaignModal.tsx` | Replace with wizard |
| `Layout.tsx` | New navigation |
| `DashboardCharts.tsx` | New chart designs |
| `MapModal.tsx` | Update for branches |
| `NotificationCenter.tsx` | Connect to notifications table |

---

## Phase 12: Creative Templates

### 12.1 HTML Templates (Stored in DB)

Templates already created in migration:
- 300x600 Display
- 300x300 Display  
- 1080x1920 PDOOH Portrait
- 1080x1080 Meta Square

### 12.2 Additional Templates to Create

| Size | Channel | Priority |
|------|---------|----------|
| 160x600 | Display | High |
| 728x90 | Display | High |
| 320x50 | Display Mobile | Medium |
| 1920x1080 | PDOOH Landscape | High |
| 1200x628 | Meta Landscape | High |
| 1080x1350 | Meta Portrait | Medium |
| 1200x1200 | Meta Square Alt | Low |

---

## Phase 13: Testing & QA

### 13.1 Test Checklist

**Authentication**:
- [ ] User signup
- [ ] User login
- [ ] Password reset
- [ ] Role-based access

**Campaigns**:
- [ ] Create campaign (all steps)
- [ ] Edit campaign
- [ ] Pause/Resume campaign
- [ ] Delete campaign
- [ ] View campaign details

**Creatives**:
- [ ] Generate creatives
- [ ] Preview creatives
- [ ] Download creatives
- [ ] Regenerate creatives

**Analytics**:
- [ ] View dashboard
- [ ] Filter by date
- [ ] Filter by channel
- [ ] Export reports

**Branches**:
- [ ] View all branches
- [ ] Add branch
- [ ] Edit branch
- [ ] Delete branch
- [ ] Map view

**AI**:
- [ ] Chat interface
- [ ] Get recommendations
- [ ] Configure settings

---

## Phase 14: Deployment

### 14.1 Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=

# BidTheatre (stored in DB)
# Credentials in bidtheatre_credentials table

# OpenRouter (stored in DB)
# API key in ai_config table
```

### 14.2 Netlify Configuration

Already configured in `netlify.toml`:
- Functions directory
- Build settings
- Redirects

---

## Implementation Order

### Week 1: Foundation
1. [ ] Types & interfaces
2. [ ] Core services (branch, campaign, settings)
3. [ ] Layout & navigation update
4. [ ] App router update

### Week 2: Core Pages
5. [ ] Dashboard redesign
6. [ ] Branches page
7. [ ] Campaign list page
8. [ ] Campaign creation wizard (steps 1-4)

### Week 3: Campaign & Creatives
9. [ ] Campaign wizard (steps 5-7)
10. [ ] Campaign detail page
11. [ ] Creative generator function
12. [ ] Creatives gallery page

### Week 4: Analytics & AI
13. [ ] Analytics dashboard
14. [ ] Reports page with exports
15. [ ] AI service integration
16. [ ] AI chat component

### Week 5: Polish & Deploy
17. [ ] Settings pages
18. [ ] Component refinements
19. [ ] Testing & bug fixes
20. [ ] Production deployment

---

## File Structure (Final)

```
src/
├── components/
│   ├── AIChat.tsx (new)
│   ├── AnalyticsChart.tsx (new)
│   ├── BranchCard.tsx (new)
│   ├── BranchSelector.tsx (new)
│   ├── BudgetAllocator.tsx (new)
│   ├── CampaignCard.tsx (new)
│   ├── ChannelSelector.tsx (new)
│   ├── CreativePreview.tsx (new)
│   ├── DateRangePicker.tsx (new)
│   ├── ExportButton.tsx (new)
│   ├── InsightCard.tsx (new)
│   ├── Layout.tsx (update)
│   ├── MapModal.tsx (update)
│   ├── NotificationCenter.tsx (update)
│   ├── RadiusMap.tsx (new)
│   ├── ServiceSelector.tsx (new)
│   ├── StatsCard.tsx (new)
│   └── ... (existing)
├── lib/
│   ├── aiService.ts (new)
│   ├── analyticsService.ts (new)
│   ├── bidTheatre.ts (update)
│   ├── branchService.ts (new)
│   ├── campaignService.ts (new)
│   ├── creativeService.ts (new)
│   ├── googleMapsLoader.ts (keep)
│   ├── googleSheets.ts (keep)
│   ├── maps.ts (keep)
│   ├── mediaScreensService.ts (keep)
│   ├── notifications.ts (update)
│   ├── settingsService.ts (new)
│   └── supabase.ts (keep)
├── pages/
│   ├── ActivityLog.tsx (keep)
│   ├── Analytics.tsx (new)
│   ├── Branches.tsx (new)
│   ├── CampaignCreate.tsx (new)
│   ├── CampaignDetail.tsx (new)
│   ├── Campaigns.tsx (new)
│   ├── Creatives.tsx (new)
│   ├── Dashboard.tsx (rewrite)
│   ├── Layout.tsx (update)
│   ├── Login.tsx (update)
│   ├── MediaScreens.tsx (keep)
│   ├── NotFound.tsx (keep)
│   ├── Reports.tsx (new)
│   ├── UserManagement.tsx (update)
│   └── settings/
│       ├── AISettings.tsx (new)
│       └── BrandAssets.tsx (new)
├── types/
│   └── index.ts (update)
├── App.tsx (update)
├── main.tsx (keep)
└── index.css (update colors)

functions/
├── createBidTheatreCampaign-background/ (update)
├── generateCreative-background/ (new)
├── pauseBidTheatreCampaign-background/ (update)
├── proxy-json/ (keep)
├── sync-historical-media-costs-background/ (keep)
├── sync-media-costs-background/ (keep)
├── syncMediaScreens-background/ (keep)
├── testBidTheatreVideoUpload/ (keep)
└── updateBidTheatreCampaign-background/ (update)

supabase/
└── migrations/
    ├── 20260203000000_suun_terveystalo_complete.sql
    ├── 20260203000001_fix_user_policies.sql
    └── 20260203000002_cleanup_old_km_schema.sql
```

---

## Notes

- All configuration is SQL-driven via `app_settings` table
- AI model and API key configurable from database
- HTML creative templates stored in `creative_templates` table
- Brand colors, logos from database
- No hardcoded values in frontend
