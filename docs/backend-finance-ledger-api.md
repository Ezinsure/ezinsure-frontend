# Backend: Finance Ledger API (Livestock)

Professional contract for the new livestock **Finance** screens (Overview → Ledger → Payouts → Statements → Receipts → Differences).

The frontend already calls these routes under `/financeLedger` with **camelCase** field names. Implement this surface from scratch so the UI works against the real API without UI rewrites.

**Source of truth in the frontend repo**

| Area | Path |
|---|---|
| Route builders | `src/features/finance-ledger/api/endpoints.ts` |
| API types | `src/features/finance-ledger/api/types.ts` |
| Domain models | `src/features/finance-ledger/domain/*` |
| Shared validation | `src/features/finance-ledger/domain/rules.ts` |
| Total-only apply algorithm | `src/features/finance-ledger/domain/apply-receipt-total.ts` |
| Behaviour reference (mock) | `src/features/finance-ledger/mock/*` |

**Scope**

| In scope now | Deferred |
|---|---|
| `module=livestock` | `module=motor` (same shapes later) |
| Total-only SONARWA receipts | Per-line remittance UI (API kept optional) |
| Unified platform + external-vet lines | Changing existing commission *calculation* APIs |

---

## 1. Conventions

### 1.1 Base path & auth

- Base: `/financeLedger`
- Auth: `Authorization: Bearer <token>`
- Roles:
  - **FINANCE** — full read/write
  - **ADMIN / SUPER_ADMIN** — read-only (optional but recommended)

### 1.2 Naming & formats

| Concern | Rule |
|---|---|
| Field names | camelCase everywhere |
| Money | Whole number in major unit (RWF has **no decimals**). Always include `currency` (`"RWF"`) on money-bearing resources |
| Calendar dates | `YYYY-MM-DD` (`DateOnly`) — never shift timezone when parsing |
| Timestamps | ISO-8601 UTC strings (`IsoDateTime`) |
| Arrays in query | Comma-separated: `stage=PAID,BILLED` |
| Period filter | `from`, `to`, optional `periodBy` |

### 1.3 Pagination

Every list returns:

```json
{
  "data": [ /* items */ ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 128,
    "totalPages": 6
  }
}
```

Query defaults:

| Param | Default | Notes |
|---|---|---|
| `page` | `1` | 1-based |
| `pageSize` | `25` | Clamp to **1–100** |
| `sort` | endpoint-specific | Prefix `-` for descending, e.g. `-paidAt,vetName` |

### 1.4 Single-resource envelope

Mutations, detail GETs, summary, and issue-checks return:

```json
{ "data": { /* resource */ } }
```

List endpoints return `{ "data": [...], "meta": { ... } }` (see §1.3).

### 1.5 Idempotency

Every **POST** / **PUT** must accept:

```http
Idempotency-Key: <uuid>
```

Same key + same body within a reasonable window (e.g. 24h) must return the **same result** and must **not** create a second payout/receipt/resolution.

### 1.6 Errors

Non-2xx JSON body:

```json
{
  "message": "Human-readable summary",
  "code": "MACHINE_CODE",
  "fieldErrors": {
    "amount": "Enter the amount received."
  }
}
```

| HTTP | When |
|---|---|
| `400` / `422` | Validation (`fieldErrors` preferred) |
| `401` | Missing/invalid token |
| `403` | Wrong role |
| `404` | Unknown id |
| `409` | Illegal state transition (`code` required) |
| `500` | Unexpected |

Legacy `{ "error": "…" }` is tolerated by the client but **do not use it** for new code.

---

## 2. Domain model

### 2.1 Money flow (business process)

1. Line is approved → stage `READY_TO_BE_PAID`
2. Finance prepares a payout → `PAYMENT_INITIATED` / payout `PREPARED`
3. Finance marks payout paid (bank refs) → `PAID`; line joins the **open statement** for that calendar month
4. Finance issues the statement to SONARWA → `BILLED`; statement `ISSUED`
5. Finance records bank total from SONARWA → lines reimbursed **oldest-first** → `REIMBURSED`
6. Shortfalls / missing coverage → **mismatches**; resolve with explain / rebill / write-off

**Bill to SONARWA per line**

