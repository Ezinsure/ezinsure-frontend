# Phase 1 enhancements — Backend API contract

**Audience:** Backend team  
**Frontend status:** Implemented (UI + typed clients; money math is indicative only)  
**Related UI surfaces:** Renewals workspace, motor expiring insurance, apply/renewal forms

This document describes **new or updated** API behaviour required by the Phase 1 frontend. Existing Phase 3 renewal docs still apply; this file **overrides** discount attribution rules.

---

## Summary of changes the frontend expects

| Area | Frontend behaviour | Backend must |
|---|---|---|
| Renewal discount attribution | Preview shows discount deducted from **company** commission by default, or from **agent/vet** commission when the original app was agent/vet-originated | Recalculate on create/preview; do not trust FE amounts |
| Eligibility / renewals list filters | Sends `insuranceCategory`, `agentId`, `province`, `district` | Accept and apply filters (role-scoped) |
| Expiring motor list filters | UI filters by agent, province, district, category; expects those fields on each row | Return agent + client location; optionally accept the same query params |
| New categories | Creates/filters `Tourist Insurance`; Fire already used as `Fire Insurance Coverage` | Persist and return both labels in category enums / validation |

---

## 1. Renewal discount attribution (override)

### Rule

```
discountAmount = round(netPremium * 0.01)
expectedPaymentAmount = netPremium - discountAmount
```

Then:

| Condition | Deduct `discountAmount` from |
|---|---|
| Original application **has** an originating agent (motor) or vet (livestock) | `agentCommission` / `veterinaryCommission` |
| Otherwise (company / admin-originated, no agent) | `companyCommission` |

```
agentCommissionAfterDiscount =
  hasOriginatingAgent
    ? max(0, agentCommissionBefore - discountAmount)
    : agentCommissionBefore

companyCommissionAfterDiscount =
  hasOriginatingAgent
    ? companyCommissionBefore
    : max(0, companyCommissionBefore - discountAmount)
```

### How the frontend detects “originating agent”

On list/preview rows the FE maps (first match wins):

- Nested `agent` / `veterinary` / `vet` / `createdBy` with `_id` + name → `hasOriginatingAgent = true`
- Or explicit flags: `hasOriginatingAgent`, `broughtByAgent`, `hasAgent`

**Preferred response field:** `hasOriginatingAgent: boolean` (authoritative).

### Endpoints affected

| Method | Path | Change |
|---|---|---|
| `GET` | `/getRenewalPreview/{module}/{id}` | Return discount breakdown with **both** agent and company after-discount amounts + `discountBearer`: `"agent" \| "company"` |
| `POST` | `/createRenewalApplication/{module}` | Recalculate using the rule above; persist `renewalDiscountAmount`, commissions after discount, and bearer |
| Weekly reminder job (Phase 3) | — | Potential commission for SMS must use commission **after** this attribution rule |

### Suggested preview payload additions

```json
{
  "discountBearer": "agent",
  "hasOriginatingAgent": true,
  "renewalDiscountAmount": 5000,
  "expectedPaymentAmount": 495000,
  "agentCommissionBeforeDiscount": 45000,
  "agentCommissionAfterDiscount": 40000,
  "companyCommissionBeforeDiscount": 50000,
  "companyCommissionAfterDiscount": 50000
}
```

When `discountBearer` is `"company"`, agent after = agent before, and company after is reduced.

---

## 2. Eligibility / renewals list — category & breakdown filters

### Endpoint (existing)

```
GET /getApplicationsEligibleForRenewal
```

### Existing query params (unchanged)

| Param | Values |
|---|---|
| `module` | `motor` \| `livestock` |
| `startDate` | `YYYY-MM-DD` |
| `endDate` | `YYYY-MM-DD` |
| `bucket` | `upcoming` \| `expired` (FE sends `expired` for the Eligible tab) |

### New optional query params (frontend already sends these)

| Param | Example | Notes |
|---|---|---|
| `insuranceCategory` | `Car Insurance` | Exact stored label preferred. Also accept aliases e.g. `Fire Insurance` ↔ `Fire Insurance Coverage` |
| `agentId` | Mongo id | Motor: agent user id. Livestock: veterinary user id |
| `province` | `East` | Client location (motor) or livestock/applicant location |
| `district` | `Bugesera` | Same |

### Role scoping (unchanged, still required)

| Role | Scope |
|---|---|
| Agent | Own motor applications only (`agentId` filter ignored or forced to self) |
| Vet | Own livestock applications only |
| Admin / Super Admin / Finance | Organisation-wide for the selected `module` |

### Required list row fields (additions)

In addition to Phase 3 contact/premium fields, each row should include:

