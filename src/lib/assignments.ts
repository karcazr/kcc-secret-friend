import { randomInt } from "node:crypto";

export type Assignment = { sender_id: string; recipient_id: string };

/** O(n) time / memory. A previous round is a partial one-to-one relation.
 * Start with Fisher–Yates; repair each forbidden edge by relocating its recipient.
 * After removing b from a→b, at most two remaining insertion edges are forbidden:
 * a→… and …→previous[b]. For n>=4, one of the first three edges always works.
 * Every repair removes at least one repeat and creates none; no retry loop.
 */
export function generateAssignments(
  ids: readonly string[],
  previous: readonly Assignment[] = [],
): Assignment[] {
  if (ids.length < 2)
    throw new Error("At least two confirmed participants are required.");
  if (new Set(ids).size !== ids.length)
    throw new Error("Duplicate participant IDs.");
  const forbidden = new Map(previous.map((p) => [p.sender_id, p.recipient_id]));
  if (
    forbidden.size !== previous.length ||
    new Set(previous.map((p) => p.recipient_id)).size !== previous.length
  )
    throw new Error("Previous assignments must be one-to-one.");
  const order = [...ids];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const asEdges = (xs: string[]) =>
    xs.map((id, i) => ({
      sender_id: id,
      recipient_id: xs[(i + 1) % xs.length],
    }));
  if (order.length <= 3) {
    const a = asEdges(order),
      b = asEdges([...order].reverse());
    const repeats = (xs: Assignment[]) =>
      xs.filter((x) => forbidden.get(x.sender_id) === x.recipient_id).length;
    return repeats(a) <= repeats(b) ? a : b;
  }
  const next = new Map(
    asEdges(order).map((x) => [x.sender_id, x.recipient_id]),
  );
  for (const a of order) {
    const b = next.get(a)!;
    if (forbidden.get(a) !== b) continue;
    const c = next.get(b)!;
    next.set(a, c);
    // Walk at most three candidates in the remaining cycle.
    let x = c;
    for (let checked = 0; checked < 3; checked++) {
      if (x !== a && forbidden.get(x) !== b && forbidden.get(b) !== next.get(x))
        break;
      x = next.get(x)!;
    }
    if (x === a || forbidden.get(x) === b || forbidden.get(b) === next.get(x))
      throw new Error("Invalid previous assignment relation.");
    const y = next.get(x)!;
    next.set(x, b);
    next.set(b, y);
  }
  const result = order.map((sender_id) => ({
    sender_id,
    recipient_id: next.get(sender_id)!,
  }));
  assertSingleCycle(ids, result);
  return result;
}

export function assertSingleCycle(
  ids: readonly string[],
  edges: readonly Assignment[],
) {
  const members = new Set(ids);
  const next = new Map(edges.map((e) => [e.sender_id, e.recipient_id]));
  if (
    ids.length < 2 ||
    members.size !== ids.length ||
    edges.length !== ids.length ||
    next.size !== ids.length ||
    new Set(edges.map((e) => e.recipient_id)).size !== ids.length ||
    edges.some(
      (e) =>
        !members.has(e.sender_id) ||
        !members.has(e.recipient_id) ||
        e.sender_id === e.recipient_id,
    )
  )
    throw new Error("Invalid assignment membership.");
  const seen = new Set<string>();
  let current = ids[0];
  while (!seen.has(current)) {
    seen.add(current);
    current = next.get(current)!;
  }
  if (current !== ids[0] || seen.size !== ids.length)
    throw new Error("Assignments must form exactly one cycle.");
}
