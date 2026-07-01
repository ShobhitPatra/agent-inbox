export const PALETTE = ["cyan", "green", "magenta", "yellow"] as const;

export const agentColor = (agentId: string): (typeof PALETTE)[number] => {
  let h = 0;
  for (const c of agentId) h = (h + c.charCodeAt(0)) % PALETTE.length;
  return PALETTE[h]!;
};

export const stepLabel = (step?: { index: number; total?: number }): string =>
  step ? `step ${step.index}/${step.total ?? "?"}` : "";
