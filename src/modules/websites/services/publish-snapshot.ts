import type { FooterData, HeaderData, Section, ThemeSettings } from "../types/site-content.types.js";
import type { PageView, PublishSnapshot } from "../types/website.types.js";
import { EDITOR_SCHEMA_VERSION } from "../validators/website.validator.js";

type SnapshotSource = {
  theme: ThemeSettings;
  header: HeaderData;
  footer: FooterData;
  pages: PageView[];
};

/**
 * Builds the immutable content of a published version. Hidden pages and hidden
 * sections are dropped so the snapshot holds exactly what visitors may see.
 */
export function buildPublishSnapshot(source: SnapshotSource): PublishSnapshot {
  return {
    schemaVersion: EDITOR_SCHEMA_VERSION,
    theme: source.theme,
    header: source.header,
    footer: source.footer,
    pages: source.pages
      .filter((page) => page.visible)
      .map((page) => ({
        id: page.id,
        name: page.name,
        slug: page.slug,
        pageType: page.pageType,
        showInNav: page.showInNav,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        sections: page.sections.filter((section: Section) => !section.hidden),
      })),
  };
}