```
subtotal        = round(vetCommission + companyCommission)
vatAmount       = round(subtotal * vatRate)     // livestock vatRate = 0.18
expectedAmount  = subtotal + vatAmount
```

Payouts pay **vet commission only**. Statements bill **vet + company + VAT**.

### 2.2 Line stages (`LedgerStage`)

| Stage | Meaning |
|---|---|
| `IN_REVIEW` | Waiting for approval |
| `READY_TO_BE_PAID` | Approved; can enter a payout |
| `PAYMENT_INITIATED` | On a prepared (unpaid) payout |
| `PAID` | Vet paid; on open/issued statement period |
| `BILLED` | On an **issued** statement; awaiting SONARWA |
| `REIMBURSED` | SONARWA covered this line |
| `DISPUTED` | Open “missing from SONARWA” mismatch |
| `REJECTED` | Rejected in review; never paid |

### 2.3 Line sources

| `source` | Origin |
|---|---|
| `PLATFORM_VET` | In-app veterinary application / renewal |
| `EXTERNAL_VET` | External vet commission request |

Both appear in the **same** ledger.

### 2.4 Statement statuses

| Status | Meaning |
|---|---|
| `OPEN` | Auto-created for a month; not yet sent |
| `ISSUED` | Sent to SONARWA; amounts frozen |
| `PARTIALLY_RECONCILED` | Some money received and/or absorbed; still outstanding or open mismatches |
| `RECONCILED` | `outstandingAmount <= 0` **and** `openMismatchCount === 0` |
| `WRITTEN_OFF` | Remaining balance written off |

**Auto-create rule:** when a payout is marked paid, attach each line to the open statement for the calendar month of `paidAt` (`STM-YYYY-MM`). Create the open statement if missing.

### 2.5 Payout statuses

`PREPARED` → `PAID` | `CANCELLED`

### 2.6 Mismatch kinds / statuses / actions

**Kinds**

| Kind | Meaning |
|---|---|
| `AMOUNT_DIFFERS` | SONARWA paid a different amount for a known line |
| `MISSING_FROM_SONARWA` | Line billed; not covered by the receipt total |
| `NOT_IN_OUR_RECORDS` | Per-line import only (optional API); money with no line |

**Statuses:** `OPEN` → `EXPLAINED` | `REBILL` | `WRITTEN_OFF`

**Resolve actions → status**

| `action` | Resulting `status` |
|---|---|
| `EXPLAIN` | `EXPLAINED` |
| `REBILL` | `REBILL` |
| `WRITE_OFF` | `WRITTEN_OFF` |

**Absorbed shortfall** (counts toward statement `writtenOffAmount`, not still owed):

- status `WRITTEN_OFF`, **or**
- status `EXPLAINED` with `reasonCode = ROUNDING`

`REBILL` and other explanations stay in outstanding until rebilled/paid.

**Rounding tolerance:** absolute difference ≤ `1` RWF may auto-resolve as `EXPLAINED` / `ROUNDING` on receipt apply.

### 2.7 Livestock remittance mode

Confirmed: **`TOTAL_ONLY`**.

- User records the **bank total** and allocates it across issued statements.
- Server applies each allocation to that statement’s `BILLED` lines, **oldest `paidAt` first**.
- Whole lines first; leftover that cannot cover the next line becomes a **partial** payment → `AMOUNT_DIFFERS` mismatch; uncovered billed lines → `MISSING_FROM_SONARWA`.
- `POST /receipts/importRemittance` is **optional** (future / motor). Livestock UI does not call it.

Algorithm reference: `applyReceiptTotalToLines` in `domain/apply-receipt-total.ts`.

### 2.8 Overdue thresholds

| Level | Days since `issuedAt` while outstanding |
|---|---|
| warning | ≥ 60 |
| critical | ≥ 120 |

---

## 3. Shared resource shapes

### 3.1 Actor & vet refs

```json
{
  "id": "user-42",
  "name": "Alice Finance",
  "role": "FINANCE"
}
```

```json
{
  "id": "vet-7",
  "name": "Dr. Niyonzima Jean Paul",
  "phoneNumber": "+2507…",
  "bankName": "BK",
  "bankAccountNumber": "1000…",
  "district": "Gasabo"
}
```

### 3.2 Ledger line (list item)

