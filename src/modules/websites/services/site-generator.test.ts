import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { THEME_SEEDS } from "../../../seeder/design-library/themes.js";
import type { Section } from "../types/site-content.types.js";
import type { GenerationBrief } from "../types/website-generation.types.js";
import { sectionSchema } from "../validators/site-content.validator.js";
import type { JsonCompletion, JsonCompletionRequest } from "./openai-json.client.js";
import { generateSite, type BriefImage, type SiteFacts, type ThemeChoice } from "./site-generator.js";

const themes: ThemeChoice[] = THEME_SEEDS.map((seed, index) => ({ id: `theme-${index}`, name: seed.name, settings: seed.settings }));

const facts: SiteFacts = {
  name: "Harbor Bakery",
  businessName: "Harbor Bakery",
  websiteType: "Business",
  industry: "Food",
  description: "Sourdough and pastries by the sea.",
  contactEmail: "hello@harbor.example.com",
  contactPhone: null,
  address: null,
};

const images: BriefImage[] = [
  { id: "m1", url: "https://api.example.com/api/media/files/m1", alt: "Fresh loaves", fileName: "loaves.jpg", width: 1600, height: 1000 },
  { id: "m2", url: "https://api.example.com/api/media/files/m2", alt: "", fileName: "shop.jpg", width: null, height: null },
];

function brief(overrides: Partial<GenerationBrief> = {}): GenerationBrief {
  return {
    prompt: "A warm bakery website with our breads and a contact form",
    pages: ["Home", "About Us", "Contact"],
    tone: "friendly",
    themeId: null,
    mediaIds: images.map((image) => image.id),
    logoMediaId: null,
    ...overrides,
  };
}

const plan = {
  themeName: "Warm Studio",
  primaryColor: "#b45309",
  headingFont: "fraunces",
  bodyFont: "inter",
  headerDesign: "centered",
  footerDesign: "columns",
  headerCtaLabel: "Order now",
  headerCtaPage: "/contact",
  tagline: "Baked fresh every morning",
  pages: [
    { name: "Home", purpose: "Welcome", seoTitle: "Harbor Bakery", seoDescription: "Bakery", sections: ["hero", "gallery", "faq", "cta"] },
    { name: "About Us", purpose: "Story", seoTitle: "About", seoDescription: "Story", sections: ["hero", "split"] },
    { name: "Contact", purpose: "Reach us", seoTitle: "Contact", seoDescription: "Contact", sections: ["hero", "contact"] },
  ],
};

const pageReplies: Record<string, unknown> = {
  Home: {
    sections: [
      {
        type: "hero",
        settings: { background: "default" },
        data: {
          heading: "Bread worth waking up for",
          subheading: "Sourdough baked at dawn.",
          primaryCta: { label: "Visit us", href: "https://evil.example.com" },
          image: "IMAGE_1",
          backgroundImage: { url: "https://images.unsplash.com/photo-1", alt: "stock" },
          videoUrl: "https://www.youtube.com/watch?v=abcdefgh",
        },
      },
      { type: "gallery", data: { heading: "Our bakes", columns: 3, mobileColumns: 1, images: ["IMAGE_2", "IMAGE_9", "https://x.example.com/a.jpg"] } },
      { type: "faq", data: {} },
      { type: "cta", settings: { background: "primary" }, data: { heading: "Hungry?", button: { label: "Contact", href: "/contact" } } },
    ],
  },
  "About Us": {
    sections: [
      { type: "hero", data: { heading: "Our story", primaryCta: { label: "Say hi", href: "/contact#form" } } },
      { type: "split", data: { heading: "Since 1998", body: "Family run.", bullets: ["Local flour"], imagePosition: "left", image: { url: "IMAGE_1", alt: "" } } },
    ],
  },
  Contact: {
    sections: [
      { type: "hero", data: { heading: "Get in touch" } },
      { type: "contact", data: { heading: "Write to us", email: "fake@invented.com", phone: "+1 555", showForm: true, submitLabel: "Send" } },
    ],
  },
};

function fakeCompletion(calls: JsonCompletionRequest[]): JsonCompletion {
  return async (request) => {
    calls.push(request);
    if (request.scope === "site_plan") return plan;
    const match = /Write the "([^"]+)" page/.exec(request.messages[1]!.content);
    return pageReplies[match![1]!] ?? {};
  };
}

