import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CUSTOM_LIMITS, type CustomBlock } from "../types/site-content.types.js";
import { measureCustomBlocks, sectionSchema } from "../validators/site-content.validator.js";
import { sanitizeCustomData } from "./custom-section.js";

const settings = { background: "default", hideOnMobile: false };
const customSection = (data: unknown) => ({ id: "c1", type: "custom", hidden: false, settings, data });

const heroLayout = {
  width: "wide",
  align: "start",
  blocks: [
    {
      type: "grid",
      columns: 2,
      align: "center",
      children: [
        {
          type: "stack",
          gap: "md",
          children: [
            { type: "badge", text: "New" },
            { type: "heading", text: "Ship faster", level: 1 },
            { type: "text", text: "Everything you need.", size: "lg", muted: true },
            {
              type: "stack",
              direction: "row",
              children: [
                { type: "button", label: "Start", href: "/signup", tone: "primary" },
                { type: "button", label: "Docs", href: "https://example.com/docs", tone: "secondary" },
              ],
            },
          ],
        },
        {
          type: "card",
          tone: "glass",
          children: [
            { type: "icon", name: "rocket" },
            { type: "list", items: ["Fast", "Secure"] },
            { type: "image", url: "https://images.unsplash.com/photo-1", alt: "Preview", aspect: "video" },
          ],
        },
      ],
    },
  ],
};

function nested(depth: number): CustomBlock {
  return depth <= 1
    ? { type: "heading", text: "Deep" }
    : { type: "stack", children: [nested(depth - 1)] };
}

describe("custom section validation", () => {
  it("accepts a well-formed block layout", () => {
    assert.equal(sectionSchema.validate(customSection(heroLayout)).error, undefined);
  });

  it("rejects unknown blocks, unsafe links and empty layouts", () => {
    const withBlock = (block: unknown) => customSection({ blocks: [block] });
    assert.ok(sectionSchema.validate(withBlock({ type: "iframe", src: "https://x.com" })).error);
    assert.ok(sectionSchema.validate(withBlock({ type: "button", label: "Go", href: "javascript:alert(1)" })).error);
    assert.ok(sectionSchema.validate(withBlock({ type: "image", url: "data:image/png;base64,AAA", alt: "" })).error);
    assert.ok(sectionSchema.validate(withBlock({ type: "icon", name: "skull" })).error);
    assert.ok(sectionSchema.validate(customSection({ blocks: [] })).error);
  });

  it("enforces the nesting and size limits", () => {
    assert.equal(measureCustomBlocks([nested(CUSTOM_LIMITS.maxDepth)]).depth, CUSTOM_LIMITS.maxDepth);
    assert.equal(sectionSchema.validate(customSection({ blocks: [nested(CUSTOM_LIMITS.maxDepth)] })).error, undefined);
    assert.ok(sectionSchema.validate(customSection({ blocks: [nested(CUSTOM_LIMITS.maxDepth + 1)] })).error);

    const wide = Array.from({ length: 12 }, () => ({
      type: "stack",
      children: Array.from({ length: 5 }, () => ({ type: "badge", text: "x" })),
    }));
    assert.ok(measureCustomBlocks(wide as CustomBlock[]).count > CUSTOM_LIMITS.maxBlocks);
    assert.ok(sectionSchema.validate(customSection({ blocks: wide })).error);
  });
});

describe("sanitizeCustomData", () => {
  it("keeps a valid layout intact", () => {
    const clean = sanitizeCustomData(structuredClone(heroLayout));
    assert.equal(sectionSchema.validate(customSection(clean)).error, undefined);
    assert.equal(measureCustomBlocks(clean.blocks).count, measureCustomBlocks(heroLayout.blocks as CustomBlock[]).count);
  });

  it("drops unknown blocks and unsafe media, and neutralises unsafe links", () => {
    const clean = sanitizeCustomData({
      blocks: [
        { type: "script", text: "alert(1)" },
        { type: "image", url: "javascript:alert(1)", alt: "x" },
        { type: "button", label: "Go", href: "javascript:alert(1)" },
        { type: "heading", text: "  Kept  ", level: 9 },
      ],
    });
    assert.deepEqual(clean.blocks, [
      { type: "button", label: "Go", href: "#", tone: undefined },
      { type: "heading", text: "Kept", level: undefined },
    ]);
  });

  it("trims layouts that exceed the limits so they still validate", () => {
    const tooDeep = sanitizeCustomData({ blocks: [nested(CUSTOM_LIMITS.maxDepth + 3), { type: "text", text: "ok" }] });
    assert.ok(measureCustomBlocks(tooDeep.blocks).depth <= CUSTOM_LIMITS.maxDepth);

    const tooMany = sanitizeCustomData({
      blocks: Array.from({ length: 30 }, () => ({
        type: "stack",
        children: Array.from({ length: 12 }, () => ({ type: "badge", text: "x" })),
      })),
    });
    assert.ok(measureCustomBlocks(tooMany.blocks).count <= CUSTOM_LIMITS.maxBlocks);
    assert.equal(sectionSchema.validate(customSection(tooMany)).error, undefined);
  });

  it("fails clearly when nothing usable is left", () => {
    assert.throws(() => sanitizeCustomData({ blocks: [{ type: "video" }] }), /could not build that layout/);
  });
});