```json
{
  "id": "line-ls-26-0004",
  "module": "livestock",
  "source": "PLATFORM_VET",
  "stage": "BILLED",
  "currency": "RWF",
  "contractNumber": "LS-26-0004",
  "microchipNumber": "9851…",
  "clientName": "Uwimana Grace",
  "clientDistrict": "Gasabo",
  "vet": { "id": "vet-7", "name": "Dr. Niyonzima Jean Paul" },
  "applicationId": "app-…",
  "batchId": null,
  "batchNumber": null,
  "netPremium": 85000,
  "vetCommission": 15000,
  "companyCommission": 5000,
  "vatAmount": 3600,
  "expectedAmount": 23600,
  "submittedAt": "2026-07-03T08:12:00.000Z",
  "approvedAt": "2026-07-05T10:00:00.000Z",
  "paidAt": "2026-07-12T10:00:00.000Z",
  "billedAt": "2026-08-02T09:00:00.000Z",
  "reimbursedAt": null,
  "payoutId": "payout-pay-2026-07-0002",
  "payoutNumber": "PAY-2026-07-0002",
  "statementId": "stm-2026-07",
  "statementNumber": "STM-2026-07",
  "receivedAmount": null,
  "hasOpenMismatch": false,
  "openMismatchId": null,
  "mismatchAmount": null
}
```

### 3.3 Line detail + timeline

```json
{
  "data": {
    "line": { /* LedgerLine */ },
    "timeline": [
      {
        "id": "evt-1",
        "type": "SUBMITTED",
        "at": "2026-07-03T08:12:00.000Z",
        "actor": { "id": "vet-7", "name": "Dr. Niyonzima Jean Paul" }
      },
      {
        "id": "evt-2",
        "type": "SONARWA_APPROVED",
        "at": "2026-07-05T10:00:00.000Z"
      },
      {
        "id": "evt-3",
        "type": "PAYOUT_PREPARED",
        "at": "2026-07-11T14:00:00.000Z",
        "refId": "payout-…",
        "reference": "PAY-2026-07-0002"
      },
      {
        "id": "evt-4",
        "type": "PAID_TO_VET",
        "at": "2026-07-12T10:00:00.000Z",
        "amount": 15000,
        "reference": "BK-77821"
      },
      {
        "id": "evt-5",
        "type": "STATEMENT_ISSUED",
        "at": "2026-08-02T09:00:00.000Z",
        "reference": "STM-2026-07",
        "amount": 23600
      }
    ]
  }
}
```

**Timeline event types:**  
`SUBMITTED` · `SONARWA_APPROVED` · `SONARWA_REJECTED` · `ADMIN_APPROVED` · `ADMIN_REJECTED` · `PAYOUT_PREPARED` · `PAID_TO_VET` · `STATEMENT_ISSUED` · `REIMBURSED` · `MISMATCH_RECORDED` · `MISMATCH_RESOLVED`

Order chronologically ascending.

---

## 4. Endpoints

### 4.1 Summary (Finance Overview)

#### `GET /financeLedger/summary`

One row per calendar month for lines **paid to vets** in that month.

**Query**

| Param | Required | Notes |
|---|---|---|
| `module` | yes | `livestock` |
| `from` | yes | `YYYY-MM-DD` |
| `to` | yes | `YYYY-MM-DD` |
| `granularity` | no | only `month` supported |

**Response**

```json
{
  "data": {
    "module": "livestock",
    "currency": "RWF",
    "vatRate": 0.18,
    "totals": {
      "paidToVetsAmount": 1250000,
      "billedAmount": 1800000,
      "receivedAmount": 1500000,
      "writtenOffAmount": 1200,
      "outstandingAmount": 298800,
      "openMismatchCount": 5,
      "openMismatchAmount": -89420
    },
    "rows": [
      {
        "periodKey": "2026-07",
        "from": "2026-07-01",
        "to": "2026-07-31",
        "currency": "RWF",
        "paidToVetsAmount": 412000,
        "paidLineCount": 28,
        "billedAmount": 580000,
        "receivedAmount": 520000,
        "writtenOffAmount": 0,
        "outstandingAmount": 60000,
        "openMismatchCount": 5,
        "openMismatchAmount": -89420,
        "statementId": "stm-2026-07",
        "statementNumber": "STM-2026-07",
        "statementStatus": "PARTIALLY_RECONCILED",
        "issuedAt": "2026-08-02T09:00:00.000Z",
        "ageDays": 106
      }
    ]
  }
}
```

