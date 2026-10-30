import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  GeneratePlaybackTokenParams,
  PlaybackSignerPort,
  PlaybackTokenClaims,
} from "../ports/playback-signer.port.js";

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8").toString("base64url");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf8");
}

export class JwtPlaybackSignerAdapter implements PlaybackSignerPort {
  private readonly secret: string;
  private readonly issuer: string;
  private readonly defaultTtlSeconds: number;

  constructor(options: {
    secret: string;
    issuer?: string;
    defaultTtlSeconds?: number;
  }) {
    if (!options.secret || options.secret.trim().length < 16) {
      throw new Error("Playback signing secret must be at least 16 characters long.");
    }
    this.secret = options.secret;
    this.issuer = options.issuer ?? "giftedpro-playback";
    this.defaultTtlSeconds = options.defaultTtlSeconds ?? 900; // 15 minutes default TTL
  }

  async generatePlaybackToken(params: GeneratePlaybackTokenParams): Promise<string> {
    const nowSec = Math.floor(Date.now() / 1000);
    const ttl = params.ttlSeconds ?? this.defaultTtlSeconds;

    const header = {
      alg: "HS256",
      typ: "JWT",
    };

    const payload: PlaybackTokenClaims = {
      sub: params.customerId,
      contentId: params.contentId,
      editionId: params.editionId,
      djId: params.djId,
      iat: nowSec,
      exp: nowSec + ttl,
      iss: this.issuer,
      jti: randomUUID(),
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const signature = createHmac("sha256", this.secret)
      .update(signatureInput)
      .digest("base64url");

    return `${signatureInput}.${signature}`;
  }

  async verifyPlaybackToken(token: string): Promise<PlaybackTokenClaims | null> {
    if (!token || typeof token !== "string") {
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, candidateSignature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = createHmac("sha256", this.secret)
      .update(signatureInput)
      .digest("base64url");

    const expectedBuf = Buffer.from(expectedSignature, "utf8");
    const candidateBuf = Buffer.from(candidateSignature, "utf8");

    if (expectedBuf.length !== candidateBuf.length) {
      return null;
    }

    if (!timingSafeEqual(expectedBuf, candidateBuf)) {
      return null;
    }

    try {
      const payload = JSON.parse(base64UrlDecode(encodedPayload)) as PlaybackTokenClaims;
      const nowSec = Math.floor(Date.now() / 1000);

      // Check expiry
      if (!payload.exp || nowSec > payload.exp) {
        return null;
      }

      // Check issuer
      if (payload.iss !== this.issuer) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}
