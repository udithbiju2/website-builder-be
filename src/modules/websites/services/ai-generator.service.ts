import { env } from "../../../config/env.js";
import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";
import { AppError } from "../../../common/errors/AppError.js";
import crypto from "crypto";

export type AiGenerateScope = "section" | "page";

export type SectionEnvelope = {
  id: string;
  type: string;
  hidden: boolean;
  settings: Record<string, unknown>;
  data: Record<string, unknown>;
};

export type AiSuggestionPayload = {
  id: string;
  prompt: string;
  summary: string;
  chatReply?: string;
  target:
    | { scope: "chat" }
    | { scope: "section"; sectionId: string }
    | { scope: "section_add"; sectionType: string }
    | { scope: "page" };
  before: SectionEnvelope[];
  after: SectionEnvelope[];
  /** Proposed SEO for the current page; applied together with the section changes. */
  seo?: { pageId: string; seoTitle: string; seoDescription: string };
};

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GenerateAiOptions = {
  prompt: string;
  scope: AiGenerateScope;
  sectionId?: string;
  currentSection?: SectionEnvelope;
  currentSections?: SectionEnvelope[];
  history?: ChatHistoryMessage[];
  /** Page open in the editor. */
  pageId?: string;
  clientId?: string;
  websiteId?: string;
  userId?: string;
};

const COLOR_MAP: Record<string, string> = {
  red: "#dc2626",
  darkred: "#991b1b",
  lightred: "#f87171",
  blue: "#2563eb",
  darkblue: "#1e3a8a",
  lightblue: "#60a5fa",
  green: "#16a34a",
  darkgreen: "#14532d",
  emerald: "#059669",
  teal: "#0d9488",
  cyan: "#0891b2",
  purple: "#9333ea",
  violet: "#7c3aed",
  indigo: "#4f46e5",
  pink: "#db2777",
  yellow: "#ca8a04",
  orange: "#ea580c",
  amber: "#d97706",
  black: "#000000",
  white: "#ffffff",
  gray: "#4b5563",
  darkgray: "#1f2937",
  slate: "#0f172a",
  zinc: "#18181b",
};

export function sanitizeHexColor(val: unknown): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed.split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const cleanKey = trimmed.replace(/[^a-z]/g, "");
  return COLOR_MAP[cleanKey];
}

export function sanitizeSectionSettings(rawSettings: Record<string, unknown> = {}): Record<string, unknown> {
  const result: Record<string, unknown> = {
    background: "default",
    hideOnMobile: false,
    spacing: "default",
    align: "center",
    ...rawSettings,
  };

  const validBackgrounds = ["default", "surface", "primary", "dark"];
  if (typeof result.background === "string") {
    if (!validBackgrounds.includes(result.background)) {
      const hex = sanitizeHexColor(result.background);
      if (hex) {
        const existingCustom =
          typeof result.customColors === "object" && result.customColors !== null
            ? (result.customColors as Record<string, unknown>)
            : {};
        result.customColors = {
          ...existingCustom,
          background: hex,
        };
      }
      result.background = "default";
    }
  } else {
    result.background = "default";
  }

  // Clean customColors
  if (typeof result.customColors === "object" && result.customColors !== null) {
    const rawCustom = result.customColors as Record<string, unknown>;
    const cleanCustom: Record<string, string> = {};
    for (const key of ["background", "text", "primary", "muted", "border"] as const) {
      const hex = sanitizeHexColor(rawCustom[key]);
      if (hex) {
        cleanCustom[key] = hex;
      }
    }
    result.customColors = Object.keys(cleanCustom).length > 0 ? cleanCustom : undefined;
  } else {
    delete result.customColors;
  }

  return result;
}

