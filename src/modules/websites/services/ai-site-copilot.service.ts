import { randomUUID } from "node:crypto";
import { PageType } from "../../../common/constants/website.js";
import { AppError } from "../../../common/errors/AppError.js";
import { prisma } from "../../../config/prisma.js";
import { MediaKind } from "../../../generated/prisma/enums.js";
import { aiSettingsService } from "../../admin-settings/services/ai-settings.service.js";
import type { GenerationBrief } from "../types/website-generation.types.js";
import type { PageView, WebsiteDetail } from "../types/website.types.js";
import type { AiSuggestionPayload, GenerateAiOptions, SectionEnvelope } from "./ai-generator.service.js";
import { createOpenAiJsonCompletion, type ChatMessage } from "./openai-json.client.js";
import {
  GENERATED_SECTION_TYPES,
  SECTION_GUIDE,
  cleanSection,
  describeFacts,
  describeImages,
  isGeneratedSectionType,
  type BriefImage,
  type CleanContext,
  type SiteFacts,
} from "./site-generator.js";
import { loadImages, toBriefImage } from "./website-generation.service.js";

/**
 * Editor chat for AI-built websites: grounded in the business details and the original brief,
 * so it rewrites copy, SEO and page structure for that business, not just styling.
 */

const INTENTS = ["chat", "edit_section", "add_section", "rewrite_page", "redesign_page", "update_seo"] as const;
type Intent = (typeof INTENTS)[number];

const MAX_LIBRARY_IMAGES = 24;
const MAX_REDESIGN_SECTIONS = 8;
/** Above this, page sections are summarized instead of sent in full. */
const MAX_PAGE_JSON_CHARS = 40_000;
const SEO_TITLE_MAX = 160;
const SEO_DESCRIPTION_MAX = 320;

type JsonRecord = Record<string, unknown>;

export type SiteCopilotOptions = Omit<GenerateAiOptions, "clientId" | "websiteId" | "userId"> & {
  website: WebsiteDetail;
  userId: string | null;
};

export type CopilotContext = {
  facts: SiteFacts;
  clean: CleanContext;
  page: PageView | null;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Image URLs and hrefs already on the page, so edits don't strip the owner's own media and links. */
function collectExisting(value: unknown, urls: Set<string>, hrefs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectExisting(item, urls, hrefs);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "url" && typeof child === "string" && child.trim()) urls.add(child.trim());
    else if (key === "href" && typeof child === "string" && child.trim()) hrefs.add(child.trim());
    else collectExisting(child, urls, hrefs);
  }
}

async function loadLibrary(clientId: string, briefIds: string[]): Promise<BriefImage[]> {
  const [briefImages, recent] = await Promise.all([
    loadImages(clientId, briefIds),
    prisma.mediaFile.findMany({
      where: { clientId, kind: MediaKind.IMAGE, id: { notIn: briefIds } },
      orderBy: { createdAt: "desc" },
      take: Math.max(0, MAX_LIBRARY_IMAGES - briefIds.length),
      select: { id: true, fileName: true, altText: true, width: true, height: true },
    }),
  ]);
  return [...briefImages, ...recent.map(toBriefImage)];
}

/**
 * The AI's changes may not introduce third-party media, invented ratings or contact details;
 * existing owner values survive because the delta is merged over the current data.
 */
function protectDelta(type: string, delta: JsonRecord, existing: JsonRecord, facts: SiteFacts): void {
  if (type === "hero") {
    for (const key of ["videoUrl", "backgroundVideoUrl", "trustedBy", "rating", "floatingCards", "mediaType"]) delete delta[key];
  }
  if (type === "team" && Array.isArray(delta.members)) {
    const previous = Array.isArray(existing.members) ? existing.members : [];
    delta.members = delta.members.map((member, index) => {
      if (!isRecord(member)) return member;
      const { socialLinks: _ignored, ...rest } = member;
      const before = previous[index];
      return isRecord(before) && before.socialLinks !== undefined ? { ...rest, socialLinks: before.socialLinks } : rest;
    });
  }
  if (type === "contact") {
    delete delta.channels;
    for (const [field, fact] of [
      ["email", facts.contactEmail],
      ["phone", facts.contactPhone],
      ["address", facts.address],
    ] as const) {
      if (field in delta && delta[field] !== existing[field] && delta[field] !== fact) delete delta[field];
    }
  }
}

