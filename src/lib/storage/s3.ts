import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { StorageDriver } from "./index";
import { isSafeKey } from "./index";

/** S3-compatible object storage (AWS S3, Cloudflare R2, Backblaze B2, MinIO). */
export class S3Storage implements StorageDriver {
  readonly name = "s3";
  private bucket = process.env.S3_BUCKET ?? "";
  private publicUrl = (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
  private client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: process.env.S3_ACCESS_KEY_ID
      ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" }
      : undefined,
  });

  constructor() {
    if (!this.bucket || !this.publicUrl) {
      throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET and S3_PUBLIC_URL to be set.");
    }
  }

  async put(key: string, body: Buffer, contentType: string) {
    if (!isSafeKey(key)) throw new Error("Invalid storage key");
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async get(key: string) {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? { body: Buffer.from(bytes), contentType: res.ContentType } : null;
    } catch {
      return null;
    }
  }

  urlFor(key: string) {
    return `${this.publicUrl}/${key}`;
  }
}
