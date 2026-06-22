/**
 * API contract reference — shown in UI for backend implementation.
 */

export const API_CONTRACTS = {
  listApplications: {
    method: 'GET' as const,
    path: '/getVeterinaryApplications?agentId={agentId}&startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}',
    response: `{
  "data": [
    {
      "_id": "string",
      "applicationNumber": "APP-20260622-136413",
      "speciesGroup": "CATTLE",
      "ownerMode": "SINGLE_OWNER",
      "insuranceType": "New",
      "policyStartDate": "2026-06-22T00:00:00.000Z",
      "policyEndDate": "2027-06-21T00:00:00.000Z",
      "livestockDistrict": "Kayonza",
      "livestockSector": "Ruramira",
      "livestockProvince": "East",
      "premiumRateAmount": 82500,
      "farmerContributionAmount": 49500,
      "governmentContribution": 33000,
      "totalSumAssured": 1500000,
      "status": "SUBMITTED",
      "paidStatus": "PENDING",
      "subsidyStatus": "NOT_REQUIRED",
      "submittedAt": "2026-06-22T15:07:09.593Z",
      "insuranceProvider": "SONARWA",
      "agent": { "_id": "string", "fullName": "string", "phoneNumber": "string" }
    }
  ]
}`,
  },

  listAllApplications: {
    method: 'GET' as const,
    path: '/getAllLivestockApplications?startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}',
    response: `Same flat row shape as listApplications — all packages in date range (admin / finance / super admin)`,
  },

  getApplication: {
    method: 'GET' as const,
    path: 'Reuse cached row from list response (no per-id GET for vet or staff)',
    response: `Same flat row as list response — mapped to LivestockApplicationPackage in the client`,
  },

  createApplication: {
    method: 'POST' as const,
    path: '/newApplication',
    payload: `{
  "speciesGroup": "CATTLE",
  "ownerMode": "SINGLE_OWNER",
  "poultryProductType": "EGG_LAYER",
  "insuranceType": "New",
  "policyStartDate": "2026-04-01",
  "policyEndDate": "2027-03-31",
  "owner": { "name", "phone", "district", "sector", "cell", "village" },
  "livestockLocation": { "district", "sector", "cell", "village", "province" },
  "premiumTotals": {
    "premiumRateAmount": 440000,
    "farmerContributionAmount": 264000,
    "governmentContribution": 176000,
    "companyCommission": 15400,
    "veterinaryCommission": 44000
  },
  "lines": [
    {
      "lineType": "INDIVIDUAL | LOT",
      "quantity": 1,
      "unitValue": 800000,
      "sumAssured": 800000,
      "tekanaEligible": true,
      "owner": { "name", "phone" },
      "animal": {
        "species", "chipNumber", "animalCategory", "animalAge",
        "breed", "color", "productivity", "hatcherySource", "poultryProductType"
      }
    }
  ]
}`,
    response: `{ "_id": "string", "applicationNumber": "APP-20260622-136413", "status": "SUBMITTED", "submittedAt": "2026-06-22T15:07:09.593Z" }`,
  },

  uploadPaymentProof: {
    method: 'POST' as const,
    path: '/livestock/applications/{id}/payment-proof',
    payload: `multipart/form-data:
  proofOfPayment: File (jpg|jpeg|png|pdf)
  transactionId: string
  amount: number (optional — server validates farmer share 60%)`,
    response: `{ "status": "SUBMITTED", "expectedAmount": 264000, "documentUrl": "https://...", "transactionId": "..." }`,
  },

  generateSubsidyDoc: {
    method: 'POST' as const,
    path: '/livestock/applications/{id}/subsidy/generate-document',
    response: `{ "documentUrl": "https://...", "templateVersion": "nkunganire-v1" }`,
  },

  uploadSignedSubsidy: {
    method: 'POST' as const,
    path: '/livestock/applications/{id}/subsidy/upload-signed',
    payload: `multipart/form-data:
  signedDocument: File (jpg|jpeg|png|pdf)
  signedBy: "SECTOR" | "VET" | "SONARWA"
  notes?: string`,
    response: `{ "subsidyCase": { "status": "SECTOR_SIGNED", "uploadedSignedDocumentUrl": "https://..." } }`,
  },

  digitalSign: {
    method: 'POST' as const,
    path: '/livestock/applications/{id}/subsidy/sign (COMING SOON)',
    payload: `{ "role": "SECTOR | VET | SONARWA", "signatureId": "stored-signature-ref" }`,
  },
} as const;

export type ApiContractKey = keyof typeof API_CONTRACTS;
