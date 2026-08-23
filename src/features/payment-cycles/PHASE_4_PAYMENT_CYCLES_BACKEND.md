# Phase 4 — Bi-weekly commission payment cycles

**Audience:** Backend team  
**Frontend status:** Implemented  
**Product lines:** Motor + Livestock finance  

Finance can settle commissions on fixed **14-day** periods instead of ad-hoc manual date ranges. The UI still calls the existing initiate / mark-paid endpoints with the cycle’s `startDate` and `endDate`. Optional catalogue endpoints below let the backend own cycle status and totals.

---

## Frontend routes

| Role | Path |
|---|---|
| Finance (motor) | `/finance/motor/payment-cycles` |
| Finance (livestock) | `/finance/livestock/payment-cycles` |

---

## Cycle rules (shared)

| Rule | Value |
|---|---|
| Period length | 14 days |
| Year start | Cycle 1 starts **1 January** |
| Year end | Last cycle ends **31 December** (may be shorter than 14 days) |
| Cycle id | `{year}-W{NN}` e.g. `2026-W01` |
| Dates | Inclusive `YYYY-MM-DD` local calendar dates |

Example 2026:

| id | startDate | endDate |
|---|---|---|
| `2026-W01` | `2026-01-01` | `2026-01-14` |
| `2026-W02` | `2026-01-15` | `2026-01-28` |
| … | … | … |

---

## Existing APIs reused (required)

Frontend initiates and completes payouts with the same range APIs as Payments / Initiated Payments:

### Motor

| Action | Method | Endpoint |
|---|---|---|
| Stats | `GET` | `/getFinanceAgentStats?startDate&endDate&applicationStatus` |
| Breakdown | `GET` | `/getAgentsCommissionBreakdown?startDate&endDate&applicationStatus` |
| Initiate | `PUT` | `/initiatePayment?startDate&endDate` |
| Mark paid | `PUT` | `/markAsPaid?startDate&endDate` |

`applicationStatus`: `READY_TO_BE_PAID` \| `PAYMENT_INITIATED` \| `PAID` \| `ALL`

### Livestock

| Action | Method | Endpoint |
|---|---|---|
| Stats | `GET` | `/getLivestockFinanceVetStats?startDate&endDate&applicationStatus` |
| Breakdown | `GET` | `/getVetsCommissionBreakdown?startDate&endDate&applicationStatus` |
| Initiate | `PUT` | `/initiateLivestockPayment?startDate&endDate` |
| Mark paid | `PUT` | `/markLivestockAsPaid?startDate&endDate` |

**Important:** Date filters must treat both ends as inclusive calendar days so a bi-weekly cycle does not drop boundary applications.

---

## Optional catalogue APIs (recommended)

When absent, the frontend generates cycles locally and infers status from the stats endpoints above.

### List cycles for a year

```
GET /getPaymentCycles?module=motor|livestock&year=2026
```

Response (`data` array or bare array):

```json
[
  {
    "id": "2026-W03",
    "year": 2026,
    "index": 3,
    "startDate": "2026-01-29",
    "endDate": "2026-02-11",
    "label": "29 Jan – 11 Feb 2026",
    "status": "ready",
    "totalCommission": 1250000,
    "totalApplications": 42,
    "producerCount": 8,
    "isCurrent": false
  }
]
```

### `status` values

| Value | Meaning |
|---|---|
| `open` | Cycle not closed; little or no ready volume yet |
| `ready` | All (or primarily) apps ready to pay |
| `initiated` | Payment initiated for the cycle range |
| `paid` | Fully paid |
| `partial` | Mix of ready / initiated / paid |
| `empty` | No commission applications in range |

### Optional get-by-id

```
GET /getPaymentCycle/{module}/{cycleId}
```

Same shape as a single list item, optionally with producer breakdown.

---

## Suggested backend behaviour

1. Persist cycle metadata (`module`, `year`, `index`, `startDate`, `endDate`, `status`) or derive on the fly with the same 14-day rules.
2. When `PUT /initiatePayment` (or livestock equivalent) runs for a range that matches a cycle, set that cycle’s status to `initiated`.
3. When mark-as-paid completes for that range, set status to `paid` (or `partial` if some apps remain).
4. Optionally auto-create the next open cycle when the previous is paid (UI already generates the full year locally).

---

## Out of scope for this phase

- Changing commission formulas  
- Splitting a cycle across multiple bank runs (UI pays the whole range at once)  
- Agent/vet self-serve cycle views  
