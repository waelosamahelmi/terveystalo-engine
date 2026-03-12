# BidTheatre Integration — Pending Items

## 1. Campaign Naming Convention
**Status:** PENDING — needs confirmation  
**Current:** `ST / {CHANNEL} / {BranchName} / {campaignIdShort}`  
**Target:** `NØRR3_SUUNTT_B2C_{number}_{MANAGER}_{?}_DISPLAY_{CAMPAIGN_NAME}`  

Questions:
- What does `1234` represent — sequential number or campaign ID?
- What does `K` stand for in `SAVELA_K`?
- Is `KAMPANJANNIMI` the user-entered campaign name?
- How should per-branch naming work?

## 2. Spend Model "0% Margin / At cost"
**Status:** PENDING  
BidTheatre API may not expose this as a campaign-level setting — likely configured at the network/account level.

## 3. Click Target URL (Piwik + UTM Tags)
**Status:** PENDING — needs UTM tag structure  
**Current:** Uses `campaign.landing_url` directly.  
**Target:** `{creative_url}?pk_campaign={name}&utm_source=bidtheatre&utm_medium=display&utm_campaign={name}`  

Need confirmation of exact Piwik tracking parameters and UTM tag format.

## 4. Campaign Categories
**Status:** PENDING  
BidTheatre API returned 404 on `/campaign-category` endpoint.  
Current code sets `category: 3` which may be correct. Need to verify the ID for "Health & Fitness - Dental care" via BT support or documentation.

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