function toEnvelope(section: unknown): SectionEnvelope {
  return section as SectionEnvelope;
}

/** Applies the AI's changes to an existing section; null when nothing valid came back. */
function mergeSection(existing: SectionEnvelope, raw: unknown, context: CopilotContext): SectionEnvelope | null {
  if (!isGeneratedSectionType(existing.type)) return null;
  const entry = isRecord(raw) ? raw : {};
  const delta = isRecord(entry.data) ? { ...entry.data } : {};
  if (Object.keys(delta).length === 0 && !isRecord(entry.settings)) return null;
  protectDelta(existing.type, delta, existing.data, context.facts);
  const cleaned = cleanSection(
    { type: existing.type, settings: entry.settings, data: { ...existing.data, ...delta } },
    existing.type,
    context.facts,
    context.clean,
    { id: existing.id, baseSettings: existing.settings, trusted: true },
  );
  return cleaned ? toEnvelope({ ...cleaned, hidden: existing.hidden }) : null;
}

function newSection(raw: unknown, context: CopilotContext): SectionEnvelope | null {
  const type = isRecord(raw) ? raw.type : undefined;
  if (!isGeneratedSectionType(type)) return null;
  const cleaned = cleanSection(raw, type, context.facts, context.clean);
  return cleaned ? toEnvelope(cleaned) : null;
}

function parseSeo(raw: unknown, page: PageView | null): AiSuggestionPayload["seo"] {
  if (!page || !isRecord(raw)) return undefined;
  const seoTitle = str(raw.title, SEO_TITLE_MAX);
  const seoDescription = str(raw.description, SEO_DESCRIPTION_MAX);
  if (!seoTitle && !seoDescription) return undefined;
  const next = { seoTitle: seoTitle || page.seoTitle || "", seoDescription: seoDescription || page.seoDescription || "" };
  if (next.seoTitle === (page.seoTitle ?? "") && next.seoDescription === (page.seoDescription ?? "")) return undefined;
  return { pageId: page.id, ...next };
}

function describeContact(facts: SiteFacts): string {
  const known = [
    facts.contactEmail ? `email ${facts.contactEmail}` : null,
    facts.contactPhone ? `phone ${facts.contactPhone}` : null,
    facts.address ? `address ${facts.address}` : null,
  ].filter(Boolean);
  return known.length > 0 ? known.join(", ") : "none on file";
}

function describeSite(website: WebsiteDetail, page: PageView | null): string {
  const pages = website.draft.pages.map((p) => `${p.name} -> ${p.slug}`).join(", ");
  const current = page
    ? `Current page: "${page.name}" (${page.slug}). SEO title: "${page.seoTitle ?? ""}". SEO description: "${page.seoDescription ?? ""}".`
    : "Current page: unknown (SEO can't be changed).";
  return `Site pages (name -> slug): ${pages}\n${current}`;
}

