# Phase 2 — Livestock configurable company commission

**Audience:** Backend team  
**Frontend status:** Implemented  
**Default:** Company (Solektra) commission = **8%** of total premium (`premiumRateAmount`)  
**Allowed rates:** **5%**, **8%**, **10%**  
**Veterinary commission:** unchanged at **5%** of total premium

---

## Business rule

```
companyCommission = round(premiumRateAmount * companyCommissionRate / 100)
veterinaryCommission = round(premiumRateAmount * 0.05)
```

`companyCommissionRate` is one of `5 | 8 | 10`. Default **8** when omitted.

Rates can be set:

1. **Per vet** — default on the veterinary user profile; applied when that vet creates applications  
2. **Per application** — stored on the application; admin/finance may override at commission approval

---

## 1. Create / renew livestock application

### Payload addition (`premiumTotals`)

```json
{
  "premiumTotals": {
    "premiumPercentage": 5.5,
    "premiumRateAmount": 38500,
    "farmerContributionAmount": 23100,
    "governmentContribution": 15400,
    "companyCommissionRate": 8,
    "companyCommission": 3080,
    "veterinaryCommission": 1925,
    "totalSumAssured": 700000
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `companyCommissionRate` | `5 \| 8 \| 10` | Recommended | Default 8 if missing |
| `companyCommission` | number | Yes | FE sends indicative amount; **backend must recalculate** from rate × premium |

Frontend file: `use-livestock-application-form.ts` → `create.mapper.ts`.

---

## 2. Application detail / list responses

Return on each application (root or nested `totals`):

| Field | Example |
|---|---|
| `companyCommissionRate` | `8` |
| `companyCommission` | `3080` |

FE mapper: `readPackageTotals` in `api/mappers/totals.mapper.ts` (also accepts `companyCommissionPercent` alias).

List rows should include `companyCommission` / `companyCommissionRate` when available (dashboard aggregation prefers stored amounts).

---

## 3. Vet user profile — default rate

### Register / update veterinary user

| Field | Values | Notes |
|---|---|---|
| `companyCommissionRate` | `5`, `8`, or `10` | Default Solektra rate for apps this vet creates |

- Create: multipart `POST /register` (FormData field `companyCommissionRate`)  
- Update: `PUT /updateUser/{id}` JSON `{ "companyCommissionRate": 10 }`  
- Auth/me payload: include `companyCommissionRate` so the FE can prefill create forms

Frontend: livestock users create/edit (`admin-livestock-users`), `AppUser.companyCommissionRate`.

---

## 4. Commission approval override

### Existing endpoint

```
PUT /approveLivestockCommission/{id}
```

### Extended body

```json
{
  "notes": "Verified",
  "companyCommissionRate": 10
}
```

When `companyCommissionRate` is sent:

1. Validate it is 5, 8, or 10  
2. Recalculate and persist `companyCommission`  
3. Persist `companyCommissionRate` on the application  
4. Proceed to `READY_TO_BE_PAID` as today  

Frontend: commission workflow section sends the selected rate on approve.

---

## 5. UI behaviour (for context)

| Surface | Behaviour |
|---|---|
| Vet create form | Rate applied from vet profile (default 8); company amount **hidden** |
| Staff create form | Rate dropdown 5/8/10 + company amount shown |
| Application detail (non-vet) | Shows rate % and company amount |
| Commission review / approve | Rate selector with live amount preview |
| Livestock users (vet create/edit) | Default rate selector |
| Dashboard | Company commission caption “Solektra share (5–10%)”; sums use stored amounts |

---

## 6. Checklist

- [ ] Persist `companyCommissionRate` on applications (create + renew)  
- [ ] Recalculate `companyCommission` server-side; do not trust FE money fields  
- [ ] Accept `companyCommissionRate` on vet register/update and return it on auth/profile  
- [ ] `PUT /approveLivestockCommission/{id}` accepts optional rate override  
- [ ] Detail + list responses include rate and company commission amount  
- [ ] Reject rates other than 5, 8, 10  

---

## 7. Frontend file map

| Concern | Path |
|---|---|
| Rate constants / helpers | `domain/commission-rates.ts` |
| Premium split math | `utils/premium-calculations.ts` |
| Create payload | `use-livestock-application-form.ts`, `api/mappers/create.mapper.ts` |
| Detail totals mapping | `api/mappers/totals.mapper.ts` |
| Approve API | `api/commission-workflow-api.ts` |
| Approve UI | `components/workflow/commission-workflow-section.tsx` |
| Form premium step | `components/application-step-content.tsx` |
| Vet default rate UI | `admin-livestock-users/livestock-users-page.tsx`, `components/ui/admin/user-create-modal.tsx`, `user-edit-modal.tsx` |
