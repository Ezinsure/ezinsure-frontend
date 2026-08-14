# PHASE 3 — EXPIRY FOLLOW-UP AND RENEWAL OPERATIONS

EZINSURE BACKEND IMPLEMENTATION REQUIREMENTS

This phase covers expiry follow-up, weekly Agent/Vet reminders, client renewal-discount information, and the backend work required by the **edit-then-create renewal** flow now used in the frontend.

**Out of scope for Phase 3 (moved to Phase 4):**

- Vet digital signature of Nkunganire (OTP + location)
- Sector Vet subsidy-file signing
- Livestock application email notifications
- Client purchase-email wording review
- Province-to-village location data (waiting for Thierry’s file)

---

## 1. VET EXPIRING CLIENT INSURANCE FOLLOW-UP

### 1.1 Requirement

Allow Vets to see the expiring insurances of clients whose applications they previously submitted.

The purpose is to make it easier for Vets to follow up with their clients and encourage them to renew their insurance.

The backend should use the renewal eligibility functionality implemented in Phase 2.

The frontend uses:

- `/vet/livestock/expiring`
- `/vet/livestock/renewals`

Both call the same eligibility API with `module=livestock`.

### 1.2 Renewal Eligibility Endpoint

Preferred endpoint:

```
GET /getApplicationsEligibleForRenewal?module=livestock&startDate=&endDate=
```

The endpoint must be scoped to the authenticated Vet.

The backend must ensure that the Vet can only retrieve applications/clients associated with that Vet.

The same endpoint is used for Motor:

```
GET /getApplicationsEligibleForRenewal?module=motor&startDate=&endDate=
```

Role scoping:

| Role | Scope |
|---|---|
| Vet | Own livestock applications only |
| Agent | Own motor applications / clients only |
| Admin / Super Admin | Organisation-wide, for the selected module |

### 1.3 Optional Dedicated Endpoint

If a separate endpoint is preferred, the backend may expose:

```
GET /getVeterinaryExpiringApplications?startDate=&endDate=
```

The response should contain only Livestock applications associated with the authenticated Vet.

### 1.4 List row fields (required for the frontend table)

Each expiring application in the list **must** include enough data for follow-up, especially for **Motor**.

Return at least:

| Field | Description |
|---|---|
| `_id` | Application ID |
| `applicationNumber` | Human-readable number |
| `clientName` / `ownerName` / `ownerSummary` / nested `client.fullName` | Client name |
| `phone` / `phoneNumber` / `ownerPhone` / nested `client.phoneNumber` | Phone |
| `email` / nested `client.email` | Email (Motor especially) |
| `policyEndDate` or `insuranceEndAt` | Expiry date |
| `netPremium` or `amount` or `farmerContributionAmount` | Net premium |
| `agentCommission` or `veterinaryCommission` | Commission before discount |
| `plateNumber` or nested `vehicle.plateNumber` | Motor plate, when applicable |
| `speciesGroup` | Livestock, when applicable |

The frontend table shows **client name**, **phone**, and **email**. Nested `client` objects are accepted.

---

## 2. WEEKLY AGENT/VET EXPIRY REMINDER

### 2.1 Requirement

Send Agents/Vets a weekly SMS/email showing clients whose insurance is about to expire.

The message should help the Agent/Vet understand the potential commission they could earn by renewing those applications.

### 2.2 Backend Scheduled Job

Create a scheduled weekly backend job.

The job must:

1. Identify applications whose insurance expires during the upcoming week.
2. Group the applications by Agent/Vet.
3. Count the number of clients whose insurance is expiring.
4. Calculate the potential commission if those applications are renewed.
5. Prepare the renewal list / deep link.
6. Send the information to the SMS/email notification service.

Frontend deep links (no extra reminder page):