export function sanitizeSectionData(type: string, rawData: Record<string, unknown> = {}): Record<string, unknown> {
  const data = { ...rawData };

  // Normalize common top-level synonyms
  if (data.title && !data.heading) {
    data.heading = data.title;
  }
  if (data.subtitle && !data.subheading) {
    data.subheading = data.subtitle;
  }
  if (data.subtitle && !data.intro) {
    data.intro = data.subtitle;
  }
  if (data.description && !data.intro && type !== "hero") {
    data.intro = data.description;
  }

  // Normalize string image URLs to { url, alt } objects, and strip empty images
  if (typeof data.backgroundImage === "string") {
    data.backgroundImage = data.backgroundImage.trim()
      ? { url: data.backgroundImage.trim(), alt: "Hero Background" }
      : undefined;
  }
  if (data.backgroundImage && typeof data.backgroundImage === "object") {
    const bg = data.backgroundImage as Record<string, unknown>;
    if (!bg.url || typeof bg.url !== "string" || !bg.url.trim()) {
      delete data.backgroundImage;
    } else {
      bg.url = (bg.url as string).trim();
      bg.alt = typeof bg.alt === "string" ? bg.alt : "Hero Background";
    }
  }

  if (typeof data.image === "string") {
    data.image = data.image.trim() ? { url: data.image.trim(), alt: "Image" } : undefined;
  }
  if (data.image && typeof data.image === "object") {
    const img = data.image as Record<string, unknown>;
    if (!img.url || typeof img.url !== "string" || !img.url.trim()) {
      delete data.image;
    } else {
      img.url = (img.url as string).trim();
      img.alt = typeof img.alt === "string" ? img.alt : "Image";
    }
  }

  if (data.secondaryImage && typeof data.secondaryImage === "object") {
    const img = data.secondaryImage as Record<string, unknown>;
    if (!img.url || typeof img.url !== "string" || !img.url.trim()) {
      delete data.secondaryImage;
    }
  }

  // Sanitize links and cta
  if (data.primaryCta && typeof data.primaryCta === "object") {
    const cta = data.primaryCta as Record<string, unknown>;
    if (!cta.href || typeof cta.href !== "string" || !cta.href.trim()) {
      cta.href = "/contact";
    }
    if (!cta.label || typeof cta.label !== "string" || !cta.label.trim()) {
      cta.label = "Get Started";
    }
  }
  if (data.secondaryCta && typeof data.secondaryCta === "object") {
    const cta = data.secondaryCta as Record<string, unknown>;
    if (!cta.href || typeof cta.href !== "string" || !cta.href.trim() || !cta.label || typeof cta.label !== "string" || !cta.label.trim()) {
      delete data.secondaryCta;
    }
  }

  switch (type) {
    case "pricing": {
      const validPricingVariants = ["cards-grid", "minimal-monochrome", "spotlight-tier", "horizontal-rows"];
      if (typeof data.variant !== "string" || !validPricingVariants.includes(data.variant)) {
        data.variant = "cards-grid";
      }
      if (!data.heading) data.heading = "Transparent, flexible pricing";

      // AI might return tiers instead of plans
      const rawPlans = Array.isArray(data.plans) ? data.plans : Array.isArray(data.tiers) ? data.tiers : [];
      if (rawPlans.length > 0) {
        data.plans = rawPlans.map((p: any, idx: number) => ({
          name: typeof p?.name === "string" ? p.name : `Plan ${idx + 1}`,
          price: typeof p?.price === "string" ? p.price : "$29",
          period: typeof p?.period === "string" ? p.period : typeof p?.interval === "string" ? p.interval : "/mo",
          originalPrice: typeof p?.originalPrice === "string" ? p.originalPrice : undefined,
          badge: typeof p?.badge === "string" ? p.badge : undefined,
          description: typeof p?.description === "string" ? p.description : "",
          features: Array.isArray(p?.features) ? p.features.map(String) : ["All core features included"],
          excludedFeatures: Array.isArray(p?.excludedFeatures) ? p.excludedFeatures.map(String) : undefined,
          cta: p?.cta && typeof p.cta === "object" ? p.cta : p?.button && typeof p.button === "object" ? p.button : { label: "Get started", href: "/contact" },
          featured: Boolean(p?.featured ?? p?.highlighted ?? idx === 1),
          highlightNote: typeof p?.highlightNote === "string" ? p.highlightNote : undefined,
        }));
      } else {
        data.plans = [
          {
            name: "Starter",
            price: "$29",
            period: "/mo",
            description: "For individuals & emerging projects",
            features: ["Up to 5 team members", "Standard analytics", "Community support"],
            featured: false,
            cta: { label: "Start Free Trial", href: "/contact" },
          },
          {
            name: "Professional",
            price: "$79",
            period: "/mo",
            badge: "Most Popular",
            description: "For fast-scaling teams & modern businesses",
            features: ["Unlimited projects", "Advanced AI tools", "24/7 Priority support", "Custom integrations"],
            featured: true,
            cta: { label: "Get Started", href: "/contact" },
          },
          {
            name: "Enterprise",
            price: "$199",
            period: "/mo",
            description: "For established organizations with custom needs",
            features: ["Dedicated account manager", "Custom SLA & security", "SSO & SAML", "Unlimited capacity"],
            featured: false,
            cta: { label: "Contact Sales", href: "/contact" },
          },
        ];
      }
      break;
    }

    case "cta": {
      const validCtaVariants = ["centered-card", "split-visual", "floating-card", "minimal-editorial"];
      if (typeof data.variant !== "string" || !validCtaVariants.includes(data.variant)) {
        data.variant = "centered-card";
      }
      if (!data.heading) data.heading = "Ready to elevate your workflow?";
      if (!data.text && data.description) data.text = data.description;
      if (!data.text) data.text = "Join thousands of satisfied teams building better web experiences today.";
      const rawBtn = data.button || data.primaryButton || data.cta;
      if (!rawBtn || typeof (rawBtn as Record<string, unknown>)?.label !== "string") {
        data.button = { label: "Get Started Today", href: "/contact" };
      } else {
        data.button = rawBtn;
      }
      break;
    }

    case "features": {
      const validFeaturesVariants = ["grid", "split", "pastel-icons", "minimal", "cards"];
      if (typeof data.variant !== "string" || !validFeaturesVariants.includes(data.variant)) {
        data.variant = "pastel-icons";
      }
      if (!data.heading) data.heading = "Engineered for high performance";
      if (!Array.isArray(data.items) || data.items.length === 0) {
        data.items = [
          { icon: "bolt", iconColor: "orange", title: "Blazing Fast Speed", description: "Optimized for lightning-quick interaction and responsiveness." },
          { icon: "shield", iconColor: "green", title: "Enterprise Security", description: "End-to-end encryption with advanced privacy protocols." },
          { icon: "sparkles", iconColor: "purple", title: "Next-Gen AI", description: "Built-in intelligent automation tailored to your exact needs." },
        ];
      } else {
        data.items = (data.items as any[]).map((item, idx) => ({
          title: typeof item?.title === "string" ? item.title : `Feature ${idx + 1}`,
          description: typeof item?.description === "string" ? item.description : "High-impact capabilities designed for modern growth.",
          icon: typeof item?.icon === "string" ? item.icon : "sparkles",
          iconColor: typeof item?.iconColor === "string" ? item.iconColor : "purple",
          badge: typeof item?.badge === "string" ? item.badge : undefined,
        }));
      }
      if (!data.columns) data.columns = 3;
      if (!data.mobileColumns) data.mobileColumns = 1;
      break;
    }

    case "services": {
      const validServicesVariants = ["cards-grid", "bento-grid", "split-showcase", "interactive-list", "horizontal-cards", "minimal-numbered"];
      if (typeof data.variant !== "string" || !validServicesVariants.includes(data.variant)) {
        data.variant = "cards-grid";
      }
      if (!data.heading) data.heading = "Our Core Solutions";
      if (!Array.isArray(data.items) || data.items.length === 0) {
        data.items = [
          { title: "Strategic Architecture", description: "Comprehensive roadmap and blueprinting tailored to business scale." },
          { title: "End-to-End Implementation", description: "Pixel-perfect delivery with clean, production-ready engineering." },
          { title: "24/7 Managed Growth", description: "Continuous optimization, performance monitoring, and proactive support." },
        ];
      }
      if (!data.columns) data.columns = 3;
      if (!data.mobileColumns) data.mobileColumns = 1;
      break;
    }

    case "hero": {
      const validHeroVariants = ["centered", "split", "split-left", "background-image", "video-bg", "gradient", "curved-bottom", "soft-card", "minimal-typography", "floating-cards", "asymmetric"];
      if (typeof data.variant !== "string" || !validHeroVariants.includes(data.variant)) {
        data.variant = data.backgroundImage ? "background-image" : "centered";
      }
      const validImagePositions = ["right", "left", "bottom", "background", "card"];
      if (data.imagePosition && !validImagePositions.includes(data.imagePosition as string)) {
        delete data.imagePosition;
      }
      const validBgPositions = ["bottom", "center", "top", "cover"];
      if (data.bgImagePosition && !validBgPositions.includes(data.bgImagePosition as string)) {
        delete data.bgImagePosition;
      }
      const validBgOverlays = ["dark", "light", "gradient", "none"];
      if (data.bgOverlayType && !validBgOverlays.includes(data.bgOverlayType as string)) {
        delete data.bgOverlayType;
      }
      const validImageStyles = ["mockup", "rounded", "glow", "shadow", "plain"];
      if (data.imageStyle && !validImageStyles.includes(data.imageStyle as string)) {
        delete data.imageStyle;
      }
      const validMinHeights = ["auto", "compact", "screen", "tall"];
      if (data.minHeight && !validMinHeights.includes(data.minHeight as string)) {
        delete data.minHeight;
      }
      const validAligns = ["center", "left", "right"];
      if (data.contentAlign && !validAligns.includes(data.contentAlign as string)) {
        delete data.contentAlign;
      }
      const validBottomShapes = ["none", "wave", "curve", "slant", "tilt"];
      if (data.bottomShape && !validBottomShapes.includes(data.bottomShape as string)) {
        delete data.bottomShape;
      }
      if (!data.heading) data.heading = "Transform Your Digital Vision";
      if (!data.primaryCta || typeof (data.primaryCta as Record<string, unknown>)?.label !== "string") {
        data.primaryCta = { label: "Get Started", href: "/contact" };
      }
      break;
    }

    case "faq": {
      const validFaqVariants = ["accordion-classic", "two-column-grid", "split-sidebar", "minimal-numbered", "categorized-cards"];
      if (typeof data.variant !== "string" || !validFaqVariants.includes(data.variant)) {
        data.variant = "accordion-classic";
      }
      if (!data.heading) data.heading = "Frequently Asked Questions";
      if (!Array.isArray(data.items) || data.items.length === 0) {
        data.items = [
          { question: "How quickly can we get started?", answer: "You can start immediately with our intuitive builder and 1-click publishing." },
          { question: "Can I customize the sections later?", answer: "Yes, every single block, color, and typography style is fully customizable." },
          { question: "Is support included?", answer: "Our dedicated engineering support team is available 24/7 for all tiers." },
        ];
      }
      break;
    }

    case "testimonials": {
      if (!data.heading) data.heading = "Loved by Industry Leaders";
      if (!Array.isArray(data.items) || data.items.length === 0) {
        data.items = [
          { quote: "This platform completely revolutionized our digital presence in days.", name: "Sarah Jenkins", role: "VP of Product, Apex Digital" },
          { quote: "The speed, aesthetic quality, and precision are truly second to none.", name: "David Chen", role: "Founder & CTO, Nexus AI" },
        ];
      }
      break;
    }

    case "team": {
      const validTeamVariants = ["grid-cards", "spotlight-featured", "minimal-editorial", "glass-overlay"];
      if (typeof data.variant !== "string" || !validTeamVariants.includes(data.variant)) {
        data.variant = "grid-cards";
      }
      if (!data.heading) data.heading = "Meet the Minds Behind the Platform";
      if (!data.columns) data.columns = 3;
      if (!data.mobileColumns) data.mobileColumns = 1;
      break;
    }

    case "header": {
      const validHeaderDesigns = ["logo-left", "centered", "classical", "minimalist", "comprehensive", "ecommerce", "floating", "transparent"];
      if (typeof data.design !== "string" || !validHeaderDesigns.includes(data.design)) {
        data.design = "logo-left";
      }
      if (!data.siteName) {
        data.siteName = "Brand";
      }
      if (!Array.isArray(data.menu) || data.menu.length === 0) {
        data.menu = [
          { label: "Solutions", href: "#features" },
          { label: "Features", href: "#features" },
          { label: "Pricing", href: "#pricing" },
          { label: "About", href: "#about" },
        ];
      } else {
        // Cap menu items at 5 to prevent header overflow and ensure clean spacing
        data.menu = (data.menu as Array<{ label?: string; href?: string }>).slice(0, 5).map((m, idx) => ({
          label: typeof m?.label === "string" && m.label.trim() ? m.label.trim() : `Link ${idx + 1}`,
          href: typeof m?.href === "string" && m.href.trim() ? m.href.trim() : "#",
        }));
      }
      if (!data.cta || typeof (data.cta as Record<string, unknown>)?.label !== "string") {
        data.cta = { label: "Get Started", href: "/contact" };
      }
      data.sticky = Boolean(data.sticky);
      break;
    }

    case "footer": {
      const validFooterDesigns = ["columns", "simple", "mega", "newsletter", "split", "inline", "centered", "cta-banner"];
      if (typeof data.design !== "string" || !validFooterDesigns.includes(data.design)) {
        data.design = "columns";
      }
      if (!data.siteName) {
        data.siteName = "Brand";
      }
      if (!Array.isArray(data.columns) || data.columns.length === 0) {
        data.columns = [
          { title: "Product", links: [{ label: "Features", href: "#features" }, { label: "Pricing", href: "#pricing" }] },
          { title: "Company", links: [{ label: "About", href: "#about" }, { label: "Contact", href: "#contact" }] },
        ];
      }
      if (!data.copyright) {
        data.copyright = `© ${new Date().getFullYear()} ${data.siteName || "Company"}. All rights reserved.`;
      }
      break;
    }
  }

  return data;
}

