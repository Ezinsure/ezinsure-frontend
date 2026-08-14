# PHASE 4 — DEFERRED FEATURES

EZINSURE BACKEND IMPLEMENTATION REQUIREMENTS

This phase covers work that was explicitly deferred until after core Motor/Livestock, Finance Portal, expiry follow-up, and renewal operations (Phase 3) are complete.

**Do not start Phase 4 until Phase 3 is complete**, unless a specific item is unblocked independently (for example Thierry’s location file).

Moved here from the previous Phase 3 document (items after 3.3):

- Vet digital signature of Nkunganire (OTP + location)
- Sector Vet subsidy-file signing
- Livestock application email notifications
- Client email message review
- Province-to-village location data

---

## 1. VET DIGITAL SIGNATURE — NKUNGANIRE FILE

### 1.1 Requirement

Allow the Vet to digitally sign the Nkunganire file.

The digital signature must:

- Use OTP authentication to authenticate the Vet.
- Capture the user’s location at the time of signing.
- Record the digital-signature event against the relevant application / Nkunganire file.

This must not block Livestock or renewal work.

### 1.2 OTP generation

The backend must generate an OTP associated with:

- The authenticated Vet
- The relevant application
- The signing action

Do not trust a Vet ID supplied by the frontend. Use the authorization token.

### 1.3 OTP delivery

Send the OTP to the Vet’s registered contact using the existing Ezinsure OTP infrastructure.

### 1.4 OTP verification

Reject the signature if:

- The OTP is incorrect
- The OTP has expired
- The OTP has already been used
- The OTP does not belong to the authenticated Vet / application / signing request

### 1.5 Suggested endpoints

Names may follow existing Ezinsure conventions. Equivalent functionality:

```
POST /livestock/applications/{applicationId}/nkunganire/sign/request-otp
POST /livestock/applications/{applicationId}/nkunganire/sign/verify
```

OTP request:

```json
{
  "applicationId": "APPLICATION_ID"
}
```

Verify request:

```json
{
  "otp": "123456",
  "latitude": -1.9441,
  "longitude": 30.0619
}
```

### 1.6 Location capture

Persist at least `latitude` and `longitude` on the signing record, captured when the Vet signs.

### 1.7 Audit record

```json
{
  "applicationId": "APPLICATION_ID",
  "signedBy": "USER_ID",
  "signedAt": "2026-08-07T10:30:00.000Z",
  "location": {
    "latitude": -1.9441,
    "longitude": 30.0619
  },
  "status": "SIGNED"
}
```

Associate the record with the application, Nkunganire file, Vet, timestamp, location, and signature status.

---

## 2. SECTOR VET — SUBSIDY FILE SIGNING

### 2.1 Requirement

Allow the private Vet to enter the Sector Vet’s contact details, submit the subsidy file for signing, and receive the signed file back.

Delivery channels: email and phone.

### 2.2 Contact information

Example:

```json
{
  "sectorVetName": "Sector Vet Name",
  "phoneNumber": "2507XXXXXXXX",
  "email": "sectorvet@example.com"
}
```

Validate and store using the existing user/contact structure.

### 2.3 Backend flow

1. Private Vet enters Sector Vet contact information.
2. Private Vet submits the subsidy-file request.
3. Backend generates/identifies the required subsidy file.
4. Backend sends the file or a secure access link to the Sector Vet.
5. Sector Vet signs the file.
6. Sector Vet returns the signed file.
7. Backend associates the signed file with the application.
8. Private Vet can access the signed file.

### 2.4 Signing request status

Example statuses (align with existing conventions): `PENDING`, `SENT`, `SIGNED`, `RETURNED`.

### 2.5 Notification and reply instructions

The Sector Vet notification must explain how to return the signed file.

Reply contact details must be those of the **private Vet who requested the file**:

```
Requested by: Private Vet Name
Phone: 2507XXXXXXXX
Email: vet@example.com
```

### 2.6 Returned signed file

Record:

- Application ID
- Original subsidy file
- Signed subsidy file
- Sector Vet / contact information
- Submission / request date
- Returned date
- Current signing status