function systemPrompt(website: WebsiteDetail, brief: GenerationBrief | null, context: CopilotContext): string {
  return `You are the AI copilot inside the website editor of the business below. The website was generated by AI from the owner's business details, so every answer and every change must fit THIS business: its offer, customers, location and tone of voice. Focus on content that sells the business (headings, descriptions, services, offers, calls to action, FAQs, SEO) as much as on design.

BUSINESS
${describeFacts(context.facts, brief)}
Contact details on file: ${describeContact(context.facts)}. Never invent other contact details.

SITE
${describeSite(website, context.page)}

IMAGES
${describeImages(context.clean.images)}
Image URLs already used on the page may be kept as they are.

Choose exactly one intent:
- "chat": questions, advice, reviews or ideas. Answer in "chatReply" with concrete suggestions specific to this business (you may propose exact copy). Nothing on the page changes.
- "edit_section": change the selected section (only when one is selected). Return "section": { "settings"?, "data" } with the complete updated data; keep fields you don't change.
- "add_section": add one new section. Return "section": { "type", "settings", "data" }.
- "rewrite_page": change wording or content across the current page while keeping its layout. Return "sections": one entry per section you change: { "id", "data" } with complete updated data. Keep variants, images and structure unless asked.
- "redesign_page": rebuild the current page with 3 to ${MAX_REDESIGN_SECTIONS} new sections. Return "sections": [{ "type", "settings", "data" }].
- "update_seo": only the page's SEO.
With "rewrite_page", "redesign_page" and "update_seo" (and "edit_section" when the page's main message changes) also return "seo": { "title": up to 60 characters, "description": up to 155 characters } for the current page.

Rules:
- Write specific, credible, benefit-led copy for this business in its tone of voice. No lorem ipsum or generic filler.
- Don't invent awards, certifications, exact statistics or prices the owner didn't give; testimonials and team members are placeholders the owner will replace.
- Links: only the page slugs above or "#section" anchors.
- Section types you can create or edit: ${GENERATED_SECTION_TYPES.join(", ")}. Header, footer and other sections can't be changed here.
- If a request can't be done with these intents (e.g. the header menu, domain, publishing), use "chat" and explain where to do it in the editor.
- "summary": one short sentence telling the owner what you changed.
${SECTION_GUIDE}
Respond in JSON: { "intent", "summary", "chatReply"?, "section"?, "sections"?, "seo"? }`;
}

function pageForPrompt(sections: SectionEnvelope[]): string {
  const editable = sections.filter((section) => isGeneratedSectionType(section.type));
  const full = JSON.stringify(
    editable.map(({ id, type, settings, data }) => ({ id, type, settings: { background: settings.background }, data })),
  );
  if (full.length <= MAX_PAGE_JSON_CHARS) return full;
  return JSON.stringify(
    editable.map(({ id, type, data }) => ({ id, type, heading: typeof data.heading === "string" ? data.heading : "" })),
  );
}

function userPrompt(options: SiteCopilotOptions, selected: SectionEnvelope | null): string {
  const sections = options.currentSections ?? [];
  const others = sections.filter((section) => !isGeneratedSectionType(section.type)).map((section) => section.type);
  const selection = selected
    ? `Selected section: ${JSON.stringify({ id: selected.id, type: selected.type, settings: selected.settings, data: selected.data })}`
    : "Selected section: none (whole page)";
  return `Owner's request: ${options.prompt}

${selection}
Current page sections you can change: ${pageForPrompt(sections)}
Other sections on the page: ${others.length > 0 ? others.join(", ") : "none"}`;
}

function buildMessages(options: SiteCopilotOptions, system: string, user: string): ChatMessage[] {
  const history = (options.history ?? []).slice(-10).map((item) => ({ role: item.role, content: item.content.slice(0, 3000) }));
  return [{ role: "system", content: system }, ...history, { role: "user", content: user }];
}

function noChange(): AppError {
  return new AppError(502, "The AI couldn't produce a valid change for that. Try rephrasing your request.", "AI_NO_CHANGES");
}

export class AiSiteCopilotService {
  async generate(options: SiteCopilotOptions): Promise<AiSuggestionPayload> {
    const { website } = options;
    const selected = options.scope === "section" && options.currentSection ? options.currentSection : null;

    const [generation, { apiKey, model }] = await Promise.all([
      prisma.websiteGeneration.findUnique({ where: { websiteId: website.id }, select: { input: true } }),
      aiSettingsService.getCredentials(website.clientId),
    ]);
    if (!apiKey) {
      throw new AppError(503, "The AI assistant isn't available yet. Ask the administrator to set it up.", "AI_NOT_CONFIGURED");
    }
    const run = createOpenAiJsonCompletion({
      apiKey,
      model,
      clientId: website.clientId,
      websiteId: website.id,
      userId: options.userId,
    });

    const brief = (generation?.input as unknown as GenerationBrief | undefined) ?? null;
    const images = await loadLibrary(website.clientId, brief?.mediaIds ?? []);
    const context = buildCopilotContext(options, images);

    const raw = await run({
      messages: buildMessages(options, systemPrompt(website, brief, context), userPrompt(options, selected)),
      maxTokens: 8000,
      temperature: 0.7,
      scope: "site_copilot",
    });
    return toCopilotSuggestion(options, raw, context);
  }
}