const SECTION_SCHEMAS_GUIDE = `
VALID SECTION SCHEMAS & EXACT FIELD KEYS:
1. "hero":
   data: {
     "variant": "background-image"|"centered"|"split"|"split-left"|"gradient"|"soft-card"|"floating-cards"|"asymmetric",
     "heading": "...",
     "highlightText": "...",
     "subheading": "...",
     "description": "...",
     "eyebrow": "...",
     "badgeIcon": "...",
     "primaryCta": { "label": "Get Started", "href": "/contact" },
     "secondaryCta": { "label": "Learn More", "href": "#features" },
     "image": { "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80", "alt": "Product preview" },
     "backgroundImage": { "url": "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=2000&q=80", "alt": "Hero Background" },
     "imagePosition": "background"|"right"|"left"|"bottom"|"card",
     "bgImagePosition": "cover"|"center"|"top"|"bottom",
     "bgOverlayType": "dark"|"gradient"|"light"|"none",
     "overlayOpacity": 50,
     "overlayBlur": false,
     "minHeight": "screen"|"tall"|"compact"|"auto",
     "contentAlign": "center"|"left"|"right"
   }
2. "features":
   data: { "variant": "pastel-icons"|"grid"|"split"|"cards"|"minimal", "heading": "...", "intro": "...", "columns": 3, "items": [ { "icon": "bolt"|"star"|"shield"|"rocket"|"layers"|"sparkles"|"check", "iconColor": "orange"|"green"|"yellow"|"cyan"|"purple", "title": "...", "description": "...", "badge": "..." } ] }
3. "services":
   data: { "variant": "cards-grid"|"bento-grid"|"split-showcase"|"interactive-list"|"horizontal-cards"|"minimal-numbered", "heading": "...", "intro": "...", "columns": 3, "items": [ { "title": "...", "description": "...", "badge": "...", "features": ["..."] } ] }
4. "stats":
   data: { "heading": "...", "items": [ { "value": "99.9%", "label": "Uptime Guarantee" } ] }
5. "pricing":
   data: {
     "variant": "cards-grid"|"minimal-monochrome"|"spotlight-tier"|"horizontal-rows",
     "heading": "...",
     "intro": "...",
     "plans": [
       { "name": "Starter", "price": "$29", "period": "/mo", "badge": "Popular", "featured": true, "features": ["Feature 1", "Feature 2"], "cta": { "label": "Get started", "href": "/contact" } }
     ]
   }
6. "testimonials":
   data: { "heading": "...", "items": [ { "quote": "...", "name": "...", "role": "..." } ] }
7. "team":
   data: { "variant": "grid-cards"|"spotlight-featured"|"minimal-editorial"|"glass-overlay", "heading": "...", "intro": "...", "columns": 3, "members": [ { "name": "...", "role": "...", "bio": "...", "avatar": { "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80", "alt": "Team Member" } } ] }
8. "marquee":
   data: { "variant": "gradient-pill", "speed": "normal", "direction": "left", "items": [ { "text": "...", "badge": "..." } ] }
9. "carousel":
   data: { "variant": "hero-slider", "autoplay": true, "slides": [ { "title": "...", "subtitle": "...", "description": "..." } ] }
10. "faq":
   data: { "variant": "accordion-classic"|"two-column-grid"|"split-sidebar"|"minimal-numbered"|"categorized-cards", "heading": "...", "intro": "...", "items": [ { "question": "...", "answer": "..." } ] }
11. "cta":
   data: { "variant": "centered-card"|"split-visual"|"floating-card"|"minimal-editorial", "heading": "...", "text": "...", "button": { "label": "Get started", "href": "/contact" } }
12. "header":
   data: { "design": "logo-left"|"centered"|"classical"|"minimalist"|"floating", "siteName": "...", "menu": [ { "label": "Home", "href": "/" }, { "label": "About", "href": "/about" } ], "sticky": false }
   settings: { "customColors": { "background": "#rrggbb" } }

STOCK / DUMMY IMAGE GUIDELINES:
- Tech / Dark Hero: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80"
- Modern Architecture / Living: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80"
- Vibrant Gradient: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=2000&q=80"
- SaaS Dashboard / Analytics: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"
`;

