export function objectKeyCandidates(objectKey: string, bucket: string): string[] {
  const normalizedKey = objectKey.replace(/^\/+/, "");
  const legacyKey = `${bucket}/${normalizedKey}`;

  if (normalizedKey === legacyKey) {
    return [normalizedKey];
  }

  return [normalizedKey, legacyKey];
}
