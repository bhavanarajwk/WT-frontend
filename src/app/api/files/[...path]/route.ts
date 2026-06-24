import {
  GetObjectCommand,
  PutObjectCommand,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getLinodeObjectStorageConfig, getLinodeS3Client } from "@/lib/linodeObjectStorage";
import { objectKeyCandidates } from "@/lib/objectStorageKeys";
import { requireSession } from "@/lib/requireSession";
import { formatS3Error, isMissingObjectError } from "@/lib/s3Errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path: string[] }> };

function objectKeyFromPath(path: string[]): string {
  return path.map((segment) => decodeURIComponent(segment)).join("/");
}

function basenameFromKey(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

async function getStoredObject(
  bucket: string,
  objectKey: string
): Promise<GetObjectCommandOutput> {
  const client = getLinodeS3Client();
  const candidates = objectKeyCandidates(objectKey, bucket);
  let lastError: unknown;

  for (const candidateKey of candidates) {
    try {
      return await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: candidateKey,
        })
      );
    } catch (error) {
      lastError = error;
      if (isMissingObjectError(error)) continue;
      throw error;
    }
  }

  throw lastError ?? new Error("File not found.");
}

export async function GET(request: NextRequest, context: RouteContext) {
  const unauthorized = requireSession(request);
  if (unauthorized) return unauthorized;

  const { path } = await context.params;
  const key = objectKeyFromPath(path);

  try {
    const { bucket } = getLinodeObjectStorageConfig();
    const response = await getStoredObject(bucket, key);

    if (!response.Body) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const bytes = await response.Body.transformToByteArray();
    const originalFilename =
      response.Metadata?.["original-filename"]?.trim() || basenameFromKey(key);

    const headers = new Headers({
      "Content-Type": response.ContentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${originalFilename}"`,
      "X-Original-Filename": originalFilename,
    });

    if (response.LastModified) {
      headers.set("X-Uploaded-At", response.LastModified.toISOString());
    }

    return new NextResponse(Buffer.from(bytes), { headers });
  } catch (error) {
    if (isMissingObjectError(error)) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    return NextResponse.json({ error: formatS3Error(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const unauthorized = requireSession(request);
  if (unauthorized) return unauthorized;

  const { path } = await context.params;
  const key = objectKeyFromPath(path);

  try {
    const body = await request.arrayBuffer();
    if (!body.byteLength) {
      return NextResponse.json({ error: "File body is required." }, { status: 400 });
    }

    const contentType =
      request.headers.get("content-type")?.trim() || "application/octet-stream";
    const originalFilename =
      request.headers.get("x-original-filename")?.trim() || basenameFromKey(key);

    const { bucket } = getLinodeObjectStorageConfig();
    await getLinodeS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: new Uint8Array(body),
        ContentType: contentType,
        Metadata: {
          "original-filename": originalFilename,
        },
      })
    );

    return NextResponse.json({
      data: {
        key,
        fileName: originalFilename,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: formatS3Error(error) }, { status: 500 });
  }
}
