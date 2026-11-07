import { describe, it, expect } from "vitest";
import bcrypt from "bcrypt";
import { generateTokens, verifyToken } from "../src/utils/tokens.js";

describe("Auth and Security Unit Tests", () => {
  // 1. Тест генерації пари токенів
  it("should generate a valid pair of access and refresh tokens", () => {
    const mockUser = { id: 1, username: "ivan_petrenko" };
    const tokens = generateTokens(mockUser);

    expect(tokens).toBeDefined();
    expect(tokens).toHaveProperty("accessToken");
    expect(tokens).toHaveProperty("refreshToken");
    expect(typeof tokens.accessToken).toBe("string");
    expect(typeof tokens.refreshToken).toBe("string");
    expect(tokens.accessToken.length).toBeGreaterThan(0);
    expect(tokens.refreshToken.length).toBeGreaterThan(0);
  });

  // 2. Тест верифікації та структури payload токена
  it("should successfully decode and verify access token payload", () => {
    const mockUser = { id: 42, username: "ivan_user" };
    const { accessToken } = generateTokens(mockUser);

    const payload = verifyToken(accessToken, "access");

    expect(payload).toBeDefined();
    expect(payload.sub).toBe("42");
    expect(payload.username).toBe("ivan_user");
    expect(payload.type).toBe("access");
  });

  // 3. Тест хешування паролів через bcrypt
  it("should securely hash a password and confirm equality with bcrypt.compare", async () => {
    const rawPassword = "securePassword123";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const isMatch = await bcrypt.compare(rawPassword, hashedPassword);
    const isWrongMatch = await bcrypt.compare("wrongPassword", hashedPassword);

    expect(typeof hashedPassword).toBe("string");
    expect(hashedPassword).not.toBe(rawPassword);
    expect(isMatch).toBe(true);
    expect(isWrongMatch).toBe(false);
  });
});