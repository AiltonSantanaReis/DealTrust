import { describe, expect, it } from "vitest";
import { PasswordService } from "./password.service.js";

describe("PasswordService", () => {
  it("hashes passwords with Argon2id and verifies only the original password", async () => {
    const service = new PasswordService();
    const password = "correct-horse-battery-123";

    const hash = await service.hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith("$argon2id$")).toBe(true);
    await expect(service.verifyPassword(hash, password)).resolves.toBe(true);
    await expect(service.verifyPassword(hash, "wrong-password-123")).resolves.toBe(false);
  });
});
