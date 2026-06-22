/**
 * API contract reference — shown in UI for backend implementation.
 */

export const API_CONTRACTS = {
  listApplications: {
    method: 'GET' as const,
    path: '/getVeterinaryApplications?agentId={agentId}&startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}&pageSize={n}&pageNumber={n}',
    response: `{
  "data": [ /* flat application rows */ ],
  "total": 120,
  "pageNumber": 1,
  "pageSize": 25,
  "totalPages": 5
}`,
  },

  listAllApplications: {
    method: 'GET' as const,
    path: '/getAllApplications?startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}&pageSize={n}&pageNumber={n}',
    response: `Same paginated envelope as listApplications — admin / finance / super admin`,
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
    method: 'PUT' as const,
    path: '/uploadProofOfPayment/{id}',
    payload: `multipart/form-data:
  proofOfPayment: File (jpg|jpeg|png|pdf) — required
  transactionId: string — required
  amount: number — required
  fileType: string (MIME, e.g. image/jpeg) — sent by client
  notes: string — optional`,
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
