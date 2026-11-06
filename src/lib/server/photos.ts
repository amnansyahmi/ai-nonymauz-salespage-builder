import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/* Product photos go to the public "photos" bucket in Neon Object Storage, one folder per seller. */
const BUCKET = process.env.NEON_STORAGE_BUCKET || "photos";
let s3: S3Client | null = null;
const client = () =>
  (s3 ??= new S3Client({
    region: process.env.NEON_STORAGE_REGION || "ap-southeast-1",
    endpoint: process.env.NEON_STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: process.env.NEON_STORAGE_KEY_ID || "",
      secretAccessKey: process.env.NEON_STORAGE_SECRET || "",
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
  }));

export const photosConfigured = () =>
  !!(process.env.NEON_STORAGE_ENDPOINT && process.env.NEON_STORAGE_KEY_ID && process.env.NEON_STORAGE_SECRET);

export async function savePhoto(uid: string, body: Uint8Array, type: "image/jpeg" | "image/png" | "image/webp") {
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const key = `${uid}/${crypto.randomUUID()}.${ext}`;
  await client().send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: type, CacheControl: "public, max-age=31536000, immutable" }),
  );
  return `${process.env.NEON_STORAGE_ENDPOINT!.replace(/\/$/, "")}/${BUCKET}/${key}`;
}
