import { describe, it, expect } from "vitest";
import {
  computeVerseFamiliarity,
  type VerseFamiliarityInfo,
} from "../../../services/verseFamiliarityService";
import type { KnowledgeBase, KBConnection } from "../../../types";

function makeKB(connections: KBConnection[]): KnowledgeBase {
  return {
    _meta: { author: "test", version: 1 },
    roots: {},
    lemmas: {},
    connections,
    patterns: [],
  };
}

describe("verseFamiliarityService", () => {
  describe("computeVerseFamiliarity", () => {
    it("returns hasConnections false when KB is null", () => {
      const result = computeVerseFamiliarity("2:255", null);
      expect(result.hasConnections).toBe(false);
      expect(result.connections).toHaveLength(0);
    });

    it("returns hasConnections false when KB has no connections", () => {
      const result = computeVerseFamiliarity("2:255", makeKB([]));
      expect(result.hasConnections).toBe(false);
    });

    it("returns hasConnections false when verse is not referenced", () => {
      const kb = makeKB([
        {
          from: { verse: "3:18", words: null },
          to: { verse: "37:35", words: null },
          reason: "test",
        },
      ]);
      const result = computeVerseFamiliarity("2:255", kb);
      expect(result.hasConnections).toBe(false);
      expect(result.connections).toHaveLength(0);
    });

    it("finds connections where verse is the from", () => {
      const conn: KBConnection = {
        from: { verse: "2:255", words: null },
        to: { verse: "3:2", words: null },
        reason: "Both describe الحي القيوم",
      };
      const result = computeVerseFamiliarity("2:255", makeKB([conn]));
      expect(result.hasConnections).toBe(true);
      expect(result.connections).toHaveLength(1);
      expect(result.connections[0].reason).toBe("Both describe الحي القيوم");
    });

    it("finds connections where verse is the to", () => {
      const conn: KBConnection = {
        from: { verse: "2:255", words: null },
        to: { verse: "3:2", words: null },
        reason: "test connection",
      };
      const result = computeVerseFamiliarity("3:2", makeKB([conn]));
      expect(result.hasConnections).toBe(true);
      expect(result.connections).toHaveLength(1);
    });

    it("finds all connections when verse appears in multiple", () => {
      const kb = makeKB([
        {
          from: { verse: "2:255", words: null },
          to: { verse: "3:2", words: null },
          reason: "conn 1",
        },
        {
          from: { verse: "20:111", words: null },
          to: { verse: "2:255", words: null },
          reason: "conn 2",
        },
        {
          from: { verse: "3:18", words: null },
          to: { verse: "37:35", words: null },
          reason: "unrelated",
        },
      ]);
      const result = computeVerseFamiliarity("2:255", kb);
      expect(result.hasConnections).toBe(true);
      expect(result.connections).toHaveLength(2);
    });
  });
});