| Audience | URL |
|---|---|
| Livestock Vet | `/vet/livestock/renewals` |
| Livestock expiring follow-up | `/vet/livestock/expiring` |
| Motor Agent | `/agent/motor/renewals` |
| Admin livestock | `/admin/livestock/renewals` |
| Admin motor | `/admin/motor/renewals` |

### 2.3 Required Reminder Data

For each Agent/Vet, the backend should calculate:

- Number of clients expiring this week
- Potential renewal commission
- Renewal applications / list
- Renewal page deep link

### 2.4 Potential Commission

The potential commission must be consistent with Phase 2 renewal rules.

Use **projected commission after the 1% renewal discount**:

```
discountAmount = round(netPremium * 0.01)
agentCommissionAfterDiscount = max(0, previousCommission - discountAmount)
```

Sum `agentCommissionAfterDiscount` across that Agent/Vet’s expiring applications.

### 2.5 Example Reminder

```
You have 10 clients whose insurance will end this week.
You could potentially make 50,000 commission if you renewed their applications.
Please click here to see their list.
```

The backend should provide the notification service with the data required to generate/send this message.

---

## 3. RENEWAL REMINDER DISCOUNT INFORMATION

### 3.1 Requirement

When reminder messages are sent to clients asking them to renew their insurance, the message may also include information about the discount they will receive.

This is an extension of the renewal functionality.

### 3.2 Discount Information

The current renewal discount is **1% of net premium**.

The backend should make the applicable discount amount available to the notification layer:

- `renewalDiscountRate`: `0.01`
- `renewalDiscountAmount`: `round(netPremium * 0.01)`
- `expectedPaymentAmount`: `netPremium - renewalDiscountAmount`

The public tracking page (`/track`) already displays this 1% offer when an end date is present. The backend should return `netPremium` / `amount` so the amount can be shown.

### 3.3 Example

The client reminder may include:

```
Your insurance is about to expire.
Renew now and receive a 1% renewal discount.
```

The exact wording can be handled by the notification/frontend layer. The backend must provide the correct discount information.

---

## 4. RENEWAL CREATE FLOW — EDIT PREVIOUS APPLICATION

The frontend no longer creates a renewal from the list in one click.

Flow:

1. User opens the expiring list and clicks **Renew**.
2. Frontend loads the original application and prefills an **edit form**.
3. User may change client, animals/vehicle, dates, and cover details.
4. User submits **Create renewal**.
5. Backend creates a **new** application linked to the original, marked as a renewal, with discount fields recalculated server-side.

Cover dates: default start = day after previous `policyEndDate` / `insuranceEndAt`; default end = previous end + 1 year. The user may change these dates.

### 4.1 POST `/createRenewalApplication/{module}`

`module` = `motor` | `livestock`

The backend **must recalculate** discount and commissions. Do not trust frontend money fields.

Persist at least:

| Field | Description |
|---|---|
| `insuranceType` | `"Renewal"` |
| `originalApplicationId` | Original policy / application |
| `renewalDiscountRate` | `0.01` |
| `renewalDiscountAmount` | 1% of net premium |
| `expectedPaymentAmount` | Net premium − discount |
| `agentCommissionBeforeDiscount` | Vet/Agent commission before discount |
| `agentCommissionAfterDiscount` | Commission after discount is deducted |
| `renewedAt` | Timestamp |

Validate:

- Original application exists and is eligible for renewal.
- Authenticated user is allowed to renew that application.
- Livestock chip numbers remain optional (Phase 1). Poultry lot number remains required.
- Duplicate `transactionId` rules still apply later at payment-proof upload.

### 4.2 Livestock request body

```json
{
  "originalApplicationId": "ORIGINAL_ID",
  "module": "livestock",
  "notes": "optional",
  "application": {
    "speciesGroup": "CATTLE",
    "ownerMode": "SINGLE_OWNER",
    "insuranceType": "Renewal",
    "policyStartDate": "2026-08-16",
    "policyEndDate": "2027-08-15",
    "owner": {},
    "livestockLocation": {},
    "premiumTotals": {},
    "lines": [],
    "veterinarianVerification": {}
  }
}
```

