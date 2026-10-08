import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PageType } from "../../../common/constants/website.js";
import { AppError } from "../../../common/errors/AppError.js";
import type { PageView, WebsiteDetail } from "../types/website.types.js";
import type { SectionEnvelope } from "./ai-generator.service.js";
import { buildCopilotContext, toCopilotSuggestion, type SiteCopilotOptions } from "./ai-site-copilot.service.js";
import type { BriefImage } from "./site-generator.js";

const images: BriefImage[] = [
  { id: "m1", url: "https://api.example.com/api/media/files/m1", alt: "Fresh loaves", fileName: "loaves.jpg", width: 1600, height: 1000 },
];

function section(id: string, type: string, data: Record<string, unknown>, settings: Record<string, unknown> = {}): SectionEnvelope {
  return { id, type, hidden: false, settings: { background: "default", ...settings }, data };
}

const header = section("h1", "header", { siteName: "Harbor Bakery" });
const footer = section("f1", "footer", { copyright: "Harbor Bakery" });
const hero = section(
  "s-hero",
  "hero",
  {
    variant: "centered",
    heading: "Old heading",
    subheading: "Old subheading",
    primaryCta: { label: "Book a table", href: "https://booking.example.com/harbor" },
    image: { url: "https://cdn.owner.example/hero.jpg", alt: "Our shop" },
    imagePosition: "right",
  },
  { customColors: { background: "#112233" } },
);
const contact = section("s-contact", "contact", {
  heading: "Visit us",
  text: "Come by",
  email: "owner@harbor.example.com",
  showForm: true,
  submitLabel: "Send",
});

const homePage: PageView = {
  id: "p-home",
  name: "Home",
  slug: "/",
  pageType: PageType.HOME,
  visible: true,
  showInNav: true,
  seoTitle: "Harbor Bakery",
  seoDescription: null,
  sections: [],
};
const contactPage: PageView = { ...homePage, id: "p-contact", name: "Contact", slug: "/contact", pageType: PageType.CONTACT };

const website = {
  id: "w1",
  clientId: "c1",
  name: "Harbor Bakery",
  info: {
    businessName: "Harbor Bakery",
    websiteType: "Business",
    industry: "Food",
    description: "Sourdough and pastries by the sea.",
    contactEmail: "hello@harbor.example.com",
    contactPhone: null,
    address: null,
  },
  draft: { pages: [homePage, contactPage] },
} as unknown as WebsiteDetail;

function options(overrides: Partial<SiteCopilotOptions> = {}): SiteCopilotOptions {
  return {
    prompt: "Make it about our sourdough",
    scope: "page",
    currentSections: [header, hero, contact, footer],
    pageId: "p-home",
    website,
    userId: "u1",
    ...overrides,
  };
}

function suggest(raw: unknown, overrides: Partial<SiteCopilotOptions> = {}) {
  const opts = options(overrides);
  return toCopilotSuggestion(opts, raw, buildCopilotContext(opts, images));
}

describe("AI site copilot", () => {
  it("edits the selected section's copy but keeps its id, settings and the owner's own image and link", () => {
    const result = suggest(
      {
        intent: "edit_section",
        summary: "Rewrote the hero around sourdough",
        section: {
          data: {
            heading: "Slow-fermented sourdough, baked at dawn",
            secondaryCta: { label: "Elsewhere", href: "https://evil.example.com" },
            videoUrl: "https://videos.example.com/x.mp4",
          },
        },
      },
      { scope: "section", currentSection: hero, sectionId: hero.id },
    );

    assert.deepEqual(result.target, { scope: "section", sectionId: "s-hero" });
    const after = result.after[0]!;
    assert.equal(after.id, "s-hero");
    assert.equal(after.data.heading, "Slow-fermented sourdough, baked at dawn");
    assert.equal(after.data.subheading, "Old subheading");
    assert.deepEqual(after.data.image, { url: "https://cdn.owner.example/hero.jpg", alt: "Our shop" });
    assert.equal((after.data.primaryCta as { href: string }).href, "https://booking.example.com/harbor");
    assert.equal((after.data.secondaryCta as { href: string }).href, "/contact");
    assert.equal(after.data.videoUrl, undefined);
    assert.deepEqual(after.settings.customColors, { background: "#112233" });
  });

  it("keeps real contact details when the AI invents new ones", () => {
    const result = suggest(
      { intent: "edit_section", summary: "Updated", section: { data: { heading: "Say hello", email: "fake@made-up.example.com" } } },
      { scope: "section", currentSection: contact, sectionId: contact.id },
    );
    assert.equal(result.after[0]!.data.email, "owner@harbor.example.com");
    assert.equal(result.after[0]!.data.heading, "Say hello");
  });

  it("rewrites page copy in place, leaves other sections alone and proposes SEO", () => {
    const result = suggest({
      intent: "rewrite_page",
      summary: "Refocused the page on sourdough",
      sections: [{ id: "s-hero", data: { heading: "Sourdough by the sea" } }, { id: "h1", data: { siteName: "Hacked" } }],
      seo: { title: "Harbor Bakery | Sourdough by the sea", description: "Fresh sourdough and pastries every morning." },
    });

    assert.deepEqual(result.target, { scope: "page", rebuild: false, focusSectionId: "s-hero" });
    assert.deepEqual(
      result.after.map((s) => s.id),
      ["h1", "s-hero", "s-contact", "f1"],
    );
    assert.equal(result.after[0], header);
    assert.equal(result.after[1]!.data.heading, "Sourdough by the sea");
    assert.equal(result.after[2], contact);
    assert.deepEqual(result.seo, {
      pageId: "p-home",
      seoTitle: "Harbor Bakery | Sourdough by the sea",
      seoDescription: "Fresh sourdough and pastries every morning.",
    });
  });

  it("redesigns the body between the existing header and footer, using only library images", () => {
    const result = suggest({
      intent: "redesign_page",
      summary: "New page",
      sections: [
        { type: "hero", data: { heading: "Bread worth waking up for", image: "IMAGE_1", primaryCta: { label: "Order", href: "/contact" } } },
        { type: "iframe", data: { src: "https://evil.example.com" } },
        { type: "split", data: { heading: "Our story", body: "Since 1999.", bullets: ["Local flour"], imagePosition: "left", image: "https://images.unsplash.com/x.jpg" } },
      ],
    });

    assert.deepEqual(
      result.after.map((s) => s.type),
      ["header", "hero", "split", "footer"],
    );
    assert.deepEqual(result.after[1]!.data.image, { url: images[0]!.url, alt: "Fresh loaves" });
    assert.equal(result.after[2]!.data.image, undefined);
  });

  it("answers questions as chat and falls back to chat when there is nothing to apply", () => {
    const chat = suggest({ intent: "chat", summary: "Tips", chatReply: "Add your opening hours to the contact page." });
    assert.equal(chat.target.scope, "chat");
    assert.equal(chat.chatReply, "Add your opening hours to the contact page.");

    const noSelection = suggest({ intent: "edit_section", summary: "Can't", chatReply: "Select a section first." });
    assert.equal(noSelection.target.scope, "chat");

    const sameSeo = suggest({ intent: "update_seo", summary: "SEO", seo: { title: "Harbor Bakery", description: "" } });
    assert.equal(sameSeo.target.scope, "chat");
  });

  it("rejects replies that change nothing", () => {
    assert.throws(
      () => suggest({ intent: "rewrite_page", summary: "Nothing", sections: [{ id: "unknown", data: { heading: "x" } }] }),
      (error: unknown) => error instanceof AppError && error.code === "AI_NO_CHANGES",
    );
  });
});
