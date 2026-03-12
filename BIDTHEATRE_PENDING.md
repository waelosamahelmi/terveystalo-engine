# BidTheatre Integration — Pending Items

## 1. Campaign Naming Convention
**Status:** ✅ DONE  
**Format:** `NØRR3_SUUNTT_B2C_{seqNumber}_SAVELA_K_{CHANNEL}_{CAMPAIGN_NAME}`  

- `seqNumber` = count of distinct `campaign_id` values in `bidtheatre_campaigns` + 1
- `SAVELA_K` = hardcoded for now (user to clarify later)
- `CAMPAIGN_NAME` = user-entered campaign name, uppercased, spaces → underscores
- Per-branch: same name (no branch differentiation)
- Implemented in: create + update functions (both .mts source and .ts deployed)

## 2. Spend Model "0% Margin / At cost"
**Status:** PENDING  
BidTheatre API may not expose this as a campaign-level setting — likely configured at the network/account level.

## 3. Click Target URL (Piwik + UTM Tags)
**Status:** ✅ DONE  
**Pattern:** `{landing_url}?pk_campaign=...&pk_source=rtb&pk_medium=display&pk_content=banneri_{serviceSlug}&utm_campaign=...&utm_source=rtb&utm_medium=display&utm_content=banneri_{serviceSlug}`  

- Funnel mapping: `yleinen*` → `tietoisuus` (awareness), specific services → `harkinta` (consideration)
- Service slug mapping: `yleinen-brandiviesti` → `yleinen`, others stay as-is
- Per-ad service detection: checks creative.service_name, then parses creative name pattern, falls back to campaign service
- Implemented in: create + update functions (both .mts and .ts), Google Sheets column AR
- Meta UTM helper (`buildMetaUtmParams`) also added to Google Sheets for future use

## 5. PDOOH Filter Target (DOOH default)
**Status:** PENDING — ID not in discovery results  
Current code uses `defaultFilterTarget: 32491` for PDOOH.  
The "BidTheatre Default Filter - DOOH" was not found in the 11 filter targets returned.  
This might be a system-level filter or needs creation.

## 6. Expected Total Impressions
**Status:** PENDING  
Current values: DISPLAY=8422, PDOOH=12500.  
No API endpoint found for retrieving recommended impression counts.  
Should these be calculated from budget/CPM, or are they BT defaults?