function allSections(pages: { sections: Section[] }[]): Section[] {
  return pages.flatMap((page) => page.sections);
}

describe("generateSite", () => {
  it("builds valid pages with owner media and internal links only", async () => {
    const calls: JsonCompletionRequest[] = [];
    const site = await generateSite({ facts, brief: brief(), images, logo: images[1]!, themes, complete: fakeCompletion(calls) });

    assert.equal(calls.length, 4);
    assert.deepEqual(
      site.pages.map((page) => [page.name, page.slug, page.pageType]),
      [
        ["Home", "/", "HOME"],
        ["About Us", "/about-us", "ABOUT"],
        ["Contact", "/contact", "CONTACT"],
      ],
    );

    for (const section of allSections(site.pages)) {
      assert.equal(sectionSchema.validate(section).error, undefined, `${section.type} must pass the schema`);
    }

    const json = JSON.stringify(site);
    assert.ok(!json.includes("unsplash"), "AI-supplied stock images are removed");
    assert.ok(!json.includes("evil.example.com"), "external links are replaced");
    assert.ok(!json.includes("youtube"), "videos are removed");
    assert.ok(!json.includes("fake@invented.com"), "invented contact details are removed");
    const urls = [...json.matchAll(/"url":"([^"]+)"/g)].map((match) => match[1]);
    assert.ok(urls.length > 0);
    assert.ok(urls.every((url) => images.some((image) => image.url === url)), "every image is from the media library");

    const home = site.pages[0]!.sections;
    assert.equal(home[0]!.type, "header");
    assert.equal(home.at(-1)!.type, "footer");
    const hero = home[1] as Extract<Section, { type: "hero" }>;
    assert.equal(hero.data.primaryCta?.href, "/contact");
    assert.equal(hero.data.image?.url, images[0]!.url);
    assert.equal(hero.data.backgroundImage, undefined);

    const gallery = home.find((section) => section.type === "gallery") as Extract<Section, { type: "gallery" }>;
    assert.deepEqual(gallery.data.images.map((image) => image?.url), [images[1]!.url]);
    assert.ok(!home.some((section) => section.type === "faq"), "a section without AI content is dropped");
    const about = site.pages[1]!.sections.find((section) => section.type === "split") as Extract<Section, { type: "split" }>;
    assert.equal(about.data.image?.url, images[0]!.url);
    assert.equal(about.data.image?.alt, images[0]!.alt, "an empty alt falls back to the library alt text");

    const contact = site.pages[2]!.sections.find((section) => section.type === "contact") as Extract<Section, { type: "contact" }>;
    assert.equal(contact.data.email, facts.contactEmail);
    assert.equal(contact.data.phone, undefined);

    assert.equal(site.theme.colors.primary, "#b45309");
    assert.equal(site.header.cta?.href, "/contact");
    assert.equal(site.header.logo?.url, images[1]!.url);
    assert.deepEqual(site.header.menu?.map((link) => link.href), ["/", "/about-us", "/contact"]);
    assert.equal(site.footer.contact?.email, facts.contactEmail);
  });

  it("keeps a chosen theme and skips the gallery without images", async () => {
    const calls: JsonCompletionRequest[] = [];
    const fixed = themes[0]!;
    const site = await generateSite({
      facts,
      brief: brief({ themeId: fixed.id, mediaIds: [], pages: ["Home"] }),
      images: [],
      logo: null,
      themes,
      complete: fakeCompletion(calls),
    });

    assert.deepEqual(site.theme, fixed.settings);
    assert.ok(!allSections(site.pages).some((section) => section.type === "gallery"));
    assert.ok(!JSON.stringify(site).includes('"url"'), "no images without media");
    assert.match(calls[1]!.messages[1]!.content, /No images are available/);
  });

  it("falls back to default sections when the plan is unusable", async () => {
    const site = await generateSite({
      facts,
      brief: brief({ pages: ["Home", "Services", "Services 2"] }),
      images: [],
      logo: null,
      themes,
      complete: async () => ({}),
    });

    assert.deepEqual(site.pages.map((page) => page.slug), ["/", "/services", "/services-2"]);
    for (const page of site.pages) {
      const body = page.sections.filter((section) => section.type !== "header" && section.type !== "footer");
      assert.deepEqual(body.map((section) => section.type), ["hero"], `${page.name} gets only a fallback hero, no demo copy`);
    }
  });
});
