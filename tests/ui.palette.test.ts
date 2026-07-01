import { describe, it, expect } from "vitest";
import { PALETTE, agentColor, stepLabel } from "../src/ui/palette.js";

describe("agentColor", () => {
  it("returns a value from PALETTE", () => {
    expect(PALETTE).toContain(agentColor("agent-1"));
  });

  it("is deterministic for the same id", () => {
    expect(agentColor("abc")).toBe(agentColor("abc"));
  });

  it("can return different colors for different ids", () => {
    const colors = new Set(["agent-a", "agent-b", "agent-c", "agent-d"].map(agentColor));
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe("stepLabel", () => {
  it("returns empty string when step is undefined", () => {
    expect(stepLabel(undefined)).toBe("");
  });

  it("formats step with known total", () => {
    expect(stepLabel({ index: 3, total: 10 })).toBe("step 3/10");
  });

  it("uses ? when total is undefined", () => {
    expect(stepLabel({ index: 3 })).toBe("step 3/?");
  });
});
