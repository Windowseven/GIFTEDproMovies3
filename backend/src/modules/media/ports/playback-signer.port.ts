export interface PlaybackTokenClaims {
  sub: string; // customerId
  contentId: string;
  editionId?: string;
  djId?: string;
  exp: number; // Unix timestamp in seconds
  iat: number;
  iss: string;
  jti: string; // Cryptographic nonce
}

export interface GeneratePlaybackTokenParams {
  customerId: string;
  contentId: string;
  editionId?: string;
  djId?: string;
  ttlSeconds?: number;
}

export interface PlaybackSignerPort {
  generatePlaybackToken(params: GeneratePlaybackTokenParams): Promise<string>;
  verifyPlaybackToken(token: string): Promise<PlaybackTokenClaims | null>;
}