**Row rules**

- `paidToVetsAmount` / `paidLineCount` — lines with `paidAt` in the month (vet commission sum)
- `billedAmount` — statement `amountDue` once issued; else `0`
- `outstandingAmount` — `billedAmount - receivedAmount - writtenOffAmount` when issued; else `0`
- Rows newest period first
- Include months with activity **or** an existing statement

Also needed by Overview attention counts (frontend currently derives ready/prepared counts via payables + payouts lists). Prefer keeping those as separate list endpoints; optional later: a dedicated counts endpoint.

---

### 4.2 Ledger lines

#### `GET /financeLedger/lines`

**Query**

| Param | Default basis / notes |
|---|---|
| `module` | required |
| `page`, `pageSize`, `sort` | default sort e.g. `-submittedAt` |
| `from`, `to`, `periodBy` | default `periodBy=submittedAt` |
| `stage` | comma list |
| `source` | `PLATFORM_VET` \| `EXTERNAL_VET` |
| `vetId`, `statementId`, `payoutId` | filters |
| `hasOpenMismatch` | `true` \| `false` |
| `search` | contract, microchip, client, vet name |

**Response:** paginated `LedgerLine[]`

#### `GET /financeLedger/lines/:lineId`

**Response:** `{ "data": { "line", "timeline" } }`

---

### 4.3 Payables & payouts

#### `GET /financeLedger/payables`

Vets with ≥1 line in `READY_TO_BE_PAID`.

**Query:** `module`, paging, `from`/`to`/`periodBy` (default `approvedAt`), `search`

```json
{
  "data": [
    {
      "id": "vet-7",
      "name": "Dr. Niyonzima Jean Paul",
      "phoneNumber": "+2507…",
      "bankName": "BK",
      "bankAccountNumber": "1000…",
      "district": "Gasabo",
      "lineCount": 4,
      "netPremium": 340000,
      "amount": 60000,
      "currency": "RWF"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 12, "totalPages": 1 }
}
```

`amount` = sum of **vet commissions** for matching ready lines.

#### `GET /financeLedger/payouts`

**Query:** `module`, `status` (comma), period (default basis `preparedAt`; use `periodBy=paidAt` when filtering paid date), `vetId`, `search`, paging  
Default sort: `-preparedAt`

#### `GET /financeLedger/payouts/:id`

```json
{
  "data": {
    "id": "payout-pay-2026-11-0003",
    "payoutNumber": "PAY-2026-11-0003",
    "module": "livestock",
    "status": "PREPARED",
    "currency": "RWF",
    "vetCount": 3,
    "lineCount": 11,
    "totalAmount": 185000,
    "notes": "November batch A",
    "preparedAt": "2026-11-10T13:20:00.000Z",
    "preparedBy": { "id": "user-42", "name": "Alice Finance", "role": "FINANCE" },
    "paidAt": null,
    "paidBy": null,
    "cancelledAt": null,
    "cancelReason": null
  }
}
```

#### `GET /financeLedger/payouts/:id/vets`

Paginated `PayoutVetRow[]` (vet ref + `lineCount`, `netPremium`, `amount`, optional `paymentReference` once paid).

#### `POST /financeLedger/payouts`

Creates a payout in `PREPARED` and moves selected lines `READY_TO_BE_PAID` → `PAYMENT_INITIATED`.

**Headers:** `Idempotency-Key`

**Body — by lines**

```json
{
  "module": "livestock",
  "selection": {
    "mode": "lines",
    "lineIds": ["line-a", "line-b"]
  },
  "notes": "Optional note"
}
```

**Body — by vets**

```json
{
  "module": "livestock",
  "selection": {
    "mode": "vets",
    "vetIds": ["vet-7", "vet-9"],
    "period": {
      "from": "2026-10-01",
      "to": "2026-10-31",
      "by": "approvedAt"
    }
  }
}
```

**Behaviour**

- Only lines currently `READY_TO_BE_PAID` may be included
- `totalAmount` = sum of those lines’ `vetCommission`
- Suggested number format: `PAY-YYYY-MM-####`