const SYSTEM_PROMPT_ADD_SECTION = `You are a world-class AI website copywriter and UI designer.
Your job is to generate a single brand new, pixel-perfect website section based on user instructions.

CRITICAL RULES:
1. Always output ONLY valid JSON without Markdown code fences.
2. Provide rich, highly converting, realistic copy. Never use placeholder text.
${SECTION_SCHEMAS_GUIDE}
3. Output format must be:
{
  "summary": "Brief 1-sentence summary of the new section created",
  "type": "header"|"footer"|"hero"|"features"|"services"|"pricing"|"testimonials"|"faq"|"cta"|"team"|"marquee"|"carousel"|"stats",
  "settings": { "background": "default", "hideOnMobile": false, "spacing": "default" },
  "data": { ... }
}`;

const SYSTEM_PROMPT_SECTION_EDIT = `You are a world-class AI website copywriter and UI designer for a modern 2026 website builder.
Your job is to update content, images, background media, or styling for an existing single website section based on user instructions.

CRITICAL RULES:
1. Always output ONLY valid JSON without Markdown code fences, conforming strictly to the requested schema.
2. Provide compelling, conversion-focused, modern copy. Do NOT use placeholder text.
3. SECTION SETTINGS & COLOR RULES:
   - "settings.background" MUST only be one of: "default", "surface", "primary", "dark".
   - If the user specifies a specific custom color (e.g. "red", "purple", "navy", "green", "black"), put it in "settings.customColors.background" as a valid 6-digit hex string (e.g. "#dc2626", "#7c3aed", "#0f172a", "#16a34a", "#000000").
4. BACKGROUND IMAGES & DUMMY IMAGES:
   - If the user asks to add a background image, cover image, or dummy image to this section, supply a valid Unsplash photo URL in "data.backgroundImage" (or "data.image"), and set appropriate "imagePosition": "background", "variant": "background-image", "bgImagePosition": "cover", "bgOverlayType": "dark", "overlayOpacity": 50.
${SECTION_SCHEMAS_GUIDE}
5. Output format must be:
{
  "summary": "Brief 1-sentence summary of what was changed",
  "data": { ...updated section data object... },
  "settings": {
    "background": "default"|"surface"|"primary"|"dark",
    "customColors": {
      "background": "#rrggbb",
      "text": "#rrggbb"
    }
  }
}`;

