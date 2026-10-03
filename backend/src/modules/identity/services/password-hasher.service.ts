import { Injectable, BadRequestException } from "@nestjs/common";
import argon2, { type HashOptions } from "argon2";

@Injectable()
export class PasswordHasherService {
  private readonly argonOptions: HashOptions & { raw?: false } = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  };

  /**
   * Hashes a password using Argon2id with strict parameters.
   * Fails fast if password does not meet minimum complexity.
   */
  async hashPassword(password: string): Promise<string> {
    if (!password || typeof password !== "string" || password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters long");
    }
    return await argon2.hash(password, this.argonOptions);
  }

  /**
   * Verifies a plain password against an Argon2id hash.
   */
  async verifyPassword(hash: string, candidate: string): Promise<boolean> {
    if (!hash || !candidate) {
      return false;
    }
    try {
      return await argon2.verify(hash, candidate);
    } catch {
      return false;
    }
  }
}
