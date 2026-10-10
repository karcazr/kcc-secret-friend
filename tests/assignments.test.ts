import { describe, it, expect } from "vitest";
import { generateAssignments, assertSingleCycle } from "../src/lib/assignments";

describe("single-cycle assignments", () => {
  it("rejects insufficient and duplicate participants", () => {
    for (const ids of [[], ["a"], ["a", "a"]])
      expect(() => generateAssignments(ids)).toThrow();
  });
  it("handles two participants and unavoidable repeats", () => {
    const previous = [
      { sender_id: "a", recipient_id: "b" },
      { sender_id: "b", recipient_id: "a" },
    ];
    expect(generateAssignments(["a", "b"], previous)).toHaveLength(2);
  });
  it("rejects disconnected cycles", () => {
    expect(() =>
      assertSingleCycle(
        ["a", "b", "c", "d"],
        [
          { sender_id: "a", recipient_id: "b" },
          { sender_id: "b", recipient_id: "a" },
          { sender_id: "c", recipient_id: "d" },
          { sender_id: "d", recipient_id: "c" },
        ],
      ),
    ).toThrow("exactly one cycle");
  });
  it("avoids repeats with changing populations and arbitrary partial permutations", () => {
    for (let n = 4; n <= 150; n++) {
      const ids = Array.from({ length: n }, (_, i) => `student-${i}`);
      for (let run = 0; run < 12; run++) {
        const previous = generateAssignments(ids).filter(
          (_, i) => i % 3 !== run % 3,
        );
        const result = generateAssignments(ids, previous);
        assertSingleCycle(ids, result);
        const prior = new Map(
          previous.map((p) => [p.sender_id, p.recipient_id]),
        );
        expect(
          result.every((p) => prior.get(p.sender_id) !== p.recipient_id),
        ).toBe(true);
      }
    }
  });
  it("finds the optimal three-person cycle when avoidance is impossible", () => {
    const prior = [
      { sender_id: "a", recipient_id: "b" },
      { sender_id: "b", recipient_id: "a" },
    ];
    const result = generateAssignments(["a", "b", "c"], prior);
    expect(
      result.filter((e) =>
        prior.some(
          (p) =>
            p.sender_id === e.sender_id && p.recipient_id === e.recipient_id,
        ),
      ),
    ).toHaveLength(1);
  });
  it("supports 100,000 participants without a count cap", () => {
    const ids = Array.from({ length: 100_000 }, (_, i) => String(i));
    const previous = generateAssignments(ids);
    const result = generateAssignments(ids, previous);
    assertSingleCycle(ids, result);
    const prior = new Map(previous.map((p) => [p.sender_id, p.recipient_id]));
    expect(result.every((p) => prior.get(p.sender_id) !== p.recipient_id)).toBe(
      true,
    );
  });
});