const SYSTEM_PROMPT_PAGE = `You are a world-class AI website designer, conversion copywriter, and assistant for a modern 2026 website builder.
Your job is to analyze the user prompt and either answer conversationally or generate/redesign page sections.

MODE A: CONVERSATIONAL / QUESTION / GREETINGS / ADVICE / FEEDBACK (e.g. "hi", "hello", "what can you do?", "how do I change colors?", "is my hero section good?", "give me tips for a bakery site"):
Output JSON:
{
  "intent": "chat",
  "summary": "AI Copilot Response",
  "chatReply": "Direct, helpful, friendly answer addressing the user's question or greeting without modifying their canvas."
}

MODE B: PAGE CREATION / FULL PAGE REDESIGN / OVERHAUL (e.g. "Build an AI SaaS landing page", "Redesign page in dark luxury style", "Create a gym website with pricing"):
Output JSON:
{
  "intent": "page",
  "summary": "Brief 1-sentence summary of the page generated",
  "sections": [
    {
      "type": "hero"|"features"|"services"|"pricing"|"testimonials"|"faq"|"cta"|"team"|"marquee"|"carousel"|"stats",
      "settings": { "background": "default"|"surface"|"primary"|"dark", "hideOnMobile": false, "spacing": "default"|"relaxed" },
      "data": { ... }
    }
  ]
}

CRITICAL RULES:
1. Always output ONLY valid JSON without Markdown code fences.
2. If the user is asking a question, greeting, or inquiring without explicitly asking to build/create/redesign/generate sections, set "intent": "chat" and provide a helpful "chatReply". DO NOT generate random sections.
3. For page generation, output 4 to 6 rich, high-converting sections (excluding header and footer).
${SECTION_SCHEMAS_GUIDE}`;