**Errors**

| Code | HTTP | When |
|---|---|---|
| `LINE_NOT_PAYABLE` | 409 | A selected line is no longer ready |
| `NO_ELIGIBLE_LINES` | 422 | Vet mode found no matching ready lines |

**Response:** `{ "data": /* Payout */ }`

#### `PUT /financeLedger/payouts/:id/markPaid`

**Body**

```json
{
  "paidAt": "2026-11-12",
  "vets": [
    { "vetId": "vet-7", "paymentReference": "BK-77821" },
    { "vetId": "vet-9", "paymentReference": "MTN-99201" }
  ]
}
```

**Validation** (`validateMarkPayoutPaid`)

- `paidAt` valid `YYYY-MM-DD`, not in the future
- Every vet on the payout has a non-empty `paymentReference`

**Behaviour**

1. Payout must be `PREPARED` → else `409 PAYOUT_NOT_PREPARED`
2. Persist references on payout vets
3. Each line → `PAID`, set `paidAt`
4. Attach lines to open statement for calendar month of `paidAt` (create if needed)
5. Payout → `PAID` with `paidAt` / `paidBy`

**Response:** `{ "data": /* Payout */ }`

#### `PUT /financeLedger/payouts/:id/cancel`

```json
{ "reason": "Wrong vets selected" }
```

- Only `PREPARED` → else `409 PAYOUT_NOT_PREPARED`
- Reason required
- Lines return to `READY_TO_BE_PAID`; clear `payoutId` / `payoutNumber`
- Payout → `CANCELLED`

---

### 4.4 Statements

#### `GET /financeLedger/statements`

**Query:** `module`, `status`, period (applied to statement period), `overdueOnly=true`, paging  
Default sort: `-periodFrom`

#### `GET /financeLedger/statements/:id`

```json
{
  "data": {
    "id": "stm-2026-07",
    "statementNumber": "STM-2026-07",
    "module": "livestock",
    "status": "PARTIALLY_RECONCILED",
    "currency": "RWF",
    "periodFrom": "2026-07-01",
    "periodTo": "2026-07-31",
    "lineCount": 28,
    "vetCount": 9,
    "vetCommissionTotal": 412000,
    "companyCommissionTotal": 98000,
    "subtotal": 510000,
    "vatRate": 0.18,
    "vatAmount": 91800,
    "amountDue": 601800,
    "receivedAmount": 520000,
    "writtenOffAmount": 1200,
    "outstandingAmount": 80600,
    "openMismatchCount": 5,
    "openMismatchAmount": -89420,
    "createdAt": "2026-07-12T10:00:00.000Z",
    "issuedAt": "2026-08-02T09:00:00.000Z",
    "dueAt": "2026-09-01",
    "ageDays": 106,
    "writeOffReason": null
  }
}
```

**Frozen at issue:** `vetCommissionTotal`, `companyCommissionTotal`, `subtotal`, `vatAmount`, `amountDue` must not change after `ISSUED`.

**Derived while open/issued**

- `receivedAmount` — sum of receipt allocations to this statement (and/or applied line receipts)
- `writtenOffAmount` — absorbed mismatches + statement write-off remainder as designed
- `outstandingAmount` = `amountDue - receivedAmount - writtenOffAmount`
- `openMismatchCount` / `openMismatchAmount` — open mismatches on the statement
- `ageDays` — whole days since `issuedAt` when outstanding; omit when not issued

#### `GET /financeLedger/statements/:id/lines`

**Query:** paging, `vetId`, `withMismatch=true`, `search`  
Default sort: `paidAt`

```json
{
  "data": [
    {
      "lineId": "line-…",
      "contractNumber": "LS-26-0004",
      "clientName": "Uwimana Grace",
      "vetId": "vet-7",
      "vetName": "Dr. Niyonzima Jean Paul",
      "paidAt": "2026-07-12T10:00:00.000Z",
      "vetCommission": 15000,
      "companyCommission": 5000,
      "vatAmount": 3600,
      "expectedAmount": 23600,
      "receivedAmount": 22420,
      "differenceAmount": -1180,
      "mismatchId": "mm-…",
      "mismatchStatus": "OPEN"
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 28, "totalPages": 2 }
}
```

