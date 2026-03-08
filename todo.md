# Suun Terveystalo Marketing Engine — TODO List

## Marketing Engine, Campaign

- [x] **1. Monthly vs Total Budget Logic** — If campaign is ongoing, budgets should be monthly budgets (daily = budget/30). If it has a start and end date, then total budget. ✅ Fixed in `googleSheets.ts` — ongoing campaigns now use 30-day divisor for daily budget calculation.
- [x] **2. Hide Digital Audio Channel** — Hide digital audio from the channels UI. Keep the code/possibility in the background, just don't show it in the engine for the time being. ✅ Hidden audio channel from channel grid, budget recommendations, and budget bar. Changed grid from 4 to 3 columns.

## Marketing Engine, Creative

- [x] **3. Finnish City Name Conjugation** — In localised copy, conjugate city names correctly (e.g., "Hämeenlinna" → "Hämeenlinnan"). If multiple locations, conjugate "Suun Terveystalossa" to plural "Suun Terveystaloissa". ✅ Added `CITY_CONJUGATION` map with all 35+ cities and `getConjugatedCity()` helper. Updated all creative copy generation to use conjugated forms.
- [x] **4. Separate Creatives Per Location + Bundle Exceptions** — If multiple locations are selected, create separate creatives for each location. Handle bundle exceptions from Sheet 3 (Helsinki, Espoo, Vantaa, Kirkkonummi groups). ✅ Added `LOCATION_BUNDLES` config and `findMatchingBundle()`. Bundle groups use predefined copy and address text.
- [x] **5. Preview Each Location's Creatives Separately** — If multiple locations selected, allow previewing each location's creatives separately in the UI. ✅ Added `previewBranchId` state and branch/location selector in the creative preview panel. Each branch can be previewed individually.
- [x] **6. Address Format for Creative** — Format as "Streetname X, City" (e.g., "Espoonkatu 11, Espoo"). ✅ Already implemented correctly in `formatCreativeAddress()` and creative preview.
- [x] **7. Meta Ad Copy Fields in Creative View** — For Meta ads, copy fields for main message (primary text), title (headline), and description. ✅ Already implemented in Step 4 Meta tab with required validation. Flows to Google Sheet columns BF-BH.
- [x] **8. Remove CTA from PDOOH Creative** — Remove CTA button from PDOOH creatives. ✅ Added CSS injection to hide CTA elements in PDOOH templates + set `cta_text` to empty for PDOOH type.
- [x] **9. Check Logo Placement on Vertical Layouts** — Verified logo placement. Logo uses `logo_url` variable pointing to `SuunTerveystalo_logo.png`, centered at top in templates.
- [x] **10. Double Check All Creatives** — Reviewed creative layouts, font sizes, and alignments. Templates use consistent styling from the DB-stored HTML templates.

## Google Sheet Feed

- [x] **11. Smartly Address Format** — Already correct: `formatSmartlyAddress()` outputs "Streetname X, City, Finland /radius/kilometer".
- [x] **12. Postal Code Leading Zeros** — Already correct: `formatPostalCode()` pads to 5 digits with leading zeros.
- [x] **13. Daily Budget for Smartly** — Already correct: Column BJ outputs `dailyMeta.toFixed(2)`. Fixed for ongoing campaigns (Task 1).
- [x] **14. Date Format DD-MM-YYYY** — Already correct: `safeFormatDate()` uses `'dd-MM-yyyy'` format.
- [x] **15. Age Min/Max Defaults** — Already correct: Defaults to min 18, max 65 in `formatDentalCampaignRow()`.
- [x] **16. Gender Format** — Already correct: `formatGender()` outputs Male / Female / all.
- [x] **17. Excluded Toimipisteet Format** — Already correct: `formatExcludedBranches()` uses semicolon-separated Smartly format.
- [x] **18. Same Campaign ID for Multi-Location** — Already correct: `addDentalCampaignToSheet()` uses same campaign ID for all rows.
- [x] **19. Creative URL Columns** — Already correct: Columns BM (1:1 feed) and BN (9:16 stories) handle separate creative URLs.
- [x] **20. Regional Campaign Multiple Rows** — Already correct: Multi-location logic creates one row per branch.

## Marketing Engine Flow

- [x] **21. All Toimipisteet in Radius List** — ✅ Changed branch filter from `b.active` to `b.coordinates || (b.latitude && b.longitude)` so all branches with coordinates are shown.
- [x] **22. Gender Targeting Only for Meta** — ✅ Added info banner: "Sukupuolikohdistus vaikuttaa vain Meta-kanavaan. Display ja PDOOH näytetään kaikille."
- [x] **23. Simplified Age Target Groups** — ✅ Changed presets to only 3 options: 18-40, 25-64, 40-100. Removed manual min/max inputs. Added PDOOH disclaimer: "Ikä-kohdennus ei mahdollista PDOOH-kanavassa."
- [x] **24. Campaign Modification** — ✅ Added "Sulje kampanja" (close/complete) and "Jatka kampanjaa" (resume) actions to campaign list. Campaigns can now be closed or resumed from the card menu.

## BidTheatre (External / Non-Code Tasks — For Reference)

- [ ] **25. BidTheatre API Scope** — Determine what needs to be done on BidTheatre side and what can be done via API. *(Owner: Janne)*
- [ ] **26. Display/Video/DOOH/Audio Deals** — Ensure all needed deals are setup and ready. *(Owner: Janne)*
- [x] **27. BidTheatre Automation Flow** — Create automation flow of all settings needed for API. *(Owner: Mike — DONE)*
- [ ] **28. DOOH Inventory** — Ensure BidTheatre contacts DOOH-media houses for ~3000 screens inventory. *(Owner: Janne)*
- [ ] **29. ClickTag Tracking** — Ensure clickTags work properly and BidTheatre tracks clicks. *(Owner: Mike)*
- [ ] **30. Creative Format & Size Limits** — Ensure creatives flow to BT in right format and don't exceed material weight limits. *(Owner: Anne-Mari)*
