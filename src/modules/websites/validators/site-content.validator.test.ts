import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sectionSchema, sectionsSchema } from "./site-content.validator.js";
import { publishSchema, savePageContentSchema } from "./website.validator.js";

const settings = { background: "default", hideOnMobile: false };

function section(type: string, data: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return { id: "s1", type, hidden: false, settings, data, ...extra };
}

describe("sectionSchema", () => {
  it("accepts every new section type with valid data", () => {
    const valid = [
      section("header", { design: "logo-left", siteName: "My Site", menu: [{ label: "Home", href: "/" }], sticky: false }),
      section("footer", { design: "columns", siteName: "My Site", copyright: "© 2026", columns: [], social: [] }),
      section("logos", { grayscale: true, logos: [{ url: "https://cdn.example.com/a.svg", alt: "Acme" }] }),
      section("split", { heading: "Hi", body: "", bullets: ["One"], imagePosition: "left" }),
      section("stats", { items: [{ value: "99%", label: "Uptime" }] }),
      section("pricing", { heading: "Plans", plans: [{ name: "Pro", price: "$9", features: ["A"], featured: true }] }),
      section("media", { kind: "video", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", aspect: "16:9", width: "wide" }),
      section("team", { heading: "Team", columns: 3, mobileColumns: 1, members: [{ name: "Ada" }] }),
    ];
    for (const value of valid) {
      const { error } = sectionSchema.validate(value);
      assert.equal(error, undefined, `${value.type}: ${error?.message}`);
    }
  });

  it("accepts a known section font and rejects anything else", () => {
    const text = (font: unknown) =>
      section("text", { body: "Hello" }, { settings: { ...settings, font } });
    assert.equal(sectionSchema.validate(section("text", { body: "Hello" })).error, undefined);
    assert.equal(sectionSchema.validate(text("playfair-display")).error, undefined);
    assert.ok(sectionSchema.validate(text("comic-sans; color: red")).error);
  });

  it("rejects script URLs in links and images", () => {
    const { error } = sectionSchema.validate(
      section("cta", { heading: "Go", button: { label: "Click", href: "javascript:alert(1)" } }),
    );
    assert.ok(error);
    const image = sectionSchema.validate(
      section("logos", { grayscale: false, logos: [{ url: "data:image/svg+xml,<svg/>", alt: "" }] }),
    );
    assert.ok(image.error);
  });

  it("only allows YouTube and Vimeo video links", () => {
    const bad = sectionSchema.validate(
      section("media", { kind: "video", videoUrl: "https://evil.example.com/embed.html", aspect: "16:9", width: "wide" }),
    );
    assert.ok(bad.error);
    const vimeo = sectionSchema.validate(
      section("media", { kind: "video", videoUrl: "https://vimeo.com/76979871", aspect: "16:9", width: "contained" }),
    );
    assert.equal(vimeo.error, undefined);
  });

  it("validates optional settings and rejects unknown values", () => {
    const ok = sectionSchema.validate(
      section("text", { body: "Hello" }, { settings: { ...settings, spacing: "compact", align: "left", anchor: "about-us", hideOnDesktop: true } }),
    );
    assert.equal(ok.error, undefined);
    const badAnchor = sectionSchema.validate(section("text", { body: "Hello" }, { settings: { ...settings, anchor: "Bad Anchor" } }));
    assert.ok(badAnchor.error);
    const badBackground = sectionSchema.validate(section("text", { body: "Hello" }, { settings: { ...settings, background: "url(x)" } }));
    assert.ok(badBackground.error);
  });

  it("rejects unknown section types and oversized lists", () => {
    assert.ok(sectionSchema.validate(section("html", { body: "<script>" })).error);
    const tooMany = Array.from({ length: 9 }, () => ({ value: "1", label: "x" }));
    assert.ok(sectionSchema.validate(section("stats", { items: tooMany })).error);
  });

  it("requires unique section ids within a page", () => {
    const text = section("text", { body: "a" });
    assert.ok(sectionsSchema.validate([text, text]).error);
  });
});

describe("savePageContentSchema", () => {
  const base = { expectedDraftUpdatedAt: "2026-10-05T06:00:00.000Z", schemaVersion: 1, sections: [] };

  it("accepts a valid autosave payload", () => {
    assert.equal(savePageContentSchema.validate(base).error, undefined);
  });

  it("rejects unsupported schema versions", () => {
    assert.ok(savePageContentSchema.validate({ ...base, schemaVersion: 2 }).error);
  });

  it("requires a concurrency token", () => {
    assert.ok(savePageContentSchema.validate({ schemaVersion: 1, sections: [] }).error);
    assert.ok(publishSchema.validate({}).error);
  });
});
