export const COMPANY_COMMISSION_DEFAULTS_ENDPOINTS = {
  /**
   * Org defaults: livestock company %, livestock veterinary %, motor company %.
   * GET — any authenticated admin/creator that needs rates to prefill.
   * PUT — SUPER_ADMIN only.
   */
  root: (): string => `/configurations/companyCommissionDefaults`,
} as const;