const SECTION_KEYWORDS: Record<string, string> = {
  header: "header",
  haeder: "header",
  haedrr: "header",
  haedr: "header",
  headrr: "header",
  headr: "header",
  hedar: "header",
  heder: "header",
  headdr: "header",
  heddr: "header",
  hadder: "header",
  haedd: "header",
  navbar: "header",
  navba: "header",
  navbr: "header",
  nav: "header",
  menu: "header",
  footer: "footer",
  footr: "footer",
  foter: "footer",
  fotter: "footer",
  footerr: "footer",
  foot: "footer",
  copyright: "footer",
  hero: "hero",
  banner: "hero",
  headline: "hero",
  herosection: "hero",
  feature: "features",
  features: "features",
  faeture: "features",
  faetures: "features",
  feautre: "features",
  feautres: "features",
  feture: "features",
  fetures: "features",
  featurs: "features",
  service: "services",
  services: "services",
  servce: "services",
  servces: "services",
  servise: "services",
  servises: "services",
  pricing: "pricing",
  price: "pricing",
  prices: "pricing",
  plan: "pricing",
  plans: "pricing",
  pricng: "pricing",
  testimonial: "testimonials",
  testimonials: "testimonials",
  testimonal: "testimonials",
  testimonals: "testimonials",
  review: "testimonials",
  reviews: "testimonials",
  faq: "faq",
  faqs: "faq",
  question: "faq",
  questions: "faq",
  team: "team",
  members: "team",
  aboutus: "team",
  marquee: "marquee",
  ticker: "marquee",
  carousel: "carousel",
  slider: "carousel",
  slide: "carousel",
  slides: "carousel",
  cta: "cta",
  action: "cta",
  calltoaction: "cta",
  contact: "contact",
  form: "contact",
  stat: "stats",
  stats: "stats",
  numbers: "stats",
};

import { aiSettingsService } from "../../admin-settings/services/ai-settings.service.js";

