import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  MediaStoragePort,
  PresignedUploadResult,
} from "../ports/media-storage.port.js";

export interface R2MediaStorageAdapterOptions {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint?: string;
  s3Client?: S3Client;
}

export class R2MediaStorageAdapter implements MediaStoragePort {
  readonly providerName = "r2";
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly endpoint: string;

  constructor(options: R2MediaStorageAdapterOptions) {
    if (!options.bucketName?.trim()) {
      throw new Error("R2MediaStorageAdapter: bucketName is required.");
    }

    this.bucketName = options.bucketName.trim();
    this.endpoint =
      options.endpoint?.trim() ||
      `https://${options.accountId.trim()}.r2.cloudflarestorage.com`;

    if (options.s3Client) {
      this.client = options.s3Client;
    } else {
      if (!options.accountId?.trim() || !options.accessKeyId?.trim() || !options.secretAccessKey?.trim()) {
        throw new Error("R2MediaStorageAdapter: accountId, accessKeyId, and secretAccessKey are required.");
      }

      this.client = new S3Client({
        region: "auto",
        endpoint: this.endpoint,
        credentials: {
          accessKeyId: options.accessKeyId.trim(),
          secretAccessKey: options.secretAccessKey.trim(),
        },
      });
    }
  }

  private sanitizeKey(rawKey: string): string {
    const trimmed = rawKey.trim();
    if (!trimmed || trimmed.includes("..")) {
      throw new Error(`Invalid storage key: ${rawKey}`);
    }
    return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  }

  async generatePresignedUploadUrl(params: {
    storageKey: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<PresignedUploadResult> {
    const key = this.sanitizeKey(params.storageKey);
    const expiresIn = params.expiresInSeconds ?? 3600;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: params.contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn,
    });

    return {
      uploadUrl,
      storageKey: key,
      expiresInSeconds: expiresIn,
      headers: {
        "content-type": params.contentType,
      },
    };
  }

  async verifyObjectExists(storageKey: string): Promise<boolean> {
    const key = this.sanitizeKey(storageKey);
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch (err: unknown) {
      const error = err as { name?: string; $metadata?: { httpStatusCode?: number }; code?: string };
      if (
        error.name === "NotFound" ||
        error.$metadata?.httpStatusCode === 404 ||
        error.code === "NotFound"
      ) {
        return false;
      }
      throw err;
    }
  }

  async deleteObject(storageKey: string): Promise<void> {
    const key = this.sanitizeKey(storageKey);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  getPlaybackUrl(storageKey: string): string {
    const key = this.sanitizeKey(storageKey);
    return `${this.endpoint}/${this.bucketName}/${key}`;
  }

  async generatePresignedDownloadUrl(params: {
    storageKey: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    const key = this.sanitizeKey(params.storageKey);
    const expiresIn = params.expiresInSeconds ?? 900;

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.client, command, {
      expiresIn,
    });
  }
}
