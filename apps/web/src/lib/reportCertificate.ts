export type Certificate = {
  id: string;
  hash: string;
  issuedAt: string;
  expiresAt: string;
};

export async function generateCertificate(payload: object): Promise<Certificate> {
  const content = JSON.stringify(payload);
  const encoded = new TextEncoder().encode(content);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  const hash = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const id = `AITC-${issuedAt.getTime().toString(36).toUpperCase()}-${hash.slice(0, 8).toUpperCase()}`;

  return {
    id,
    hash,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}
