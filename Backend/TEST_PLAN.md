# SmartBuy.ai — Industrial Test Plan

## 1. Overview
This document outlines the testing strategy for the SmartBuy.ai platform, focusing on accuracy, reliability, and regression prevention. We utilize industrial-standard methodologies including Unit Testing, White/Black Box testing, and Automated Integration testing.

## 2. Testing Methodologies

### 2.1 Unit Testing (White Box)
**Goal:** Verify individual functions and logic branches in isolation.
*   **Recommendation Engine:** 
    *   Test signal generation (`BUY`, `WAIT`, `NEUTRAL`) with various mock price histories.
    *   Verify confidence score calculation under edge cases (e.g., only 1 platform found, extreme price drops).
    *   Test statistical functions (`getPercentile`) and trend detection.
*   **Scraper Accuracy Helpers:** 
    *   Test `isTitleMatch` against known accessory titles (cases, chargers) and exact product matches.
    *   Verify `parsePrice` handles various currency formats (₹, commas, decimals).

### 2.2 Integration Testing (Black Box)
**Goal:** Verify end-to-end API flows and component interactions.
*   **Search Flow:** `GET /api/search` -> Scraper -> Recommendation Engine -> DB Persistence -> JSON Response.
*   **Alerts Flow:** `POST /api/alerts` -> Auth Middleware -> MongoDB Storage.
*   **Auth Flow:** Register -> Login -> JWT Validation on protected routes.

### 2.3 Regression Testing
**Goal:** Ensure new changes don't break existing functionality.
*   Automated test suite execution via `npm test` before every deployment.
*   Validation of the `start.sh` startup script reliability.

### 2.4 Defect Root Cause Analysis (Accuracy Focus)
**Goal:** Systematic improvements to data reliability.
*   **Problem:** Accessories polluting results. 
    *   **Fix:** Added title keyword similarity filtering + accessory keyword exclusion list.
*   **Problem:** Single price spikes skewing historical peak. 
    *   **Fix:** Improved `recommendationEngine` to use the 90th percentile (stable peak) instead of a simple maximum.

## 3. Test Cases

| ID | Category | Description | Expected Result |
|----|----------|-------------|-----------------|
| TC-01 | Unit | Rec. Engine: High Discount (>25%) | Signal = `buy`, Confidence > 75% |
| TC-02 | Unit | Rec. Engine: Trend detection (down) | Boosts "BUY" confidence score |
| TC-03 | Unit | Scraper: Accessory title (e.g. "Case") | `isTitleMatch` = `false` for product search |
| TC-04 | Integrate | Search: Fresh Query | API returns `pending` status and `jobId` |
| TC-05 | Integrate | Search: Cached Query | API returns `cached` status and stored payload |

## 4. Execution
```bash
cd Backend
npm test
```