#### `GET /financeLedger/statements/:id/issueChecks`

Pre-flight before issue.

```json
{
  "data": {
    "canIssue": false,
    "blockers": [
      {
        "code": "STATEMENT_EMPTY",
        "message": "There are no paid lines in this period yet."
      }
    ],
    "warnings": [
      {
        "code": "UNPAID_PAYOUTS",
        "message": "3 lines are in payouts that are prepared but not marked paid. They will not be on this statement.",
        "lineCount": 3
      }
    ]
  }
}
```

| Code | Type | Meaning |
|---|---|---|
| `STATEMENT_NOT_OPEN` | blocker | Already issued / not open |
| `STATEMENT_EMPTY` | blocker | No lines on the statement |
| `UNPAID_PAYOUTS` | warning | Prepared payout lines exist (any) that will not be included |

`canIssue === blockers.length === 0`.

#### `PUT /financeLedger/statements/:id/issue`

```json
{
  "dueAt": "2026-09-01",
  "note": "Optional",
  "acknowledgeWarnings": true
}
```

**Behaviour**

1. Run issue checks; any blocker → `409` with that `code`
2. Warnings present and `acknowledgeWarnings !== true` → `409 WARNINGS_NOT_ACKNOWLEDGED`
3. Statement → `ISSUED`; set `issuedAt`, `dueAt` (default **+30 days**)
4. Freeze totals from current `PAID` lines on the statement
5. Those lines → `BILLED` with `billedAt`

**Response:** `{ "data": /* Statement */ }`

#### `PUT /financeLedger/statements/:id/writeOff`

```json
{ "reason": "SONARWA confirmed they will not pay the remainder" }
```

- Allowed when status is `ISSUED` or `PARTIALLY_RECONCILED` → else `409 STATEMENT_NOT_WRITABLE`
- Reason required
- Statement → `WRITTEN_OFF`; store `writeOffReason`
- Outstanding remainder treated as written off for totals

---

### 4.5 Receipts (total-only for livestock)

#### `GET /financeLedger/receipts`

**Query:** `module`, period (default on `receivedAt`), `statementId`, `search` (number/reference), paging  
Default sort: `-receivedAt`

#### `GET /financeLedger/receipts/:id`

```json
{
  "data": {
    "id": "rcp-…",
    "receiptNumber": "RCP-2026-0012",
    "module": "livestock",
    "currency": "RWF",
    "amount": 520000,
    "receivedAt": "2026-09-20",
    "reference": "SNW-REM-2026-07",
    "allocations": [
      {
        "statementId": "stm-2026-07",
        "statementNumber": "STM-2026-07",
        "amount": 520000
      }
    ],
    "remittanceFileName": null,
    "note": null,
    "mismatchCount": 5,
    "createdAt": "2026-09-20T11:00:00.000Z",
    "createdBy": { "id": "user-42", "name": "Alice Finance", "role": "FINANCE" }
  }
}
```

#### `POST /financeLedger/receipts`

**Headers:** `Idempotency-Key`

```json
{
  "module": "livestock",
  "amount": 520000,
  "receivedAt": "2026-09-20",
  "reference": "SNW-REM-2026-07",
  "allocations": [
    { "statementId": "stm-2026-07", "amount": 400000 },
    { "statementId": "stm-2026-08", "amount": 120000 }
  ],
  "note": "Optional"
}
```

Optional (not used by livestock UI today):

```json
{
  "remittanceImportId": "imp-…",
  "lineOverrides": [
    { "lineId": "line-…", "sonarwaAmount": 20000 }
  ]
}
```

**Validation** (`validateCreateReceipt`)

| Field | Rule |
|---|---|
| `amount` | Finite number **> 0** |
| `reference` | Non-empty trim |
| `receivedAt` | Valid date, not future |
| `allocations` | ≥1; unique `statementId`; each amount > 0; **sum === amount** |

**Behaviour (livestock total-only)**