| Field | Purpose |
|---|---|
| `insuranceCategory` | Motor category column + filter |
| `companyCommission` | Discount preview / attribution |
| `agent` **or** `veterinary` | `{ _id, fullName, email?, phoneNumber? }` |
| `hasOriginatingAgent` | Boolean (preferred) |
| `province`, `district`, `sector` **or** nested `client.province` / `livestockLocation` | Location column + filter |

Frontend mapper already accepts nested `client`, `livestockLocation`, `vehicle`, etc.

### Frontend usage

- **Motor renewals** (all roles): category filter always shown.
- **Admin / Super Admin / Finance** renewals (motor + livestock): also agent/vet + province + district filters and columns.
- Client-side filtering is applied as a **fallback** if the API ignores the new params; server-side filtering is still required for correct pagination at scale.

---

## 3. Expiring motor insurances — agent / location / category

### Endpoint (existing)

```
GET /getApplicationsWithExpiringInsurance?startDate=&endDate=
```

### Optional query params (same semantics as §2)

```
insuranceCategory, agentId, province, district
```

The current UI loads by **date range** and filters agent / location / category **client-side**, so the list payload must include enough fields even if query filters are not yet implemented. Implementing the query params is still recommended for large datasets.

### Required fields per application

| Field | Notes |
|---|---|
| `insuranceCategory` | Already used |
| `agent._id`, `agent.fullName`, `agent.phoneNumber?` | Agent filter + column |
| `client.province`, `client.district`, `client.sector` | Location filter + column |

### Frontend routes

- `/admin/motor/expiring-insurance` (and legacy `/admin/expiring-insurance`)
- `/super_admin/motor/expiring-insurance` (reuses the same page component)

CSV export includes agent + province/district/sector.

---

## 4. New insurance categories

### Canonical labels (persist these strings)

| Form key (public/agent apply) | Stored `insuranceCategory` |
|---|---|
| `car` | `Car Insurance` |
| `motorbike` | `MotorBike Insurance` |
| `building` | `Building Insurance` |
| `travel` | `Travel Insurance` |
| `health` | `Health Insurance` |
| `fire` | `Fire Insurance Coverage` |
| **`tourist`** | **`Tourist Insurance`** |

Staff admin apply also allows: `RC Bateau`, plus the labels above.

### Backend tasks

1. Add `Tourist Insurance` to allowed category enums / validation on create & update.
2. Ensure `Fire Insurance Coverage` remains accepted (already in production). Optionally treat `Fire Insurance` as an alias when filtering.
3. Admin fees: non-vehicle categories (including Fire and Tourist) already use the flat non-vehicle admin fee on the frontend (`calculateAdministrationFeesRwf`). Align backend fee rules.
4. Product-specific fields for Tourist / Fire (documents, risk details) are **TBD** — no extra required fields from the FE yet beyond category selection.

### Frontend surfaces already updated

- Public `/apply`, agent apply, track edit category select, admin new application, dashboard type filters, renewals category filter, expiring category filter.

---

## 5. Checklist for backend

### Discount attribution

- [ ] Preview returns `discountBearer`, both commission after-discount values, and `hasOriginatingAgent`
- [ ] Create renewal recalculates with company-vs-agent rule
- [ ] Reminder commission uses post-discount amounts with correct bearer

### Filters

- [ ] `GET /getApplicationsEligibleForRenewal` accepts `insuranceCategory`, `agentId`, `province`, `district`
- [ ] List rows include category, agent/vet, location, `companyCommission`
- [ ] `GET /getApplicationsWithExpiringInsurance` returns `agent` + `client.province|district|sector`
- [ ] Optional: same query filters on expiring endpoint

### Categories

- [ ] `Tourist Insurance` accepted on create/update
- [ ] Filters match exact labels (and Fire aliases if desired)

---

## 6. Frontend file map (for cross-check)

| Concern | Path |
|---|---|
| Pricing / attribution helpers | `src/features/renewals/renewal-pricing.ts` |
| List API + query builders | `src/features/renewals/renewal-api.ts` |
| Renewals UI + filters | `src/features/renewals/renewals-workspace-page.tsx` |
| Category catalog | `src/shared/insurance/categories.ts` |
| Motor expiring UI | `src/app/admin/expiring-insurance/page.tsx` |
| Motor renewal discount banner | `src/features/admin-motor-new-application/admin-new-application-page.tsx` |
| Livestock renewal discount banner | `src/features/livestock-application/livestock-application-form.tsx` |

---

## 7. Example requests

### Eligible motor renewals, Car Insurance, one agent, East / Bugesera

```
GET /getApplicationsEligibleForRenewal?module=motor&startDate=2024-01-01&endDate=2026-08-22&bucket=expired&insuranceCategory=Car%20Insurance&agentId=68abc…&province=East&district=Bugesera
```

### Upcoming livestock (vet-scoped; location filter)

```
GET /getApplicationsEligibleForRenewal?module=livestock&startDate=2026-08-23&endDate=2026-09-22&bucket=upcoming&province=East&district=Bugesera
```
