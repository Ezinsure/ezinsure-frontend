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
      "applicationNumber": "LS-2026-00041",
      "insuranceProvider": "SONARWA | RADIANT",
      "speciesGroup": "CATTLE | POULTRY | PIG",
      "ownerMode": "SINGLE_OWNER | MULTI_OWNER",
      "status": "PAYMENT_PROOF_REQUIRED",
      "ownerSummary": "BITWAYIKI Pierre",
      "lineCount": 10,
      "totals": {
        "farmerContributionAmount": 264000,
        "premiumRateAmount": 440000
      },
      "submittedAt": "ISO8601",
      "paymentProofStatus": "PENDING | SUBMITTED | VERIFIED",
      "subsidyRequired": true
    }
  ],
  "meta": { "total": 4, "startDate": "2026-03-01", "endDate": "2026-03-31" }
}`,
  },

  getApplication: {
    method: 'GET' as const,
    path: '/getVeterinaryApplication/{applicationId} (fallback: scan GET /getVeterinaryApplications)',
    response: `See LivestockApplicationPackage in domain/application-types.ts`,
  },

  createApplication: {
    method: 'POST' as const,
    path: '/newApplication',
    payload: `{
  "speciesGroup": "CATTLE",
  "ownerMode": "SINGLE_OWNER",
  "poultryProductType": "EGG_LAYER",
  "policyStartDate": "2026-04-01",
  "policyEndDate": "2027-03-31",
  "owner": { "name", "phone", "district", "sector", "cell", "village" },
  "livestockLocation": { "district", "sector", "cell", "village" },
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
      "owner": { "name", "phone" },
      "animal": { "species", "chipNumber", "hatcherySource" },
      "tekanaEligible": false
    }
  ]
}`,
    response: `{ "_id": "string", "applicationNumber": "LS-2026-00042", "status": "SUBMITTED" }`,
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