1. Each allocated statement must be `ISSUED` or `PARTIALLY_RECONCILED` → else `409 STATEMENT_NOT_ISSUED`
2. For each allocation, take that statement’s current `BILLED` lines, sort by `paidAt` ascending, apply `applyReceiptTotalToLines(allocation.amount)`
3. Fully covered lines → `REIMBURSED`, set `receivedAmount = expectedAmount`, `reimbursedAt`
4. Partially covered line → `REIMBURSED` with partial `receivedAmount` **or** keep billed policy consistently — frontend mock sets stage `REIMBURSED` with partial amount and opens `AMOUNT_DIFFERS`
5. Uncovered billed lines after the total runs out → open mismatch `MISSING_FROM_SONARWA` (expected = line expected, sonarwa = 0); line → `DISPUTED`, `hasOpenMismatch=true`
6. `|difference| ≤ 1` → may auto-close as `EXPLAINED` / `ROUNDING`
7. Larger differences → open `AMOUNT_DIFFERS`
8. Recompute each affected statement status (`ISSUED` / `PARTIALLY_RECONCILED` / `RECONCILED`)
9. Set `mismatchCount` on the receipt

**Response:** `{ "data": /* Receipt */ }`

#### `POST /financeLedger/receipts/importRemittance` (optional / future)

Multipart form:

| Field | Type |
|---|---|
| `file` | spreadsheet |
| `module` | `livestock` |
| `statementIds` | comma-separated ids |

**Response** (nothing saved as a receipt yet):

```json
{
  "data": {
    "importId": "imp-…",
    "fileName": "sonarwa-remittance-2026-07.xlsx",
    "totals": {
      "expectedAmount": 601800,
      "sonarwaAmount": 520000,
      "differenceAmount": -81800,
      "matchedCount": 20,
      "differsCount": 3,
      "missingCount": 2,
      "unknownCount": 0
    }
  }
}
```

#### `GET /financeLedger/receipts/imports/:importId/rows`

Paginated remittance match rows for the import preview grid.

---

### 4.6 Mismatches (Differences)

#### `GET /financeLedger/mismatches`

**Query:** `module`, `status`, `kind`, `statementId`, `vetId`, period on `createdAt`, `search`, paging  
Default sort: `-createdAt`  
UI default filter: `status=OPEN`

```json
{
  "data": [
    {
      "id": "mm-0001",
      "module": "livestock",
      "kind": "AMOUNT_DIFFERS",
      "status": "OPEN",
      "currency": "RWF",
      "statementId": "stm-2026-07",
      "statementNumber": "STM-2026-07",
      "receiptId": "rcp-…",
      "lineId": "line-…",
      "contractNumber": "LS-26-0004",
      "vetName": "Dr. Niyonzima Jean Paul",
      "expectedAmount": 23600,
      "sonarwaAmount": 22420,
      "differenceAmount": -1180,
      "reasonCode": null,
      "note": null,
      "createdAt": "2026-09-20T11:00:00.000Z",
      "resolvedAt": null,
      "resolvedBy": null
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 5, "totalPages": 1 }
}
```

`differenceAmount = sonarwaAmount - expectedAmount` (negative ⇒ underpaid).

#### `PUT /financeLedger/mismatches/:id/resolve`

```json
{
  "action": "EXPLAIN",
  "reasonCode": "ROUNDING",
  "note": "Optional unless required"
}
```

**Reason codes:**  
`RATE_DIFFERENCE` · `VAT_DIFFERENCE` · `ROUNDING` · `REJECTED_BY_SONARWA` · `DUPLICATE` · `CONTRACT_NOT_FOUND` · `PAY_LATER` · `OTHER`

**Validation** (`validateResolveMismatch`)

- `reasonCode` required
- `note` required when `reasonCode === OTHER` **or** `action === WRITE_OFF`

**Behaviour**

1. Must be `OPEN` → else `409 MISMATCH_ALREADY_RESOLVED`
2. Set status from action; store reason/note; `resolvedAt` / `resolvedBy`
3. Clear line open-mismatch flags
4. If line was `DISPUTED` and action is **not** `WRITE_OFF` → return line to `BILLED`
5. Recompute statement status / absorbed amounts

**Response:** `{ "data": /* Mismatch */ }`

---

## 5. Error code catalog

