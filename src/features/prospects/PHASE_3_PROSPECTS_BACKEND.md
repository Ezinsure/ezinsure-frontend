# Phase 3 — Prospects (acquisition leads)

**Audience:** Backend team  
**Frontend status:** Implemented  
**Product line:** Motor only  

Prospects store motorists currently insured with **other** providers. Agents capture phone + expiry; the backend sends an SMS to the owning agent when cover approaches expiry.

This is separate from renewals (existing Ezinsure policies).

---

## Frontend routes

| Role | Path | Capabilities |
|---|---|---|
| Agent | `/agent/motor/prospects` | CRUD own prospects |
| Admin | `/admin/motor/prospects` | Org-wide CRUD + agent filter |
| Super Admin | `/super_admin/motor/prospects` | Org-wide CRUD + agent filter |
| Finance | `/finance/motor/prospects` | Read-only org-wide |

---

## Data model

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | string | yes | |
| `phoneNumber` | string | yes | Prefer `2507XXXXXXXX` |
| `insuranceExpiryDate` | `YYYY-MM-DD` | yes | Current cover end date |
| `fullName` | string | no | |
| `currentInsurer` | string | no | Other provider name |
| `insuranceCategory` | string | no | e.g. `Car Insurance` |
| `notes` | string | no | |
| `agent` / `agentId` | object / id | yes | Owner who receives SMS |
| `smsReminderStatus` | enum | yes | See below |
| `lastSmsSentAt` | ISO datetime | no | |
| `smsFailureReason` | string | no | When status is `failed` |
| `createdAt` / `updatedAt` | ISO datetime | yes | |

### `smsReminderStatus`

| Value | Meaning |
|---|---|
| `pending` | Not yet due / not queued |
| `scheduled` | Job queued for send |
| `sent` | Agent SMS delivered (or accepted by gateway) |
| `failed` | Send failed |
| `not_applicable` | Opted out / suppressed |

---

## API endpoints

### List

```
GET /getProspects
```

Query params (all optional):

| Param | Example |
|---|---|
| `startDate` | `2026-08-23` |
| `endDate` | `2026-11-21` |
| `search` | free text |
| `smsReminderStatus` | `pending` \| `scheduled` \| `sent` \| `failed` |
| `agentId` | Mongo id |
| `bucket` | `upcoming` \| `expired` |

Role scope:

| Role | Scope |
|---|---|
| Agent | Own prospects only |
| Admin / Super Admin / Finance | Organisation-wide |

Response:

```json
{
  "success": true,
  "data": [ /* Prospect[] */ ],
  "count": 12
}
```

(FE also accepts `data: { data: [], count }` and bare arrays.)

### Create

```
POST /createProspect
Content-Type: application/json
```

```json
{
  "phoneNumber": "250788123456",
  "insuranceExpiryDate": "2026-10-15",
  "fullName": "Jean Uwimana",
  "currentInsurer": "Other Co",
  "insuranceCategory": "Car Insurance",
  "notes": "Met at garage",
  "agentId": "optional-for-staff"
}
```

- Agents: `agentId` ignored; set owner to authenticated agent  
- Staff: optional `agentId` to assign  

Default `smsReminderStatus`: `pending`.

### Update

```
PUT /updateProspect/{id}
```

Same body fields as create (partial allowed). Recalculate / reschedule SMS if `insuranceExpiryDate` changes.

### Delete

```
DELETE /deleteProspect/{id}
```

Agents may delete only their own; staff may delete any.

---

## Automated SMS job

Schedule (suggested): daily.

1. Find prospects whose `insuranceExpiryDate` falls within the reminder window (e.g. **14 days** and **7 days** before expiry — confirm with product).  
2. Group by owning agent.  
3. For each prospect due: send SMS to the **agent** (not the motorist), including phone and expiry.  
4. Update `smsReminderStatus` → `sent` (or `failed` + reason).  
5. Set `lastSmsSentAt`.

Suggested agent SMS copy:

```
Ezinsure: Prospect {fullName or phone}’s cover with {currentInsurer or "another insurer"} expires on {date}. Follow up to convert. Open Prospects in the app.
```

Deep link (optional): `/agent/motor/prospects`

---

## Checklist

- [ ] CRUD endpoints with role scoping  
- [ ] Persist phone + expiry as required fields  
- [ ] Return agent summary on list rows  
- [ ] SMS reminder status lifecycle  
- [ ] Scheduled job to SMS owning agent before expiry  
- [ ] Do not mix prospects into renewals eligibility  

---

## Frontend file map

| Concern | Path |
|---|---|
| Types | `src/features/prospects/types.ts` |
| API client | `src/features/prospects/api.ts` |
| Workspace UI | `src/features/prospects/prospects-workspace-page.tsx` |
| Create/edit modal | `src/features/prospects/prospect-form-modal.tsx` |
| Routes | `src/app/{agent,admin,super_admin,finance}/motor/prospects/page.tsx` |
| Nav | `src/shared/navigation/motor/*.nav.ts` |
