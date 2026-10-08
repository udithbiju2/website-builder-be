import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AI_CREATABLE_TYPES } from "./ai-ops.js";
import { PLANNER_SYSTEM_PROMPT, buildPlannerInput } from "./ai-planner.js";

describe("planner prompt", () => {
  it("describes every section type the AI may create", () => {
    for (const type of AI_CREATABLE_TYPES) {
      assert.match(PLANNER_SYSTEM_PROMPT, new RegExp(`^- ${type}:`, "m"), `catalog is missing "${type}"`);
    }
  });

  it("builds a compact outline with 1-based positions and the selected section", () => {
    const input = JSON.parse(
      buildPlannerInput(
        "remove this",
        [
          { id: "a", type: "hero", hidden: false, settings: {}, data: { heading: "Welcome" } },
          { id: "b", type: "faq", hidden: true, settings: {}, data: {} },
        ],
        "b",
      ),
    );
    assert.deepEqual(input.outline, [
      { position: 1, id: "a", type: "hero", label: "Welcome" },
      { position: 2, id: "b", type: "faq", label: "", hidden: true, selected: true },
    ]);
    assert.equal(input.userMessage, "remove this");
  });
});
