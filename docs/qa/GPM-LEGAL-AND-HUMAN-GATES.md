# GIFTEDproMovies3 — Legal, Governance & Human Action Gates Register

**Document Reference:** `docs/qa/GPM-LEGAL-AND-HUMAN-GATES.md`  
**Mission ID:** `GPM-PRE-FRONTEND-REMEDIATION-PROGRAM` (Stage 7)  
**Authority:** Product Owner Directive, Tanzania PDPA 2022, Tanzania EPOCA, TRA Tax Administration Act 2015  
**Classification:** Legal & Operational Governance Register  
**Status:** FORMAL PRE-FRONTEND RECONCILIATION — PRE-LAUNCH HUMAN GATES IDENTIFIED

---

## 1. Governance Principles & Separation of Concerns

In accordance with **Stage 7 (Legal and Business Operational Readiness)**:
1. **Software Engineering vs. Legal Compliance:** Software implementation of privacy, security, and data handling controls is necessary but not sufficient for legal compliance. Technical readiness does not substitute for corporate registration, statutory licensing, or bilateral contractual execution.
2. **Anti-Fabrication Invariant:** Under strict project governance rules, the engineering team does not fabricate legal registrations, commercial contracts, government approvals, or external sign-offs.
3. **Decoupling from Frontend Integration:** Pre-launch legal and human gates do not block Customer Frontend Integration (Phase 7 UI development), but they constitute mandatory release gates prior to public commercial launch.

---

## 2. Comprehensive Legal & Operational Obligations Register

| Ref ID | Legal / Operational Obligation | Applicable Authority | Accountable Party | Technical Implementation State | Required External Evidence / Human Action | Launch Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LEG-01** | **Data Controller Registration** | Tanzania Personal Data Protection Commission (PDPC) | Legal Counsel / Managing Director | Purpose-based data separation (ADR-027) & audit trails active. | Certificate of Registration as Data Controller issued by PDPC. | **Mandatory Pre-Launch Gate** |
| **LEG-02** | **Data Protection Officer (DPO)** | Tanzania PDPA 2022 §21 | Executive Management | DPO contact placeholders configured (`privacy@giftedpromovies.com`). | Formal appointment and notification of designated DPO to PDPC. | **Mandatory Pre-Launch Gate** |
| **LEG-03** | **Data Subject Rights Workflow** | Tanzania PDPA 2022 §34 (Erasure, Rectification) | Operations & Support Lead | Non-cascading account pseudonymization (`cleanup-retention.mjs`). | Customer support SOP for handling verified data-subject requests. | Operational Readiness |
| **LEG-04** | **Tax & Financial Records Retention** | Tanzania Tax Administration Act 2015 §35(3) | Finance / Tax Controller | 7-year retention floor enforced; financial tables immutable. | Tax Clearance Certificate & TRA Electronic Fiscal Device (EFD/VFD) integration review. | **Mandatory Pre-Launch Gate** |
| **LEG-05** | **Content Distribution Licensing** | Copyright and Neighbouring Rights Act, 1999 (Tanzania COSOTA) | Content Acquisition Lead | Polymorphic content taxonomy & DJ edition binding (ADR-032). | Executed distribution agreements with production studios and rights holders. | **Mandatory Pre-Launch Gate** |
| **LEG-06** | **DJ & Voice Artist Agreements** | Intellectual Property / Labor Law | Talent Management Lead | DJ profiles & video edition mapping (`dj_voice_artists`, `movie_editions`). | Executed talent contracts defining translation rights and compensation models. | **Mandatory Pre-Launch Gate** |
| **LEG-07** | **Google OAuth Production Publishing** | Google API Services User Data Policy | DevOps / Product Owner | Standard OIDC scopes (`openid`, `email`, `profile`), PKCE, signed cookies verified. | Google Search Console domain ownership verification & Consent Screen publishing. | **Mandatory Pre-Launch Gate** |
| **LEG-08** | **Disaster Recovery Staging Drill** | ARCH-014 & RUNBOOK-OPS-001 | DevOps Lead / SRE | Procedural SOP complete; software invariants verified in tests. | Controlled staging PITR drill execution and empirical RPO/RTO sign-off. | Pre-Launch SRE Gate |
| **LEG-09** | **Resend Custom Sending Domain** | RFC 5322, SPF/DKIM/DMARC | DevOps Lead | Worker sanitization, retry backoff, and monitoring complete. | Verified DNS records (DKIM, SPF, MX, DMARC) on production sending subdomain. | Pre-Launch Comms Gate |
| **LEG-10** | **Terms of Service & Privacy Notice** | Tanzania Law & Consumer Protection | Legal Counsel | Draft legal notices published in `docs/legal/`. | Final legal review and adoption of official corporate entity details. | **Mandatory Pre-Launch Gate** |
| **LEG-11** | **Age of Majority / Content Ratings** | Tanzania Film and Plays Act & TCRA Regulations | Content Operations Lead | 18+ policy drafted; content review notes implemented. | Formal determination on age-rating enforcement and parental consent rules. | Pre-Launch Policy Gate |
| **LEG-12** | **Payment Gateway Merchant Onboarding** | Bank of Tanzania (BOT) National Payment Systems Act | Finance & Commercial Lead | Provider-agnostic payment state machine (ADR-008); webhook verification active. | Executed merchant agreements with AzamPay, Flutterwave, or designated aggregator. | **Mandatory Pre-Launch Gate** |

---

## 3. Launch Blocker vs. Frontend Integration Gate Classification

To ensure unblocked execution while maintaining governance rigor:

### Category A: Pre-Frontend Integration Scope (CURRENT STATUS: READY)
- All technical architecture, security boundaries, authentication endpoints, commercial quota enforcement, download delivery mechanisms, device limits, and documentation traceability are **100% complete**.
- **Customer Frontend Integration is NOT BLOCKED by legal filings, tax certificates, or cloud staging drills.**

### Category B: Pre-Commercial Public Launch Gates (MANDATORY BEFORE PUBLIC USERS)
The following 5 gates must be formally cleared by designated human stakeholders before public launch:
1. **Corporate & Tax Identity:** BRELA registration, TIN, and VAT status confirmed by Legal/Finance.
2. **PDPC Data Controller Filing:** Formal submission and receipt of PDPC registration.
3. **Google OAuth Production Approval:** App published in Google Cloud Console without test-user restrictions.
4. **Production Payment Merchant Account:** Live credentials issued by authorized mobile money aggregator.
5. **Human SRE Recovery Drill:** Physical execution of `RUNBOOK-OPS-001` drill in staging.
