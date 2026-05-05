// domainManager.js — désactivé (pas de domaine personnalisé)

export async function assignSubdomain() {
  return { success: true };
}

export async function initiateCustomDomainVerification() {
  return { success: true };
}

export async function verifyCustomDomain() {
  return { verified: false };
}

export async function checkPendingDomainVerifications() {
  return;
}