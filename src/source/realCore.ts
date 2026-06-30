import type { Decision } from "./types.js";
import type { RunEvent, Approval } from "../model/types.js";

export const DISPOSE_SENTINEL = Symbol("dispose");

export const isDisposeSentinel = (e: unknown): boolean => e === DISPOSE_SENTINEL;

export type WaitersHandle = {
  waitDecision: (id: string) => Promise<Decision>;
  decide: (id: string, d: Decision) => void;
  disposeWaiters: () => void;
};

export const createWaiters = (): WaitersHandle => {
  const map = new Map<string, { resolve: (d: Decision) => void; reject: (e: unknown) => void }>();
  let disposed = false;

  return {
    waitDecision: (id) =>
      new Promise<Decision>((resolve, reject) => {
        if (disposed) {
          reject(DISPOSE_SENTINEL);
          return;
        }
        map.set(id, { resolve, reject });
      }),
    decide: (id, d) => {
      const w = map.get(id);
      if (w) {
        map.delete(id);
        w.resolve(d);
      }
    },
    disposeWaiters: () => {
      disposed = true;
      for (const [, w] of map) w.reject(DISPOSE_SENTINEL);
      map.clear();
    },
  };
};

export const runGated = async (
  approval: Approval,
  emit: (e: RunEvent) => void,
  waitDecision: (id: string) => Promise<Decision>,
): Promise<Decision> => {
  emit({ type: "approvalRequested", approval });
  const decision = await waitDecision(approval.id);
  emit({
    type: "approvalResolved",
    approvalId: approval.id,
    status: decision.action === "deny" ? "denied" : "approved",
  });
  return decision;
};

export const runBatch = async (
  approvals: Approval[],
  emit: (e: RunEvent) => void,
  waitDecision: (id: string) => Promise<Decision>,
): Promise<Decision[]> => {
  for (const ap of approvals) {
    emit({ type: "approvalRequested", approval: ap });
  }
  return Promise.all(
    approvals.map(async (ap) => {
      const decision = await waitDecision(ap.id);
      emit({
        type: "approvalResolved",
        approvalId: ap.id,
        status: decision.action === "deny" ? "denied" : "approved",
      });
      return decision;
    }),
  );
};
