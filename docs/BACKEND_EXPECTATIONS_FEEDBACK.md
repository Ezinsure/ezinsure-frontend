# Backend expectations — EZINSURE frontend feedback implementation

This document describes API and domain changes the backend team needs to implement so the updated frontend works end-to-end. Frontend already ships UI and client contracts for these items (with safe fallbacks where endpoints are not live yet).

**Out of scope for this document (deferred / “done later”):** digital signature OTP (9.x), sector vet subsidy send-back (10.x), livestock email campaign work (11.x), province–village file update (12.x), discount copy in expiry SMS (13.x), weekly agent reminder SMS/email job (8.2 — backend-only job once renewals exist).

---

## 1. Transaction ID uniqueness (Motor + Livestock)

### Requirement
Reject payment-proof / payment uploads when `transactionId` already exists in the database (both Motor and Livestock).

### Expected behaviour
- On `PUT /uploadProofOfPayment/{applicationId}` (livestock) and the motor equivalent payment upload:
  - If `transactionId` is already stored on any application → **HTTP 409** (or 400) with a clear message, e.g. `Transaction ID already used`.
- Apply the same uniqueness check when finance/admin records payment references that are treated as transaction IDs.

### Frontend note
UI still collects a single transaction reference per upload batch; uniqueness is enforced server-side.

---

## 2. Livestock EarTag / Chip optional

### Requirement
- `chipNumber` / eartag is **optional** for cattle and pigs.
- Poultry **lot number** remains required.
- Applications with any cattle line missing a chip require sector-signed nkunganire.
- Subsidy export lines must include **only animals without a chip** (plus all pigs/poultry as today).

### API / persistence
- Accept create/update payloads with empty or omitted `chipNumber` for cattle/pig lines.
- Do not reject validation solely because chip is missing.
- Keep `tekanaEligible` derived from presence of chip when useful.

### Create payload (unchanged shape, relaxed validation)
```json
{
  "lines": [
    {
      "animal": { "chipNumber": "" },
      "tekanaEligible": false
    }
  ]
}
```

---

## 3. Remove Admin ability to mark applications as PAID

### Requirement
Only **Finance** may mark commission / application status as `PAID`.

### Endpoints
- `PUT /markLivestockCommissionPaid/{id}` — authorize **finance** only (not admin / super_admin).
- `PUT /markLivestockAsPaid?...` — finance only (already finance portal).
- Motor `PUT /markAsPaid?...` — finance only.

Admin may still:
- Mark **ready to be paid** (`PUT /approveLivestockCommission/{id}` / `PUT /markAsReadyToBePaid/{id}`).

Frontend already hides “Mark commission as paid” for admin roles.

---

## 4. Application workflow visibility

Frontend shows **all** workflow steps to every role and disables actions by role. No backend change required for visibility.

### Role action matrix (for BE authorization alignment)
| Step | Vet | Admin / Super Admin | Finance | SONARWA |
|------|-----|---------------------|---------|---------|
| Payment proof upload | Yes (own apps) | Yes | No | No |
| Payment proof verify | No | Yes | No | No |
| Issue insurance | No | Yes | No | No |
| Nkunganire download/upload | Yes | View | No | No |
| SONARWA review | No | View | No | Yes |
| Mark ready to pay | No | Yes | Yes | No |
| Mark PAID | No | **No** | Yes | No |

---

## 5. Livestock commissions & rates

### Premium rates (already expected)
| Species | Rate |
|---------|------|
| Cattle (Inka) | **5.5%** |
| Poultry (Inkoko) | **5.5%** |
| Pigs (Ingurube) | **6%** |

### Commission rates (update calculations)
| Role | Rate of total premium (100%) |
|------|------------------------------|
| Veterinary / agent | **5%** |
| Company (Solektra) | **8%** |

### Rules
- Persist `veterinaryCommission` and `companyCommission` using the new rates on create and renewals.
- **Never require** company commission in vet-facing responses if avoidable; frontend hides it for vet roles, but BE should still store it for finance/admin.

---

## 6. Phone numbers (Vet apply form)

### Requirement
- UI accepts **`07XXXXXXXX` only**.
- Before/at API submit, frontend sends **`2507XXXXXXXX`**.

### Backend
- Accept `2507…` (preferred) and optionally normalize `07…` → `2507…` if received.
- Validate Rwanda mobile format on create.

---

## 7. Multiple proofs of payment (Livestock)

### Upload — `PUT /uploadProofOfPayment/{applicationId}`
**Multipart fields**
| Field | Type | Notes |
|-------|------|-------|
| `proofsOfPayment` | `File[]` | **Preferred** — multiple files |
| `proofOfPayment` | `File` / repeated | Temporary backward compatibility |
| `amount` | number | Total farmer contribution |
| `transactionId` | string | Unique (see §1) |
| `notes` | string | Optional |

### Detail / list responses
Return an array, e.g.:

```json
{
  "proofsOfPayment": [
    {
      "documentUrl": "https://…",
      "transactionId": "MOMO-1",
      "notes": "Owner A",
      "uploadedAt": "2026-08-01T10:00:00.000Z",
      "fileName": "receipt-a.pdf"
    }
  ],
  "paymentProofs": [ "…same or alias…" ],
  "paidStatus": "SUBMITTED",
  "transactionId": "MOMO-1"
}
```

