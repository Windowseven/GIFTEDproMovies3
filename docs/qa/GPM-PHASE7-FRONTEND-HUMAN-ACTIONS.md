# GIFTEDproMovies3 — PHASE 7 CUSTOMER FRONTEND INTEGRATION
# HUMAN ACTIONS & OPERATIONAL RUNBOOK

**Mission ID:** `GPM-PHASE7-CUSTOMER-FRONTEND-INTEGRATION`  
**Authority:** Product Owner Binding Directive  
**Date:** November 5, 2026  
**Audience:** Product Owner, Legal Counsel, Finance Lead, and DevOps Lead  

---

## 1. PURPOSE OF THIS RUNBOOK

This document specifies the operational, legal, and configuration actions that must be completed by human stakeholders before public launch of GIFTEDproMovies3.

These actions fall outside the automated authority of the AI engineering agent to preserve corporate integrity, legal accuracy, and financial compliance.

---

## 2. LEGAL & REGULATORY ACTIONS (LEGAL COUNSEL & PRODUCT OWNER)

### 2.1 Corporate Identity & Registration Disclosures
The legal routes created in Stage 3 (`/terms`, `/privacy`, `/cookies`, `/refunds`, `/account-deletion`, `/contact`) contain official pre-release draft notices. Prior to public deployment:
1. **BRELA Incorporation Details:** Update corporate registration numbers in `src/app/terms/page.tsx` and `src/app/privacy/page.tsx` once issued by the Business Registrations and Licensing Agency (BRELA).
2. **TRA Tax Identification Number (TIN):** Insert the official Taxpayer Identification Number and VAT registration certificate number (if applicable under TRA thresholds) in the legal disclosures.
3. **Data Protection Officer (DPO):** Register the appointed DPO with the Tanzania Personal Data Protection Commission (PDPC) pursuant to the Personal Data Protection Act 2022, and insert the designated contact email (e.g., `dpo@giftedpromovies.com`) into `src/app/privacy/page.tsx`.
4. **Legal Review:** Have licensed Tanzanian legal counsel conduct a final review of the published legal terms.

---

## 3. COMMERCIAL & PAYMENT GATEWAY ACTIONS (FINANCE & DEVOPS)

### 3.1 Live Payment Gateway Credentials
During development and staging, payments operate via simulated adapters and staging endpoints. Prior to processing live customer transactions:
1. **ClickPesa / PalmPesa Production API Keys:** Populate production credentials in the backend environment:
   - `CLICKPESA_API_KEY`
   - `CLICKPESA_BASE_URL` (https://api.clickpesa.com)
   - `PALMPESA_MERCHANT_ID`
   - `PALMPESA_SECRET_KEY`
2. **Webhook Endpoint Verification:** Confirm that the production webhook callback URLs (`https://api.giftedpromovies.com/api/v1/payments/webhooks/...`) are registered and verified in the provider dashboards with valid HMAC secrets.
3. **Settlement Accounts:** Confirm that Mobile Money settlement disbursements (Vodacom M-Pesa, Tigo Pesa, Airtel Money, Halopesa) are properly linked to the corporate bank account.

---

## 4. STORAGE & CDN CONFIGURATION (DEVOPS LEAD)

### 4.1 Cloudflare R2 Offline Delivery Verification
1. **Bucket Configuration:** Confirm the production Cloudflare R2 bucket name (`giftedpro-media-prod`) and verify that CORS headers allow browser download range requests.
2. **SigV4 Presigned URL Expiration:** Verify that the 900-second TTL matches production network profiles.
3. **Direct Download Custom Domain:** Optionally map a custom domain (e.g., `downloads.giftedpromovies.com`) to Cloudflare R2 to optimize latency across East African peering points.

---

## 5. PHASE 8 BOUNDARY REMINDER

- **Customer Streaming Lockout:** `CUSTOMER_STREAMING_ENABLED=false` must remain enforced in production environment variables. Any request to initiate video playback must continue returning HTTP 503 `STREAMING_COMING_SOON`.
- Customer streaming, live CDN transcoding, and multi-DRM infrastructure are strictly deferred to Phase 8 and V2 native mobile applications.

---

## 6. GIT RELEASE INSTRUCTIONS (ENGINEERING LEAD)

In accordance with strict system rules, the agent has made **zero automated Git commits, pushes, or resets**.

To review and commit the completed Phase 7 Customer Frontend Integration:

```bash
# 1. Inspect working tree changes
git status

# 2. Stage authorized frontend files and QA documentation
git add src/
git add next.config.ts
git add docs/qa/GPM-PHASE7-FRONTEND-*

# 3. Commit with formal Phase 7 message
git commit -m "feat(frontend): complete Phase 7 customer frontend integration with legal compliance and R2 downloads"

# 4. Create release tag
git tag -a v1.0.0-phase7-frontend -m "Phase 7 Customer Frontend Integration Complete"
```
