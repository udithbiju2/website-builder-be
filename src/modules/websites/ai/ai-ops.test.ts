import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyOps, parsePlan, previewLayout, type SectionEnvelope } from "./ai-ops.js";

function section(id: string, type: string): SectionEnvelope {
  return { id, type, hidden: false, settings: { background: "default", hideOnMobile: false }, data: {} };
}

const page = [section("h", "header"), section("hero", "hero"), section("p", "pricing"), section("f", "footer")];
const ids = (sections: SectionEnvelope[]) => sections.map((s) => s.id);

describe("parsePlan", () => {
  it("accepts a valid edit plan", () => {
    const plan = parsePlan({ intent: "edit", reply: "Removed header", ops: [{ op: "remove", sectionIds: ["h"] }] }, page);
    assert.deepEqual(plan.ops, [{ op: "remove", sectionIds: ["h"] }]);
  });

  it("drops ops that reference sections not on the page", () => {
    const plan = parsePlan(
      {
        intent: "edit",
        reply: "",
        ops: [
          { op: "remove", sectionIds: ["ghost", "p", "p"] },
          { op: "update", sectionId: "ghost", instruction: "make it dark" },
          { op: "move", sectionId: "ghost", toIndex: 0 },
        ],
      },
      page,
    );
    assert.deepEqual(plan.ops, [{ op: "remove", sectionIds: ["p"] }]);
  });

  it("rejects unknown ops and section types", () => {
    assert.throws(() => parsePlan({ intent: "edit", reply: "", ops: [{ op: "explode" }] }, page));
    assert.throws(() =>
      parsePlan(
        { intent: "edit", reply: "", ops: [{ op: "add", sectionType: "iframe", position: null, instruction: "x" }] },
        page,
      ),
    );
    assert.throws(() => parsePlan({ intent: "maybe", reply: "", ops: [] }, page));
  });
});

describe("applyOps", () => {
  it("removes sections without re-adding a header or footer", () => {
    const next = applyOps(page, [{ op: "remove", sectionIds: ["h", "f"] }]);
    assert.deepEqual(ids(next), ["hero", "p"]);
  });

  it("clears the page", () => {
    assert.deepEqual(applyOps(page, [{ op: "clear" }]), []);
  });

  it("inserts new body sections above the footer by default", () => {
    const next = applyOps(page, [{ op: "add", section: section("faq", "faq"), position: null }]);
    assert.deepEqual(ids(next), ["h", "hero", "p", "faq", "f"]);
  });

  it("honours an explicit position and clamps out-of-range values", () => {
    assert.deepEqual(ids(applyOps(page, [{ op: "add", section: section("x", "cta"), position: 1 }])), [
      "h",
      "x",
      "hero",
      "p",
      "f",
    ]);
    assert.deepEqual(ids(applyOps(page, [{ op: "add", section: section("x", "cta"), position: 99 }])).at(-1), "x");
  });

  it("puts a new header first and replaces an existing one in place", () => {
    const withoutHeader = page.slice(1);
    assert.deepEqual(ids(applyOps(withoutHeader, [{ op: "add", section: section("h2", "header"), position: null }]))[0], "h2");
    assert.deepEqual(ids(applyOps(page, [{ op: "add", section: section("h2", "header"), position: null }])), [
      "h2",
      "hero",
      "p",
      "f",
    ]);
  });

  it("updates and moves sections by id", () => {
    const updated = { ...section("p", "pricing"), data: { heading: "New" } };
    const next = applyOps(page, [
      { op: "update", section: updated },
      { op: "move", sectionId: "p", toIndex: 1 },
    ]);
    assert.deepEqual(ids(next), ["h", "p", "hero", "f"]);
    assert.equal(next[1]!.data.heading, "New");
  });

  it("replaces the whole page with exactly the generated sections", () => {
    const next = applyOps(page, [{ op: "replace_page", sections: [section("a", "hero"), section("b", "cta")] }]);
    assert.deepEqual(ids(next), ["a", "b"]);
  });

  it("does not mutate the input", () => {
    const snapshot = ids(page);
    applyOps(page, [{ op: "remove", sectionIds: ["hero"] }, { op: "add", section: section("x", "faq"), position: 0 }]);
    assert.deepEqual(ids(page), snapshot);
  });
});

describe("previewLayout", () => {
  it("places pending adds where the final sections will land, using the reserved ids", () => {
    const layout = previewLayout(
      page,
      [
        { op: "add", sectionType: "faq", position: null, instruction: "faq" },
        { op: "update", sectionId: "hero", instruction: "dark" },
        { op: "remove", sectionIds: ["p"] },
      ],
      ["new-faq", undefined, undefined],
    );
    assert.deepEqual(layout, [
      { id: "h", type: "header", status: "existing" },
      { id: "hero", type: "hero", status: "updating" },
      { id: "new-faq", type: "faq", status: "pending" },
      { id: "f", type: "footer", status: "existing" },
    ]);
  });

  it("puts a new footer at the bottom and a new header at the top", () => {
    const body = [section("hero", "hero")];
    const layout = previewLayout(
      body,
      [
        { op: "add", sectionType: "footer", position: null, instruction: "footer" },
        { op: "add", sectionType: "header", position: null, instruction: "header" },
      ],
      ["new-f", "new-h"],
    );
    assert.deepEqual(layout.map((s) => [s.id, s.status]), [
      ["new-h", "pending"],
      ["hero", "existing"],
      ["new-f", "pending"],
    ]);
  });

  it("replaces an existing singleton header in place", () => {
    const layout = previewLayout(page, [{ op: "add", sectionType: "header", position: null, instruction: "x" }], ["h2"]);
    assert.deepEqual(layout.map((s) => s.id), ["h2", "hero", "p", "f"]);
  });
});
