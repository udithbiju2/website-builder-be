import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FooterData, HeaderData, Section, ThemeSettings } from "../types/site-content.types.js";
import type { PageView } from "../types/website.types.js";
import { buildPublishSnapshot } from "./publish-snapshot.js";

const theme = { colors: {}, fonts: {} } as unknown as ThemeSettings;
const header = { siteName: "Acme" } as unknown as HeaderData;
const footer = { siteName: "Acme" } as unknown as FooterData;

function textSection(id: string, hidden: boolean): Section {
  return { id, type: "text", hidden, settings: { background: "default", hideOnMobile: false }, data: { body: id } };
}

function page(id: string, slug: string, visible: boolean, sections: Section[]): PageView {
  return { id, name: id, slug, pageType: "CUSTOM", visible, showInNav: true, seoTitle: null, seoDescription: null, sections };
}

describe("buildPublishSnapshot", () => {
  it("drops hidden pages and hidden sections", () => {
    const snapshot = buildPublishSnapshot({
      theme,
      header,
      footer,
      pages: [
        page("home", "/", true, [textSection("a", false), textSection("b", true)]),
        page("draft", "/draft", false, [textSection("c", false)]),
      ],
    });
    assert.equal(snapshot.schemaVersion, 1);
    assert.deepEqual(
      snapshot.pages.map((p) => p.id),
      ["home"],
    );
    assert.deepEqual(
      snapshot.pages[0]!.sections.map((s) => s.id),
      ["a"],
    );
  });

  it("does not leak editor-only page fields", () => {
    const snapshot = buildPublishSnapshot({ theme, header, footer, pages: [page("home", "/", true, [])] });
    assert.equal("visible" in snapshot.pages[0]!, false);
  });
});
