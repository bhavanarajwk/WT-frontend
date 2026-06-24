import { S3Client } from "@aws-sdk/client-s3";

function normalizeObjectStorageEndpoint(raw: string): string {
  const value = raw.trim();
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value.replace(/\/$/, "");
  }
  return `https://${value.replace(/\/$/, "")}`;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to .env.local (see .env.example).`
    );
  }
  return value;
}

/** e.g. `cluster.in-maa-1.linodeobjects.com` → `in-maa-1` */
function inferRegionFromEndpoint(endpoint: string): string | null {
  try {
    const hostname = new URL(endpoint).hostname;
    const parts = hostname.split(".");
    const linodeIndex = parts.indexOf("linodeobjects");
    if (linodeIndex < 1) return null;
    return parts[linodeIndex - 1]?.trim() || null;
  } catch {
    return null;
  }
}

function resolveObjectStorageRegion(): string {
  const configured = process.env.LINODE_OBJECT_STORAGE_REGION?.trim();
  if (configured) return configured;

  const endpoint = process.env.LINODE_OBJECT_STORAGE_ENDPOINT?.trim();
  if (endpoint) {
    const inferred = inferRegionFromEndpoint(normalizeObjectStorageEndpoint(endpoint));
    if (inferred) return inferred;
  }

  throw new Error(
    "Missing LINODE_OBJECT_STORAGE_REGION. Set it explicitly or use an endpoint like https://in-maa-1.linodeobjects.com."
  );
}

function resolveObjectStorageEndpoint(region: string): string {
  // Regional endpoint + path-style URLs is required for reliable Linode S3 keys.
  // Cluster hostnames (e.g. cluster.in-maa-1.linodeobjects.com) prefix keys with the bucket name.
  return `https://${region}.linodeobjects.com`;
}

export function getLinodeObjectStorageConfig() {
  const region = resolveObjectStorageRegion();
  const endpoint = resolveObjectStorageEndpoint(region);

  return {
    endpoint,
    region,
    bucket: readRequiredEnv("LINODE_OBJECT_STORAGE_BUCKET"),
    accessKeyId: readRequiredEnv("LINODE_OBJECT_STORAGE_ACCESS_KEY"),
    secretAccessKey: readRequiredEnv("LINODE_OBJECT_STORAGE_SECRET_KEY"),
  };
}

let cachedClient: S3Client | null = null;

export function getLinodeS3Client(): S3Client {
  if (cachedClient) return cachedClient;

  const config = getLinodeObjectStorageConfig();
  cachedClient = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return cachedClient;
}

export function resetLinodeS3ClientForTests(): void {
  cachedClient = null;
}