export class AiGeneratorService {
  /**
   * Calls OpenAI Chat Completions API using native fetch.
   */
  private async callOpenAi(
    messages: { role: "system" | "user" | "assistant"; content: string }[],
    temperature = 0.7,
    loggingContext?: { clientId?: string; websiteId?: string; userId?: string; scope?: string },
  ): Promise<string> {
    const { apiKey, model } = await aiSettingsService.getCredentials();
    if (!apiKey) {
      throw new AppError(
        400,
        "OpenAI API key is not configured. Please add your OpenAI API key in Super Admin Settings > AI Settings.",
      );
    }

    // OpenAI response_format json_object requires the string 'json' somewhere in the prompt/messages
    const hasJsonWord = messages.some((m) => m.content.toLowerCase().includes("json"));
    const safeMessages = hasJsonWord
      ? messages
      : messages.map((m, idx) =>
          idx === 0
            ? { ...m, content: `${m.content}\n\nIMPORTANT: Respond strictly in valid JSON format.` }
            : m,
        );

    const startMs = Date.now();
    const effectiveModel = model || "gpt-4o-mini";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: effectiveModel,
        messages: safeMessages,
        temperature,
        response_format: { type: "json_object" },
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `OpenAI API returned status ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMsg = errorJson.error.message;
        }
      } catch {
        // use default errorMsg
      }

      if (response.status === 401) {
        throw new AppError(
          401,
          `Invalid OpenAI API Key (${errorMsg}). Please paste your valid OpenAI API key in Super Admin > Settings > AI Settings.`
        );
      }
      if (response.status === 429) {
        throw new AppError(
          429,
          `OpenAI Rate Limit or Quota Exceeded (${errorMsg}). Please check your OpenAI account credits or update your key in Super Admin > Settings > AI Settings.`
        );
      }

      throw new AppError(502, `AI Generation Failed: ${errorMsg}`);
    }

    const json = (await response.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new AppError(502, "OpenAI returned an empty response");
    }

    if (loggingContext?.clientId) {
      const durationMs = Date.now() - startMs;
      prisma.aiUsageLog
        .create({
          data: {
            clientId: loggingContext.clientId,
            websiteId: loggingContext.websiteId || null,
            userId: loggingContext.userId || null,
            model: json.model || effectiveModel,
            scope: loggingContext.scope || "section",
            promptTokens: json.usage?.prompt_tokens ?? 0,
            completionTokens: json.usage?.completion_tokens ?? 0,
            totalTokens: json.usage?.total_tokens ?? 0,
            durationMs,
          },
        })
        .catch((err) => {
          logger.error({ err, clientId: loggingContext.clientId }, "Failed to record AI usage log");
        });
    }

    return content;
  }

  /**
   * Generates AI suggestion for a single section, adding a section, or full page.
   */
  async generate(options: GenerateAiOptions): Promise<AiSuggestionPayload> {
    const {
      prompt,
      scope,
      sectionId,
      currentSection,
      currentSections = [],
      history = [],
      clientId,
      websiteId,
      userId,
    } = options;
    const loggingContext = { clientId, websiteId, userId, scope };
    const lowerPrompt = prompt.toLowerCase().trim();

    // Fast handling for common greetings
    const GREETING_REGEX = /^(hi|hello|hey|greetings|hola|good\s+(morning|afternoon|evening)|sup|yo|test|howdy)[\s!.]*$/i;
    const HELP_QUESTION_REGEX = /^(who\s+are\s+you|what\s+can\s+you\s+do|how\s+(does\s+this\s+work|to\s+use|can\s+i\s+use|do\s+i)|help me|help)[\s?!.]*$/i;

    if (GREETING_REGEX.test(lowerPrompt)) {
      return {
        id: crypto.randomUUID(),
        prompt,
        summary: "Hello! I am your AI Website Copilot.",
        chatReply: "Hello! I am your AI Website Copilot.\n\nHere are some things you can ask me to do:\n• Generate a full landing page (e.g. 'Build an AI SaaS landing page')\n• Add a new section (e.g. 'Add a 3-tier pricing table')\n• Click any section on the canvas to customize its copy, style, or background.",
        target: { scope: "chat" },
        before: [],
        after: [],
      };
    }

    if (HELP_QUESTION_REGEX.test(lowerPrompt)) {
      return {
        id: crypto.randomUUID(),
        prompt,
        summary: "AI Website Copilot Guide",
        chatReply: "I can help you build and refine your website:\n\n1. Whole Page Mode: Ask to build a full page (e.g. 'Modern AI SaaS', 'Luxury Agency', 'Bakery Shop').\n2. Section Editing: Click on any section on the canvas to edit its copy, colors, or images.\n3. Add Sections: Ask to 'Add FAQ section' or 'Insert team members'.\n4. Live Previews: Every generation includes a visual live preview with Accept / Reject controls.",
        target: { scope: "chat" },
        before: [],
        after: [],
      };
    }

    // Helper to build OpenAI message chain with up to 10 previous conversation turns
    const buildMessages = (systemPrompt: string, userPromptText: string) => {
      const msgs: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
      ];

      if (Array.isArray(history) && history.length > 0) {
        const recentHistory = history.slice(-10);
        for (const item of recentHistory) {
          if (item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string") {
            msgs.push({
              role: item.role,
              content: item.content,
            });
          }
        }
      }

      msgs.push({ role: "user", content: userPromptText });
      return msgs;
    };

    // Check if a specific section type is mentioned in the prompt (with typo tolerance)
    let requestedSectionType: string | null = null;
    for (const [kw, stype] of Object.entries(SECTION_KEYWORDS)) {
      if (lowerPrompt.includes(kw) || new RegExp(`\\b${kw}\\b`, "i").test(lowerPrompt)) {
        requestedSectionType = stype;
        break;
      }
    }

    const isExplicitAddSectionCommand =
      lowerPrompt.includes("add") ||
      lowerPrompt.includes("insert") ||
      lowerPrompt.includes("append") ||
      lowerPrompt.includes("create") ||
      lowerPrompt.includes("build") ||
      lowerPrompt.includes("put") ||
      lowerPrompt.includes("give") ||
      lowerPrompt.includes("also") ||
      lowerPrompt.includes("plus") ||
      Boolean(
        requestedSectionType &&
        !lowerPrompt.includes("full page") &&
        !lowerPrompt.includes("entire page") &&
        !lowerPrompt.includes("landing page") &&
        !lowerPrompt.includes("whole website") &&
        !lowerPrompt.includes("new website") &&
        !lowerPrompt.includes("redesign all")
      );

    // Determine if we should edit an existing section in-place or create a new section
    const isEditingCurrentSection =
      scope === "section" &&
      Boolean(currentSection) &&
      !isExplicitAddSectionCommand &&
      (!requestedSectionType || requestedSectionType === currentSection?.type);

    const shouldAddSection =
      isExplicitAddSectionCommand ||
      (Boolean(requestedSectionType) && !isEditingCurrentSection && (!currentSection || requestedSectionType !== currentSection?.type));

    if (shouldAddSection && requestedSectionType) {
      const userMessage = `Requested Section Type to Create: "${requestedSectionType}"
User Prompt: "${prompt}"

Please create a complete, stunning, high-converting "${requestedSectionType}" section JSON for this instruction.`;

      const rawAiResponse = await this.callOpenAi(
        buildMessages(SYSTEM_PROMPT_ADD_SECTION, userMessage),
        0.7,
        { ...loggingContext, scope: "section_add" },
      );

      let parsed: any;
      try {
        parsed = JSON.parse(rawAiResponse);
      } catch {
        throw new AppError(502, "Failed to parse structured JSON response from AI.");
      }

      const sectionObj = (parsed.section && typeof parsed.section === "object") ? parsed.section : parsed;
      const finalType = sectionObj.type || parsed.type || requestedSectionType;
      const rawData = (sectionObj.data && typeof sectionObj.data === "object")
        ? sectionObj.data
        : (parsed.data && typeof parsed.data === "object")
          ? parsed.data
          : parsed;
      const rawSettings = (sectionObj.settings && typeof sectionObj.settings === "object")
        ? sectionObj.settings
        : (parsed.settings && typeof parsed.settings === "object")
          ? parsed.settings
          : {};

      const cleanSettings = sanitizeSectionSettings(rawSettings);
      const cleanData = sanitizeSectionData(finalType, rawData);

      const newSection: SectionEnvelope = {
        id: crypto.randomUUID(),
        type: finalType,
        hidden: false,
        settings: cleanSettings,
        data: cleanData,
      };

      return {
        id: crypto.randomUUID(),
        prompt,
        summary: parsed.summary || `Added new ${finalType} section`,
        target: { scope: "section_add", sectionType: finalType },
        before: [],
        after: [newSection],
      };
    }

    // SCENARIO 2: EDIT EXISTING SECTION IN PLACE
    if (isEditingCurrentSection) {
      const targetSection = currentSection!;

      if (targetSection) {
        const userMessage = `Current Section Type: "${targetSection.type}"
Current Section Settings: ${JSON.stringify(targetSection.settings || {})}
Current Section Data: ${JSON.stringify(targetSection.data || {})}

User Instruction: "${prompt}"

Please modify this section data and settings to satisfy the user instruction. If changing color/background, use valid 6-digit hex in settings.customColors.`;

        const rawAiResponse = await this.callOpenAi(
          buildMessages(SYSTEM_PROMPT_SECTION_EDIT, userMessage),
          0.7,
          { ...loggingContext, scope: "section" },
        );

        let parsed: { summary?: string; chatReply?: string; intent?: string; data?: Record<string, unknown>; settings?: Record<string, unknown> };
        try {
          parsed = JSON.parse(rawAiResponse);
        } catch {
          throw new AppError(502, "Failed to parse structured JSON response from AI.");
        }

        if (parsed.intent === "chat" || (parsed.chatReply && !parsed.data)) {
          return {
            id: crypto.randomUUID(),
            prompt,
            summary: parsed.chatReply || parsed.summary || "AI Copilot Response",
            chatReply: parsed.chatReply || parsed.summary,
            target: { scope: "chat" },
            before: [],
            after: [],
          };
        }

        const updatedData = sanitizeSectionData(targetSection.type, {
          ...targetSection.data,
          ...(parsed.data || {}),
        });

        const rawMergedSettings = {
          ...targetSection.settings,
          ...(parsed.settings || {}),
        };

        const updatedSettings = sanitizeSectionSettings(rawMergedSettings);

        const afterSection: SectionEnvelope = {
          id: targetSection.id,
          type: targetSection.type,
          hidden: targetSection.hidden ?? false,
          settings: updatedSettings,
          data: updatedData,
        };

        return {
          id: crypto.randomUUID(),
          prompt,
          summary: parsed.summary || `Updated ${targetSection.type} section`,
          target: { scope: "section", sectionId: targetSection.id },
          before: [targetSection],
          after: [afterSection],
        };
      }
    }

    // SCENARIO 3: WHOLE PAGE GENERATION OR CONVERSATIONAL QUERY
    const userMessage = `User Website Goal / Prompt: "${prompt}"
Current Sections on Page: ${currentSections.map((s) => s.type).join(", ") || "None (Fresh Page)"}

Please analyze the user's intent. If it's conversational / advice / questions, return "intent": "chat" and "chatReply". If it's page generation, output "intent": "page" and "sections".`;

    const rawAiResponse = await this.callOpenAi(
      buildMessages(SYSTEM_PROMPT_PAGE, userMessage),
      0.7,
      { ...loggingContext, scope: "page" },
    );

    let parsed: {
      intent?: "chat" | "page";
      summary?: string;
      chatReply?: string;
      sections?: Array<{ type: string; settings?: Record<string, unknown>; data: Record<string, unknown> }>;
    };
    try {
      parsed = JSON.parse(rawAiResponse);
    } catch {
      throw new AppError(502, "Failed to parse structured JSON response from AI.");
    }

    if (parsed.intent === "chat" || (parsed.chatReply && (!parsed.sections || parsed.sections.length === 0))) {
      return {
        id: crypto.randomUUID(),
        prompt,
        summary: parsed.chatReply || parsed.summary || "AI Copilot Response",
        chatReply: parsed.chatReply || parsed.summary,
        target: { scope: "chat" },
        before: [],
        after: [],
      };
    }

    const generatedList = Array.isArray(parsed.sections) ? parsed.sections : [];
    if (generatedList.length === 0) {
      throw new AppError(502, "AI did not generate any page sections. Please try with a more specific prompt.");
    }

    // Preserve existing header from page, or create default header if none
    const existingHeader = currentSections.find((s) => s.type === "header");
    const headerSection: SectionEnvelope = existingHeader
      ? structuredClone(existingHeader)
      : {
          id: crypto.randomUUID(),
          type: "header",
          hidden: false,
          settings: sanitizeSectionSettings({}),
          data: sanitizeSectionData("header", {
            design: "logo-left",
            siteName: "Modulus",
            menu: [
              { label: "Solutions", href: "#features" },
              { label: "About us", href: "#about" },
              { label: "Pricing", href: "#pricing" },
              { label: "Resources", href: "#faq" },
            ],
            sticky: false,
          }),
        };

    // Preserve existing footer from page, or create default footer if none
    const existingFooter = currentSections.find((s) => s.type === "footer");
    const footerSection: SectionEnvelope = existingFooter
      ? structuredClone(existingFooter)
      : {
          id: crypto.randomUUID(),
          type: "footer",
          hidden: false,
          settings: sanitizeSectionSettings({}),
          data: sanitizeSectionData("footer", {
            design: "columns",
            siteName: "Modulus",
            columns: [
              { title: "Product", links: [{ label: "Features", href: "#features" }, { label: "Pricing", href: "#pricing" }] },
              { title: "Company", links: [{ label: "About", href: "#about" }, { label: "Contact", href: "#contact" }] },
            ],
            social: [],
            copyright: `© ${new Date().getFullYear()} All rights reserved.`,
          }),
        };

    const bodySections: SectionEnvelope[] = generatedList
      .filter((item) => item.type !== "header" && item.type !== "footer")
      .map((item) => {
        const itemType = item.type || "features";
        return {
          id: crypto.randomUUID(),
          type: itemType,
          hidden: false,
          settings: sanitizeSectionSettings(item.settings || {}),
          data: sanitizeSectionData(itemType, item.data || {}),
        };
      });

    const afterSections: SectionEnvelope[] = [headerSection, ...bodySections, footerSection];

    return {
      id: crypto.randomUUID(),
      prompt,
      summary: parsed.summary || "Generated new page layout and content",
      target: { scope: "page" },
      before: currentSections,
      after: afterSections,
    };
  }
}

export const aiGeneratorService = new AiGeneratorService();
