export interface GoogleTokenExchangeResult {
  readonly idToken: string;
  readonly accessToken: string;
}

export interface GoogleIdTokenClaims {
  readonly iss: string;
  readonly aud: string;
  readonly sub: string;
  readonly email: string;
  readonly email_verified: boolean;
  readonly nonce?: string;
  readonly exp: number;
}

export interface GoogleOAuthClient {
  exchangeCode(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<GoogleTokenExchangeResult>;

  verifyIdToken(
    idToken: string,
    expectedAudience: string,
    expectedNonce?: string,
  ): Promise<GoogleIdTokenClaims>;
}

export const GOOGLE_OAUTH_CLIENT = Symbol("GOOGLE_OAUTH_CLIENT");