Frontend maps `proofsOfPayment` / `paymentProofs` into `paymentProof.documents[]`, and keeps `paymentProof.documentUrl` as the first/latest for older UI.

---

## 8. SONARWA routing (Livestock)

### Business rules
| Case | SONARWA review? | Next after insurance (+ subsidy if needed) |
|------|-----------------|--------------------------------------------|
| Cattle — **all** lines have chip | **No** | `PENDING_ADMIN_REVIEW` |
| Cattle — **any** line missing chip | **Yes** (whole application) | After sector/vet signed → SONARWA |
| Pigs | **Yes** | After sector signed → SONARWA |
| Chickens | **Yes** | After sector signed → SONARWA |

### Backend status transitions
When cattle with full chip coverage are issued:
- Skip `SUBSIDY_*` / SONARWA queues.
- Move to `PENDING_ADMIN_REVIEW` (or equivalent) after issue.

List endpoints used by SONARWA (`getSonarwa…`) must **exclude** cattle applications that do not require SONARWA.

---

## 9. Livestock dashboard statistics

### New endpoint
`GET /getLivestockDashboardStats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&vetId={optional}`

### Auth
- Admin / finance / super_admin: org-wide (omit `vetId` or ignore).
- Vet: must only receive own stats (`vetId` = authenticated vet; enforce server-side).

### Response shape
```json
{
  "startDate": "2026-08-01",
  "endDate": "2026-08-31",
  "applicationsCount": 42,
  "animalsInsured": {
    "cows": 120,
    "pigs": 40,
    "chickens": 800,
    "total": 960
  },
  "totalInsuredValue": 150000000,
  "totalAgentCommissions": 2500000,
  "totalCompanyCommissions": 4000000
}
```

Frontend falls back to aggregating `/getAllApplications` or `/getVeterinaryApplications` until this endpoint is live. Vet UI hides company commissions.

---

## 10. Renewals (Motor + Livestock)

### Concepts to store per renewal
| Field | Description |
|-------|-------------|
| `isRenewal` / `insuranceType: "Renewal"` | Flag |
| `originalApplicationId` | Source policy |
| `renewalDiscountAmount` | 1% of net premium |
| `renewalDiscountRate` | `0.01` |
| `expectedPaymentAmount` | net premium − discount |
| `agentCommissionBeforeDiscount` | Snapshot |
| `agentCommissionAfterDiscount` | Commission − discount |
| `renewedAt` | Timestamp |

**Rule:** Discount = **1% of net premium**, deducted from **agent/vet commission**. Client expected payment = net premium − discount.

### New / updated endpoints
1. `GET /getApplicationsEligibleForRenewal?module=motor|livestock&startDate=&endDate=`
   - Returns policies expiring in range (agent: own clients; admin: all; vet: own livestock apps).
2. `GET /getRenewalPreview/{module}/{applicationId}` (optional if create can compute)
3. `POST /createRenewalApplication/{module}`

**Create body**
```json
{
  "originalApplicationId": "…",
  "module": "motor",
  "discountAmount": 5000,
  "expectedPaymentAmount": 495000,
  "agentCommissionAfterDiscount": 45000,
  "notes": "optional"
}
```

**Create response**
```json
{
  "_id": "newApplicationId",
  "applicationNumber": "…",
  "insuranceType": "Renewal",
  "renewalDiscountAmount": 5000
}
```

### Client renew CTA
Public track page links clients to renew; backend should accept client-initiated renewal requests (OTP-authenticated application context) or instruct contact-agent flow. Prefer: authenticated create using tracked application number + OTP session.

---

## 11. Vet expiring client insurances

Covered by `GET /getApplicationsEligibleForRenewal?module=livestock&…` scoped to the authenticated vet (`agentId` / `vetId`).

Also acceptable alias:
`GET /getVeterinaryExpiringApplications?startDate=&endDate=`

---

## 12. Weekly agent reminder (backend job — 8.2)

Not built on frontend. Recommended job:

- Weekly SMS/email to each agent/vet with:
  - Count of clients expiring that week
  - Potential commission if renewed (sum of prior commissions or projected after discount)
  - Deep link to renewals list

Example copy is in the product brief.

---

## 13. Mapping summary — frontend routes expecting BE

| Frontend area | Endpoint |
|---------------|----------|
| Livestock dashboard | `GET /getLivestockDashboardStats` |
| Multi proof upload | `PUT /uploadProofOfPayment/{id}` + array fields |
| Renewals list | `GET /getApplicationsEligibleForRenewal` |
| Create renewal | `POST /createRenewalApplication/{module}` |
| Mark commission paid | Finance-only auth on existing PUT |
| Transaction uniqueness | Existing upload endpoints |
| SONARWA skip for chipped cattle | Status machine on issue / list filters |

---

## 14. Suggested implementation order for backend

1. Chip optional + SONARWA routing + subsidy export filter  
2. Commission rates 5% / 8%  
3. Transaction ID uniqueness  
4. Finance-only Mark PAID  
5. Multiple proofs of payment  
6. Dashboard stats endpoint  
7. Renewals APIs + persistence  
8. Weekly reminder job  

Questions: contact the frontend team with the OpenAPI/Postman collection for the new routes so clients can drop fallbacks.