`application` uses the same shape as create-livestock-application.

### 4.3 Motor request body

```json
{
  "originalApplicationId": "ORIGINAL_ID",
  "module": "motor",
  "notes": "optional",
  "application": {
    "insuranceType": "Renewal",
    "insuranceCategory": "…",
    "insuranceDuration": "12 Months",
    "insuranceProvider": "…",
    "policyStartDate": "2026-08-16",
    "policyEndDate": "2027-08-15",
    "insuranceEndAt": "2027-08-15",
    "client": {
      "fullName": "…",
      "phoneNumber": "…",
      "email": "…"
    },
    "vehicle": {
      "plateNumber": "…",
      "chasisNumber": "…"
    },
    "amount": 495000,
    "netPremium": 500000,
    "agentCommission": 45000
  }
}
```

### 4.4 Expected create response

```json
{
  "_id": "newApplicationId",
  "applicationNumber": "…",
  "insuranceType": "Renewal",
  "renewalDiscountAmount": 5000
}
```

---

## 5. RENEWAL PREFILL ENDPOINTS

### 5.1 GET `/getRenewalPreview/{module}/{applicationId}`

Return the original application (or nested `originalApplication`) plus indicative discount values so the form can be prefilled.

Include client name, phone, email, vehicle (motor), lines (livestock), premiums, and policy dates.

### 5.2 GET `/getMotorApplicationById/{applicationId}`

Implement if motor detail is not already available on the preview endpoint.

Frontend fallback: `GET /getApplicationById/{applicationId}`.

Return full motor application: client, vehicle, premiums, `insuranceEndAt`.

Livestock prefills from the existing livestock get-by-id API.

---

## 6. PHASE 3 IMPLEMENTATION CHECKLIST

### Expiring insurance

- [ ] Vets can retrieve their expiring Livestock client applications.
- [ ] Vet access is enforced server-side.
- [ ] Expiring applications can be filtered by date range.
- [ ] Agents can retrieve their expiring Motor applications, scoped to that Agent.
- [ ] Each list row includes **client name**.
- [ ] Each list row includes **phone and/or email** (required for Motor follow-up).
- [ ] Applications can be grouped by Agent/Vet for reminder processing.

### Weekly reminder

- [ ] Weekly scheduled job is implemented.
- [ ] Applications expiring during the relevant week are identified.
- [ ] Expiring applications are grouped by Agent/Vet.
- [ ] Number of expiring clients is calculated.
- [ ] Potential renewal commission uses commission **after** the 1% discount.
- [ ] Renewal deep link / list information is generated.
- [ ] Notification service receives the required data.

### Renewal discount reminder

- [ ] Renewal discount information can be retrieved for expiring policies.
- [ ] Discount amount / rate is available to the notification layer.
- [ ] Discount calculation is consistent with the renewal calculation (`0.01` of net premium).

### Edit-then-create renewal

- [ ] `POST /createRenewalApplication/{module}` accepts a full edited `application` payload.
- [ ] Backend recalculates discount and commissions.
- [ ] `originalApplicationId` is stored.
- [ ] New application is identified as a renewal.
- [ ] Livestock and Motor modules are both supported.
- [ ] Preview / get-by-id returns enough data to prefill the form, including client contact details.

---

## 7. PHASE 3 COMPLETION CRITERIA

Phase 3 is complete when:

- Vets can reliably see their clients’ expiring Livestock insurances, with name and contact details.
- Agents/Admins can see expiring Motor applications with **client name, phone, and email**.
- The backend can identify and group applications that are expiring each week.
- The backend can calculate potential renewal commissions for reminder messages (after 1% discount).
- Renewal discount information can be provided to the notification layer.
- Creating a renewal accepts an edited application payload and persists the renewal relationship and discount fields.

Deferred features are documented in **Phase 4** and must not block Phase 3.