export function buildCopilotContext(options: SiteCopilotOptions, images: BriefImage[]): CopilotContext {
  const { website } = options;
  const keepUrls = new Set<string>();
  const keepHrefs = new Set<string>();
  collectExisting(options.currentSections ?? [], keepUrls, keepHrefs);
  if (options.currentSection) collectExisting(options.currentSection, keepUrls, keepHrefs);

  const pages = website.draft.pages;
  const contactPage = pages.find((candidate) => candidate.pageType === PageType.CONTACT);
  return {
    facts: { name: website.name, ...website.info },
    clean: {
      images,
      slugs: new Set(pages.map((candidate) => candidate.slug)),
      fallbackHref: contactPage?.slug ?? "/",
      keepUrls,
      keepHrefs,
    },
    page: pages.find((candidate) => candidate.id === options.pageId) ?? null,
  };
}

/** Turns the AI reply into a reviewable suggestion; every section goes through the same clean-up as AI builds. */
export function toCopilotSuggestion(options: SiteCopilotOptions, raw: unknown, context: CopilotContext): AiSuggestionPayload {
  const selected = options.scope === "section" && options.currentSection ? options.currentSection : null;
  const reply = isRecord(raw) ? raw : {};
  const intent: Intent = (INTENTS as readonly string[]).includes(reply.intent as string) ? (reply.intent as Intent) : "chat";
  const summary = str(reply.summary, 300) || "Here's my suggestion.";
  const seo = parseSeo(reply.seo, context.page);
  const sections = options.currentSections ?? [];
  const base = { id: randomUUID(), prompt: options.prompt, summary };
  const chat = (text: string): AiSuggestionPayload => ({
    ...base,
    chatReply: text || summary,
    target: { scope: "chat" },
    before: [],
    after: [],
  });

  switch (intent) {
    case "edit_section": {
      if (!selected) return chat(str(reply.chatReply, 4000));
      const updated = mergeSection(selected, reply.section, context);
      if (!updated) throw noChange();
      return { ...base, target: { scope: "section", sectionId: selected.id }, before: [selected], after: [updated], seo };
    }
    case "add_section": {
      const created = newSection(reply.section, context);
      if (!created) throw noChange();
      const footerIdx = sections.findIndex((section) => section.type === "footer");
      const insertAt = footerIdx === -1 ? sections.length : footerIdx;
      const after = [...sections.slice(0, insertAt), created, ...sections.slice(insertAt)];
      return { ...base, target: { scope: "page", rebuild: false, focusSectionId: created.id }, before: sections, after, seo };
    }
    case "rewrite_page": {
      const entries = Array.isArray(reply.sections) ? reply.sections.filter(isRecord) : [];
      let changed = 0;
      let focusSectionId: string | undefined;
      const after = sections.map((section) => {
        const entry = entries.find((candidate) => candidate.id === section.id);
        const updated = entry ? mergeSection(section, entry, context) : null;
        if (!updated || JSON.stringify(updated) === JSON.stringify(section)) return section;
        changed++;
        focusSectionId ??= updated.id;
        return updated;
      });
      if (changed === 0 && !seo) throw noChange();
      return { ...base, target: { scope: "page", rebuild: false, focusSectionId }, before: sections, after, seo };
    }
    case "redesign_page": {
      const rawSections = Array.isArray(reply.sections) ? reply.sections.slice(0, MAX_REDESIGN_SECTIONS) : [];
      const body = rawSections.map((item) => newSection(item, context)).filter((item): item is SectionEnvelope => item !== null);
      if (body.length === 0) throw noChange();
      const headers = sections.filter((section) => section.type === "header");
      const footers = sections.filter((section) => section.type === "footer");
      return { ...base, target: { scope: "page", rebuild: true }, before: sections, after: [...headers, ...body, ...footers], seo };
    }
    case "update_seo": {
      if (!seo) return chat(str(reply.chatReply, 4000));
      return { ...base, target: { scope: "page", rebuild: false }, before: sections, after: sections, seo };
    }
    default:
      return chat(str(reply.chatReply, 4000));
  }
}

export const aiSiteCopilotService = new AiSiteCopilotService();