---

## 3. LIVESTOCK APPLICATION EMAILS

### 3.1 Requirement

Add email notifications to all relevant Livestock application workflow events.

Implement **after** the Finance Portal workflow is complete.

### 3.2 Trigger principle

Emails must be triggered by backend business events (status/action changes), not by a separate frontend “send email” call.

Example:

```
Application submitted
        ↓
Backend status changes
        ↓
Email notification triggered
```

The exact event list should be agreed with frontend/Finance once the final payment/commission workflow is stable.

---

## 4. CLIENT EMAIL MESSAGE REVIEW

### 4.1 Requirement

Review email messages sent to clients, especially the email after a client purchases insurance.

The message should thank the client after purchasing a policy.

### 4.2 Backend consideration

Identify the successful purchase / issued-insurance event and trigger the client email from that status.

Wording can be updated separately. Continue providing application/client data to the email template.

---

## 5. PROVINCE-TO-VILLAGE LOCATION DATA

### 5.1 Requirement

Thierry will provide a complete interconnected file:

Province → District → Sector → Cell → Village

This will update location fields throughout the system.

### 5.2 Backend work (once the file is received)

- Review the complete location hierarchy.
- Import / update location data.
- Keep parent/child relationships correct.
- Update location validation.
- Update application and user location fields.
- Prevent invalid combinations (a Village must belong to the selected Cell, and so on).

### 5.3 Dependency

This task cannot be finalized until Thierry provides the file.

Status: **DEFERRED — WAITING FOR THIERRY’S FILE.**

---

## 6. PHASE 4 IMPLEMENTATION CHECKLIST

### Digital signature

- [ ] OTP can be requested for Nkunganire signing.
- [ ] OTP is associated with the correct Vet and application.
- [ ] OTP is delivered through the existing OTP mechanism.
- [ ] OTP expiration is enforced.
- [ ] OTP cannot be reused.
- [ ] Incorrect OTP is rejected.
- [ ] Only the authenticated Vet can complete the signing process.
- [ ] Vet location is captured.
- [ ] Digital signature is stored against the correct application / Nkunganire file.
- [ ] Signing timestamp is stored.
- [ ] Digital-signature audit information is stored.

### Sector Vet subsidy signing

- [ ] Private Vet can enter Sector Vet contact information.
- [ ] Contact information is validated.
- [ ] Private Vet can submit the subsidy file for signing.
- [ ] Subsidy file / signing request is associated with the correct application.
- [ ] Sector Vet receives the subsidy file through email/phone.
- [ ] Notification contains instructions for returning the signed file.
- [ ] Private Vet contact information is included for the reply.
- [ ] Signed subsidy file can be received.
- [ ] Returned signed file is associated with the correct application.
- [ ] Subsidy-signing status is stored and updated.

### Livestock emails

- [ ] Livestock application email functionality is implemented.
- [ ] Relevant application events trigger the appropriate emails.
- [ ] Email triggers are connected to backend business events.
- [ ] Implementation is completed after the Finance Portal is ready.

### Client emails

- [ ] Client email messages are reviewed.
- [ ] Insurance-purchase thank-you email is reviewed.
- [ ] Successful insurance purchase triggers the appropriate client email.

### Location data

- [ ] Thierry’s province-to-village file is received.
- [ ] Province, district, sector, cell, and village data are updated.
- [ ] Location relationships are correctly maintained.
- [ ] Location validation is updated.
- [ ] Relevant application/user location fields are updated.

---

## 7. PHASE 4 COMPLETION CRITERIA

Phase 4 is complete when:

- Vet digital signing of Nkunganire files works using OTP authentication.
- The digital-signature event records the Vet’s identity, timestamp, and location.
- Sector Vets can receive subsidy files and return signed files.
- Signed subsidy files are associated with the relevant applications.
- Livestock application email notifications are implemented after the Finance Portal dependency is complete.
- Client insurance-purchase emails have been reviewed and updated where required.
- The complete province-to-village location hierarchy has been imported and correctly connected.

END OF PHASE 4
