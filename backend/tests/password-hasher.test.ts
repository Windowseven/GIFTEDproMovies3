import assert from "node:assert/strict";
import test from "node:test";
import { PasswordHasherService } from "../src/modules/identity/services/password-hasher.service.js";

test("PasswordHasherService hashes passwords with strict Argon2id parameters", async () => {
  const service = new PasswordHasherService();
  const password = "SuperSecretPassword123!";
  const hash = await service.hashPassword(password);

  assert.ok(typeof hash === "string");
  assert.ok(hash.startsWith("$argon2id$"));
  assert.ok(hash.includes("m=65536"));
  assert.ok(hash.includes("p=4"));
  assert.ok(hash.includes("t=3"));
});

test("PasswordHasherService rejects passwords shorter than 8 characters", async () => {
  const service = new PasswordHasherService();
  await assert.rejects(
    async () => await service.hashPassword("short"),
    (err: unknown) => err instanceof Error && err.message.includes("at least 8 characters"),
  );
});

test("PasswordHasherService verifies valid password against hash", async () => {
  const service = new PasswordHasherService();
  const password = "CorrectHorseBatteryStaple123!";
  const hash = await service.hashPassword(password);

  const isValid = await service.verifyPassword(hash, password);
  assert.equal(isValid, true);
});

test("PasswordHasherService rejects incorrect password against hash", async () => {
  const service = new PasswordHasherService();
  const password = "CorrectHorseBatteryStaple123!";
  const hash = await service.hashPassword(password);

  const isValid = await service.verifyPassword(hash, "WrongPassword123!");
  assert.equal(isValid, false);
});

test("PasswordHasherService handles empty, null or malformed hashes safely without throwing", async () => {
  const service = new PasswordHasherService();
  assert.equal(await service.verifyPassword("", "password"), false);
  assert.equal(await service.verifyPassword("invalid-hash", "password"), false);
});