| Code | HTTP | Context |
|---|---|---|
| `LINE_NOT_PAYABLE` | 409 | Create payout |
| `NO_ELIGIBLE_LINES` | 422 | Create payout (vet mode) |
| `PAYOUT_NOT_PREPARED` | 409 | Mark paid / cancel |
| `STATEMENT_NOT_OPEN` | 409 | Issue |
| `STATEMENT_EMPTY` | 409 | Issue |
| `WARNINGS_NOT_ACKNOWLEDGED` | 409 | Issue |
| `STATEMENT_NOT_WRITABLE` | 409 | Write-off |
| `STATEMENT_NOT_ISSUED` | 409 | Create receipt |
| `MISMATCH_ALREADY_RESOLVED` | 409 | Resolve mismatch |

Use `fieldErrors` for form validation (mark paid, create receipt, resolve, cancel reason).

---

## 6. Permissions matrix

| Endpoint | FINANCE | ADMIN / SUPER_ADMIN |
|---|---|---|
| All `GET` | yes | yes (recommended) |
| `POST` / `PUT` mutations | yes | no (`403`) |

---

## 7. Human-readable number formats (suggested)

| Resource | Pattern |
|---|---|
| Payout | `PAY-YYYY-MM-####` |
| Statement | `STM-YYYY-MM` |
| Receipt | `RCP-YYYY-####` |

Ids may be opaque; numbers are what users see in the UI.

---

## 8. Backend implementation checklist (QA)

Use this against the frontend with **`NEXT_PUBLIC_FINANCE_MOCK` unset** (real API only).

### Overview

- [ ] `GET /summary` returns monthly rows + totals for a six-month span
- [ ] Outstanding / mismatch figures match statements for the same months

### Ledger

- [ ] Paginated lines with stage / source / search / period filters
- [ ] Line detail timeline ordered and complete through reimbursed / mismatch events

### Payouts

- [ ] Payables list shows only `READY_TO_BE_PAID` aggregates
- [ ] Create payout by vets and by lines; idempotent retry safe
- [ ] Mark paid requires every vet reference; attaches lines to month statement
- [ ] Cancel restores lines to ready

### Statements

- [ ] Open statement appears after first paid payout in a month
- [ ] Issue checks + issue freezes totals and bills lines
- [ ] Write-off only on issued / partly reconciled

### Receipts (total-only)

- [ ] Allocations must sum to amount
- [ ] Oldest billed lines reimbursed first within each statement allocation
- [ ] Partial last line creates `AMOUNT_DIFFERS`; leftover billed lines create `MISSING_FROM_SONARWA`
- [ ] Statement moves to partly reconciled / reconciled correctly

### Differences

- [ ] Open mismatches list + filters
- [ ] Resolve explain / rebill / write-off with note rules
- [ ] Absorbed rounding / write-off updates statement outstanding

### Cross-cutting

- [ ] `Idempotency-Key` respected on all mutations
- [ ] Money integers only; currency always present
- [ ] `DateOnly` never off-by-one vs Africa/Kigali calendar day
- [ ] Pagination meta always present on lists

---

## 9. Migration notes

Existing livestock finance screens (`/payments`, `/payment-initiated`, `/history`) now **redirect** to the new payouts/overview routes. Prefer migrating data into ledger lines / payouts rather than keeping parallel payment APIs forever.

Lines should be projected from:

- Platform vet commission applications (approved / ready / paid states mapped into `LedgerStage`)
- External vet commission requests (same stage machine)

Do **not** silently fall back to demo data on the frontend — if an endpoint is missing, the UI must show an error.

---

## 10. Sample happy path (copy for Postman)

1. `GET /financeLedger/payables?module=livestock&from=2026-10-01&to=2026-10-31`
2. `POST /financeLedger/payouts` with vet selection → `PREPARED`
3. `PUT /financeLedger/payouts/:id/markPaid` with bank refs → lines `PAID`, open `STM-YYYY-MM`
4. `GET /financeLedger/statements/:id/issueChecks` → `PUT .../issue` with `acknowledgeWarnings` if needed
5. `POST /financeLedger/receipts` with bank total allocated to that statement
6. `GET /financeLedger/mismatches?module=livestock&status=OPEN`
7. `PUT /financeLedger/mismatches/:id/resolve` as needed
8. Confirm `GET /financeLedger/summary` and statement `outstandingAmount` / status

---

*Document version: aligned with frontend finance-ledger phases 0–9 (Nov 2026). Update this file when the contract changes.*
