import type { Condition } from "./types";

type Answers = Record<string, unknown>;

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

/** Pure; safe on client and server. Missing answers never throw. */
export function evaluateCondition(cond: Condition, answers: Answers): boolean {
  if ("all" in cond) return cond.all.every((c) => evaluateCondition(c, answers));
  if ("any" in cond) return cond.any.some((c) => evaluateCondition(c, answers));
  const actual = answers[cond.field];
  switch (cond.op) {
    case "eq":
      return actual === cond.value;
    case "neq":
      return actual !== cond.value;
    case "in":
      return Array.isArray(cond.value) && cond.value.includes(actual);
    case "notIn":
      return !Array.isArray(cond.value) || !cond.value.includes(actual);
    case "exists":
      return !isEmpty(actual);
    case "notExists":
      return isEmpty(actual);
  }
}

export function isFieldVisible(visibleWhen: Condition | null | undefined, answers: Answers): boolean {
  return !visibleWhen || evaluateCondition(visibleWhen, answers);
}
