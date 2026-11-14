import { describe, expect, test } from "bun:test";
import { bearerToken, generateToken, hashToken } from "./api-token";

const headers = (authorization?: string) =>
  new Headers(authorization ? { authorization } : undefined);

describe("token pessoal", () => {
  test("gera tokens únicos com prefixo mr_", () => {
    const a = generateToken();
    expect(a.startsWith("mr_")).toBe(true);
    expect(a.length).toBeGreaterThanOrEqual(46);
    expect(a).not.toBe(generateToken());
  });

  test("hash é sha256 hex estável e diferente do token", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });

  test("bearerToken só aceita Bearer mr_...", () => {
    expect(bearerToken(headers("Bearer mr_abc"))).toBe("mr_abc");
    expect(bearerToken(headers("bearer mr_abc"))).toBe("mr_abc");
    expect(bearerToken(headers("Bearer outro"))).toBeNull();
    expect(bearerToken(headers("Basic mr_abc"))).toBeNull();
    expect(bearerToken(headers())).toBeNull();
  });
});
