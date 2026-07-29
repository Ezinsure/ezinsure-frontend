# SONARWA Representative Portal — Backend API Contract

Front-end reference for the livestock SONARWA portal. Use this when granting role
permissions and implementing / updating endpoints.

Role: `SONARWA_REPRESENTATIVE`

---

## 1. Endpoints that need access (existing)

### Motor dashboard (`/sonarwa/motor/dashboard`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/countApplicationsThisMonth?startDate&endDate` | Applications count this month |
| GET | `/getTotalCompanyCommissionThisMonth?startDate&endDate` | SONARWA billing / commission summary |
| GET | `/getRecentApplications` | Recent motor applications (read-only list) |
| GET | `/getInsuranceDistribution` | Insurance mix chart data |

### Livestock dashboard + applications detail

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/getVeterinaryApplicationById/{id}` | Open application detail panel |
| PUT | `/reviewLivestockSubsidySonarwa/{id}` | Approve / approve-with-changes (see §3) |

Shared auth: `GET /auth/me`, `PUT /logout`, `POST /login` (already general).

---

## 2. New endpoint to create

### `GET /getSonarwaLivestockApplications`

Server-paginated livestock applications **at or past** the SONARWA review stage.

**Query**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `startDate` | `YYYY-MM-DD` | yes | Inclusive |
| `endDate` | `YYYY-MM-DD` | yes | Inclusive |
| `pageNumber` | number | yes | 1-based |
| `pageSize` | number | yes | Default client uses 25 |
| `reviewScope` | `pending` \| `all` | yes | See below |

**`reviewScope`**

- `pending` — awaiting SONARWA decision only (currently in SONARWA review stage).
- `all` — at SONARWA review **or** any status after it (approved / pending admin review / ready to pay / paid, etc.).

**Date filter semantics (recommended)**  
Filter by `submittedAt` **or** by the time the application entered SONARWA-eligible status. Document which field you use. Front-end defaults to **current calendar month**.

**Response shape (aligned with `/getAllApplications`)**

```json
{
  "data": [ /* LivestockApplication list rows */ ],
  "meta": {
    "total": 120,
    "pageNumber": 1,
    "pageSize": 25,
    "totalPages": 5,
    "startDate": "2026-07-01",
    "endDate": "2026-07-25"
  }
}
```

List rows should include at least: `_id`, `applicationNumber`, `status`, `subsidyStatus`, `subsidyRequired`, `veterinaryCommission`, owner/vet/location fields used by the existing livestock list mapper.

**Statuses expected in scope**

Pending examples:

- `SUBSIDY_SECTOR_SIGNED` / `SUBSIDY_VET_SIGNED`
- Tekana-skip path: `INSURANCE_ISSUED` when subsidy is not required

Past / included in `all`:

- `SUBSIDY_SONARWA_APPROVED`
- `PENDING_ADMIN_REVIEW`
- `COMMISSION_APPROVED` (if used)
- `READY_TO_BE_PAID`
- `PAID`

---

## 3. Changed endpoint: SONARWA review

### `PUT /reviewLivestockSubsidySonarwa/{applicationId}`

**Content-Type:** `multipart/form-data` (required so a correction file can be uploaded).

### Actions

| `action` | Meaning | Required fields |
|----------|---------|-----------------|
| `approve` | Clean approval — flow continues to admin review | — |
| `approve_with_changes` | Approve after SONARWA corrects evidence + commission | `correctionDocument`, `updatedVeterinaryCommission`, `changeComment` |
| `reject` | Optional / legacy send-back (admin may still use) | `rejectionReason` |

### Multipart fields

| Field | Type | When |
|-------|------|------|
| `action` | string | always |
| `rejectionReason` | string | `reject` |
| `correctionDocument` | file (PDF/image) | `approve_with_changes` |
| `updatedVeterinaryCommission` | number (RWF) | `approve_with_changes` |
| `changeComment` | string | `approve_with_changes` |

### Expected result (both approve paths)

- Application status → `PENDING_ADMIN_REVIEW` (or your equivalent next step)
- Subsidy status → `SONARWA_APPROVED`
- Persist `sonarwaReview` on the application (see §4)
- For `approve_with_changes`, store the uploaded file URL and set the veterinary commission that finance should use to the **updated** amount (keep original for audit)

---

## 4. Application schema changes

Add (or nest) on the livestock application document:

```ts
sonarwaReview?: {
  decision: 'APPROVED' | 'APPROVED_WITH_CHANGES' | 'REJECTED';
  reviewedAt: string;           // ISO datetime
  reviewedByUserId?: string;
  reviewedByName?: string;
  changeComment?: string;       // required when APPROVED_WITH_CHANGES
  correctionDocumentUrl?: string;
  originalVeterinaryCommission?: number;
  updatedVeterinaryCommission?: number;
}
```

Also:

- When `APPROVED_WITH_CHANGES`, update the live `veterinaryCommission` (or premium totals field finance reads) to `updatedVeterinaryCommission`, while keeping `originalVeterinaryCommission` for audit.
- Keep existing `subsidyCase.sonarwaApprovedAt` / rejection reason fields for compatibility.

Front-end types live in:

- `src/features/livestock-application/domain/application-types.ts` → `SonarwaReviewRecord`
- Mapper: `src/features/livestock-application/api/mappers/sonarwa-review.mapper.ts`

UI display of correction details for admin/finance can follow once this payload is returned on detail GET.

---

## 5. Front-end wiring summary

| UI | Endpoint |
|----|----------|
| Motor dashboard | existing 4 GETs in §1 |
| Livestock dashboard counts | `GET /getSonarwaLivestockApplications` (`pending` + `all`, pageSize=1 for meta.total) |
| Livestock applications list | `GET /getSonarwaLivestockApplications` |
| Application detail panel | `GET /getVeterinaryApplicationById/{id}` |
| Review submit | `PUT /reviewLivestockSubsidySonarwa/{id}` multipart |

Do **not** grant SONARWA reps access to motor application manage / approve routes, livestock user admin, commission pay, or issue-insurance endpoints.
