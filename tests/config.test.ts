import { describe, it, expect } from "vitest";
import { resolveConfig } from "../src/source/config.js";

describe("resolveConfig", () => {
  it("throws naming exactly which vars are missing when all are absent", () => {
    expect(() => resolveConfig({})).toThrowError(/AGENT_INBOX_BASE_URL/);
    expect(() => resolveConfig({})).toThrowError(/AGENT_INBOX_API_KEY/);
    expect(() => resolveConfig({})).toThrowError(/AGENT_INBOX_MODEL/);
  });

  it("throws naming only the missing var when two of three are present", () => {
    const env = {
      AGENT_INBOX_BASE_URL: "https://api.openai.com/v1",
      AGENT_INBOX_API_KEY: "sk-test",
    };
    const err = (() => {
      try {
        resolveConfig(env);
        return null;
      } catch (e) {
        return e as Error;
      }
    })();
    expect(err).not.toBeNull();
    const missingLine = err!.message.split("\n")[0]!;
    expect(missingLine).toContain("AGENT_INBOX_MODEL");
    expect(missingLine).not.toContain("AGENT_INBOX_BASE_URL");
    expect(missingLine).not.toContain("AGENT_INBOX_API_KEY");
  });

  it("returns config object when all three vars are set", () => {
    const env = {
      AGENT_INBOX_BASE_URL: "https://api.openai.com/v1",
      AGENT_INBOX_API_KEY: "sk-test-key",
      AGENT_INBOX_MODEL: "gpt-4o",
    };
    const cfg = resolveConfig(env);
    expect(cfg.baseURL).toBe("https://api.openai.com/v1");
    expect(cfg.apiKey).toBe("sk-test-key");
    expect(cfg.model).toBe("gpt-4o");
  });

  it("error message includes a one-line launch example", () => {
    let msg = "";
    try {
      resolveConfig({});
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/AGENT_INBOX_REAL/);
    expect(msg).toMatch(/node dist\/index\.js/);
  });
});
