import Joi from "joi";
import {
  BUTTON_STYLES,
  CARD_STYLES,
  FONT_KEYS,
  FOOTER_DESIGNS,
  HEADER_DESIGNS,
  HERO_VARIANTS,
  ICON_NAMES,
  RADIUS_SIZES,
  SECTION_ALIGNMENTS,
  SECTION_BACKGROUNDS,
  SECTION_SPACINGS,
  SECTION_TYPES,
  SPACING_SIZES,
  type SectionType,
} from "../types/site-content.types.js";

/**
 * Content ends up in published HTML, so links and image URLs are limited to
 * schemes that can't execute script, and colors to plain hex values.
 */
const SAFE_HREF = /^(https?:\/\/\S+|mailto:\S+|tel:[+0-9() -]+|\/(?!\/)\S*|#\S*)$/i;
const SAFE_IMAGE_URL = /^(https?:\/\/\S+|\/(?!\/)\S*)$/i;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
/** Only these hosts are embedded, and only via an iframe src the renderer builds itself. */
export const SAFE_VIDEO_URL =
  /^https:\/\/(?:(?:www\.|m\.)?youtube\.com\/watch\?v=[\w-]{6,20}(?:&\S*)?|youtu\.be\/[\w-]{6,20}(?:\?\S*)?|(?:www\.)?vimeo\.com\/\d{6,12}(?:\?\S*)?)$/i;
const ANCHOR = /^[a-z][a-z0-9-]{0,39}$/;

const text = (max: number) => Joi.string().trim().max(max);
const optionalText = (max: number) => text(max).allow("").optional();

const link = Joi.object({
  label: text(80).required(),
  href: text(2048)
    .pattern(SAFE_HREF)
    .required()
    .messages({ "string.pattern.base": "Links must be http(s), mailto:, tel:, a /path or a #anchor" }),
});

const subMenuItem = Joi.object({
  label: text(80).required(),
  href: text(2048)
    .pattern(SAFE_HREF)
    .required()
    .messages({ "string.pattern.base": "Links must be http(s), mailto:, tel:, a /path or a #anchor" }),
  description: optionalText(140),
  badge: optionalText(30),
  icon: optionalText(40),
});

const menuItem = Joi.object({
  label: text(80).required(),
  href: text(2048)
    .pattern(SAFE_HREF)
    .required()
    .messages({ "string.pattern.base": "Links must be http(s), mailto:, tel:, a /path or a #anchor" }),
  badge: optionalText(30),
  icon: optionalText(40),
  children: Joi.array().items(subMenuItem).max(24).optional(),
});

const image = Joi.object({
  url: text(2048)
    .pattern(SAFE_IMAGE_URL)
    .required()
    .messages({ "string.pattern.base": "Images must use an http(s) URL or a /path" }),
  alt: text(300).allow("").required(),
});

const color = Joi.string().pattern(HEX_COLOR).required().messages({ "string.pattern.base": "Use a #rrggbb color" });
const columns = Joi.number().valid(1, 2, 3, 4);

export const themeSchema = Joi.object({
  colors: Joi.object({
    primary: color,
    secondary: color,
    background: color,
    surface: color,
    text: color,
    muted: color,
  }).required(),
  fonts: Joi.object({
    heading: Joi.string()
      .valid(...FONT_KEYS)
      .required(),
    body: Joi.string()
      .valid(...FONT_KEYS)
      .required(),
  }).required(),
  buttonStyle: Joi.string()
    .valid(...BUTTON_STYLES)
    .required(),
  cardStyle: Joi.string()
    .valid(...CARD_STYLES)
    .required(),
  radius: Joi.string()
    .valid(...RADIUS_SIZES)
    .required(),
  containerWidth: Joi.number().integer().min(640).max(1600).required(),
  sectionSpacing: Joi.string()
    .valid(...SPACING_SIZES)
    .required(),
});

export const headerSchema = Joi.object({
  design: Joi.string()
    .valid(...HEADER_DESIGNS)
    .required(),
  siteName: text(120).required(),
  logo: image.optional(),
  menu: Joi.array().items(menuItem).max(24).required(),
  cta: link.optional(),
  secondaryCta: link.optional(),
  announcement: optionalText(200),
  announcementLink: link.optional(),
  position: Joi.string().valid("static", "sticky", "fixed", "floating").optional(),
  sticky: Joi.boolean().required(),
  overlay: Joi.boolean().optional(),
  showSearch: Joi.boolean().optional(),
  showAccount: Joi.boolean().optional(),
  showCart: Joi.boolean().optional(),
  cartCount: Joi.number().integer().min(0).max(999).optional(),
  currency: optionalText(10),
  mobileMenuType: Joi.string().valid("drawer", "fullscreen", "dropdown").optional(),
  hidden: Joi.boolean().optional(),
});

export const footerSchema = Joi.object({
  design: Joi.string()
    .valid(...FOOTER_DESIGNS)
    .required(),
  siteName: text(120).required(),
  logo: image.optional(),
  tagline: optionalText(200),
  description: optionalText(500),
  columns: Joi.array()
    .items(Joi.object({ title: text(60).required(), links: Joi.array().items(link).max(12).required() }))
    .max(6)
    .required(),
  menu: Joi.array().items(link).max(12).optional(),
  contact: Joi.object({
    title: optionalText(60),
    email: optionalText(255),
    phone: optionalText(32),
    address: optionalText(500),
    hours: optionalText(200),
  }).optional(),
  social: Joi.array().items(link).max(12).required(),
  newsletter: Joi.object({
    enabled: Joi.boolean().optional(),
    title: optionalText(100),
    description: optionalText(200),
    placeholder: optionalText(100),
    buttonText: optionalText(50),
  }).optional(),
  ctaBanner: Joi.object({
    enabled: Joi.boolean().optional(),
    heading: optionalText(200),
    subheading: optionalText(500),
    primaryCta: link.optional(),
    secondaryCta: link.optional(),
  }).optional(),
  paymentMethods: Joi.object({
    enabled: Joi.boolean().optional(),
    methods: Joi.array().items(Joi.string().max(30)).max(10).optional(),
  }).optional(),
  legalLinks: Joi.array().items(link).max(6).optional(),
  copyright: text(200).allow("").required(),
  themeMode: Joi.string().valid("dark", "light", "auto").optional(),
  hidden: Joi.boolean().optional(),
});

export const heroSchema = Joi.object({
  variant: Joi.string()
    .valid(...HERO_VARIANTS)
    .required(),
  eyebrow: optionalText(200),
  badgeIcon: optionalText(50),
  heading: optionalText(200),
  highlightText: optionalText(100),
  subheading: optionalText(500),
  description: optionalText(1000),
  primaryCta: link.optional(),
  secondaryCta: link.optional(),
  tertiaryCta: link.optional(),
  buttons: Joi.array().items(link).max(6).optional(),
  mediaType: Joi.string().valid("image", "video", "both").optional(),
  videoUrl: optionalText(500),
  videoAutoplay: Joi.boolean().optional(),
  videoControls: Joi.boolean().optional(),
  videoLoop: Joi.boolean().optional(),
  image: image.optional(),
  secondaryImage: image.optional(),
  backgroundImage: image.optional(),
  bgImagePosition: Joi.string().valid("bottom", "center", "top", "cover").optional(),
  bgOverlayType: Joi.string().valid("dark", "light", "gradient", "none").optional(),
  backgroundVideoUrl: optionalText(500),
  imagePosition: Joi.string().valid("right", "left", "bottom", "background", "card").optional(),
  imageStyle: Joi.string().valid("mockup", "rounded", "glow", "shadow", "plain").optional(),
  overlayOpacity: Joi.number().min(0).max(100).optional(),
  overlayBlur: Joi.boolean().optional(),
  minHeight: Joi.string().valid("auto", "compact", "screen", "tall").optional(),
  contentAlign: Joi.string().valid("center", "left", "right").optional(),
  bottomShape: Joi.string().valid("none", "wave", "curve", "slant", "tilt").optional(),
  rating: Joi.object({
    stars: Joi.number().min(1).max(5).optional(),
    text: optionalText(200),
    avatarCount: Joi.number().min(1).max(10).optional(),
  }).optional(),
  floatingCards: Joi.array()
    .items(
      Joi.object({
        title: text(60).required(),
        subtitle: optionalText(100),
        badge: optionalText(30),
        icon: optionalText(50),
      })
    )
    .max(4)
    .optional(),
  trustedBy: Joi.object({
    label: optionalText(100),
    logos: Joi.array()
      .items(
        Joi.object({
          label: text(60).required(),
          url: optionalText(500),
        })
      )
      .max(8)
      .optional(),
  }).optional(),
});

const SECTION_DATA: Record<SectionType, Joi.ObjectSchema> = {
  header: headerSchema,
  footer: footerSchema,
  hero: heroSchema,
  features: Joi.object({
    eyebrow: optionalText(100),
    heading: text(200).required(),
    intro: optionalText(500),
    variant: Joi.string().valid("grid", "split", "pastel-icons", "minimal", "cards").optional(),
    iconStyle: Joi.string().valid("pastel-circle", "square-badge", "minimal-accent", "colored-circle", "none").optional(),
    cardStyle: Joi.string().valid("transparent", "surface", "bordered", "glass").optional(),
    align: Joi.string().valid("left", "center").optional(),
    columns: columns.optional().default(3),
    mobileColumns: columns.optional().default(1),
    splitPosition: Joi.string().valid("left", "right").optional(),
    splitImage: image.optional(),
    splitCta: link.optional(),
    secondaryCta: link.optional(),
    bottomCta: link.optional(),
    items: Joi.array()
      .items(
        Joi.object({
          icon: Joi.string().max(50).optional(),
          iconColor: Joi.string().valid("orange", "green", "blue", "yellow", "purple", "pink", "cyan", "indigo", "red", "gray", "none", "default").optional(),
          backgroundColor: Joi.string().max(100).allow("").optional(),
          badge: optionalText(50),
          title: text(120).required(),
          description: text(600).allow("").required(),
          link: link.optional(),
          image: image.optional(),
        }),
      )
      .max(24)
      .required(),
  }),
  services: Joi.object({
    heading: text(200).required(),
    eyebrow: optionalText(100),
    intro: optionalText(500),
    variant: Joi.string()
      .valid(
        "cards-grid",
        "bento-grid",
        "split-showcase",
        "interactive-list",
        "horizontal-cards",
        "minimal-numbered",
      )
      .optional(),
    cardStyle: Joi.string()
      .valid("surface", "bordered", "flat", "glass", "glow", "elevated", "gradient")
      .optional(),
    iconStyle: Joi.string()
      .valid("pastel-circle", "square-badge", "minimal-accent", "colored-circle", "glow-icon", "none")
      .optional(),
    imageAspect: Joi.string().valid("16:9", "4:3", "1:1", "21:9", "auto").optional(),
    align: Joi.string().valid("left", "center").optional(),
    columns: columns.optional().default(3),
    mobileColumns: columns.optional().default(1),
    splitPosition: Joi.string().valid("left", "right").optional(),
    splitImage: image.optional(),
    splitTagline: optionalText(200),
    splitCta: link.optional(),
    secondaryCta: link.optional(),
    bottomCta: link.optional(),
    bottomSecondaryCta: link.optional(),
    showBadges: Joi.boolean().optional(),
    showIcons: Joi.boolean().optional(),
    showImages: Joi.boolean().optional(),
    showPrices: Joi.boolean().optional(),
    showBullets: Joi.boolean().optional(),
    showNumbers: Joi.boolean().optional(),
    items: Joi.array()
      .items(
        Joi.object({
          title: text(120).required(),
          description: text(1000).allow("").required(),
          badge: optionalText(60),
          badgeColor: Joi.string().max(30).optional(),
          icon: Joi.string().max(50).optional(),
          iconColor: Joi.string().max(30).optional(),
          image: image.optional(),
          price: optionalText(60),
          duration: optionalText(60),
          features: Joi.array().items(text(200)).max(12).optional(),
          link: link.optional(),
          secondaryLink: link.optional(),
          backgroundColor: Joi.string().max(100).allow("").optional(),
          featured: Joi.boolean().optional(),
        }),
      )
      .max(24)
      .required(),
  }),
  testimonials: Joi.object({
    heading: text(200).required(),
    items: Joi.array()
      .items(Joi.object({ quote: text(800).required(), name: text(120).required(), role: optionalText(120) }))
      .max(24)
      .required(),
  }),
  faq: Joi.object({
    variant: Joi.string()
      .valid("accordion-classic", "two-column-grid", "split-sidebar", "minimal-numbered", "categorized-cards")
      .optional(),
    eyebrow: optionalText(80),
    heading: text(200).required(),
    intro: optionalText(500),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated")
      .optional(),
    align: Joi.string().valid("left", "center").optional(),
    supportCta: Joi.object({
      title: optionalText(100),
      description: optionalText(300),
      link: link.optional(),
    }).optional(),
    items: Joi.array()
      .items(
        Joi.object({
          question: text(300).required(),
          answer: text(2000).required(),
          category: optionalText(50),
          badge: optionalText(40),
          isOpenDefault: Joi.boolean().optional(),
        }),
      )
      .max(40)
      .required(),
  }),
  cta: Joi.object({
    variant: Joi.string()
      .valid("centered-card", "split-visual", "floating-card", "minimal-editorial")
      .optional(),
    eyebrow: optionalText(80),
    heading: text(200).required(),
    text: optionalText(500),
    button: link.required(),
    secondaryButton: link.optional(),
    trustBadges: Joi.array().items(text(80)).max(6).optional(),
    highlightMetric: Joi.object({
      value: text(30).required(),
      label: text(80).required(),
      subtext: optionalText(120),
    }).optional(),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated", "contrast")
      .optional(),
    align: Joi.string().valid("left", "center").optional(),
  }),
  contact: Joi.object({
    variant: Joi.string()
      .valid("split-form", "cards-hub", "minimal-editorial", "floating-glass")
      .optional(),
    eyebrow: optionalText(80),
    heading: text(200).required(),
    text: optionalText(500),
    email: optionalText(255),
    phone: optionalText(32),
    address: optionalText(500),
    officeHours: optionalText(100),
    responseTime: optionalText(100),
    showForm: Joi.boolean().required(),
    submitLabel: text(40).required(),
    formHeading: optionalText(120),
    serviceOptions: Joi.array().items(text(60)).max(8).optional(),
    channels: Joi.array()
      .items(
        Joi.object({
          label: text(80).required(),
          value: text(120).required(),
          description: optionalText(200),
          icon: Joi.string().valid("mail", "phone", "chat", "user").optional(),
        }),
      )
      .max(6)
      .optional(),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated", "contrast")
      .optional(),
    align: Joi.string().valid("left", "center").optional(),
  }),
  text: Joi.object({
    heading: optionalText(200),
    body: text(20000).allow("").required(),
  }),
  gallery: Joi.object({
    heading: optionalText(200),
    columns: columns.required(),
    mobileColumns: columns.required(),
    images: Joi.array().items(image).max(48).required(),
  }),
  logos: Joi.object({
    heading: optionalText(200),
    grayscale: Joi.boolean().required(),
    logos: Joi.array().items(image).max(24).required(),
  }),
  split: Joi.object({
    eyebrow: optionalText(200),
    heading: text(200).required(),
    body: text(4000).allow("").required(),
    bullets: Joi.array().items(text(200)).max(8).required(),
    image: image.optional(),
    imagePosition: Joi.string().valid("left", "right").required(),
    cta: link.optional(),
  }),
  stats: Joi.object({
    heading: optionalText(200),
    intro: optionalText(500),
    items: Joi.array()
      .items(Joi.object({ value: text(20).required(), label: text(80).required() }))
      .max(8)
      .required(),
  }),
  pricing: Joi.object({
    variant: Joi.string()
      .valid("cards-grid", "minimal-monochrome", "spotlight-tier", "horizontal-rows")
      .optional(),
    eyebrow: optionalText(80),
    heading: text(200).required(),
    intro: optionalText(500),
    billingCycleLabel: optionalText(80),
    discountBadge: optionalText(60),
    footerNote: optionalText(300),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated", "contrast")
      .optional(),
    columns: Joi.number().integer().min(1).max(4).optional(),
    mobileColumns: Joi.number().integer().min(1).max(2).optional(),
    align: Joi.string().valid("left", "center").optional(),
    plans: Joi.array()
      .items(
        Joi.object({
          name: text(60).required(),
          price: text(30).required(),
          period: optionalText(30),
          originalPrice: optionalText(30),
          badge: optionalText(50),
          description: optionalText(300),
          features: Joi.array().items(text(160)).max(15).required(),
          excludedFeatures: Joi.array().items(text(160)).max(15).optional(),
          cta: link.optional(),
          featured: Joi.boolean().required(),
          highlightNote: optionalText(120),
        }),
      )
      .max(6)
      .required(),
  }),
  media: Joi.object({
    heading: optionalText(200),
    caption: optionalText(300),
    kind: Joi.string().valid("image", "video").required(),
    image: image.optional(),
    videoUrl: text(2048)
      .pattern(SAFE_VIDEO_URL)
      .allow("")
      .optional()
      .messages({ "string.pattern.base": "Use a YouTube or Vimeo video link" }),
    aspect: Joi.string().valid("16:9", "4:3", "1:1").required(),
    width: Joi.string().valid("contained", "wide").required(),
  }),
  team: Joi.object({
    variant: Joi.string()
      .valid("grid-cards", "spotlight-featured", "minimal-editorial", "glass-overlay")
      .optional(),
    eyebrow: optionalText(80),
    badge: optionalText(80),
    heading: text(200).required(),
    intro: optionalText(500),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated", "contrast")
      .optional(),
    align: Joi.string().valid("left", "center").optional(),
    columns: columns.required(),
    mobileColumns: columns.required(),
    members: Joi.array()
      .items(
        Joi.object({
          name: text(120).required(),
          role: optionalText(120),
          department: optionalText(80),
          bio: optionalText(600),
          location: optionalText(100),
          photo: image.optional(),
          tags: Joi.array().items(text(50)).max(6).optional(),
          link: link.optional(),
          socialLinks: Joi.array()
            .items(
              Joi.object({
                platform: Joi.string()
                  .valid("linkedin", "twitter", "github", "email", "link")
                  .required(),
                url: Joi.string()
                  .uri({ scheme: ["http", "https", "mailto"] })
                  .max(255)
                  .required(),
              }),
            )
            .max(5)
            .optional(),
        }),
      )
      .max(24)
      .required(),
  }),
  carousel: Joi.object({
    variant: Joi.string()
      .valid(
        "cards",
        "hero-slider",
        "showcase",
        "minimal-editorial",
        "image-gallery",
        "image-strip",
        "image-coverflow",
      )
      .optional(),
    eyebrow: optionalText(80),
    heading: optionalText(200),
    intro: optionalText(500),
    badge: optionalText(80),
    slides: Joi.array()
      .items(
        Joi.object({
          title: text(120).required(),
          subtitle: optionalText(120),
          description: optionalText(600),
          caption: optionalText(300),
          badge: optionalText(60),
          image: image.optional(),
          button: link.optional(),
          secondaryButton: link.optional(),
        }),
      )
      .min(1)
      .max(12)
      .required(),
    autoPlay: Joi.boolean().optional(),
    interval: Joi.number().min(2).max(30).optional(),
    showArrows: Joi.boolean().optional(),
    showDots: Joi.boolean().optional(),
    showThumbnails: Joi.boolean().optional(),
    imageAspect: Joi.string().valid("16:9", "4:3", "1:1", "21:9", "3:4").optional(),
    columns: columns.optional(),
    pauseOnHover: Joi.boolean().optional(),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated", "contrast")
      .optional(),
    align: Joi.string().valid("left", "center").optional(),
  }),
  marquee: Joi.object({
    variant: Joi.string()
      .valid("ticker-text", "cards-stream", "pill-badges", "dual-directional")
      .optional(),
    eyebrow: optionalText(80),
    heading: optionalText(200),
    intro: optionalText(500),
    items: Joi.array()
      .items(
        Joi.object({
          text: text(120).required(),
          badge: optionalText(60),
          icon: Joi.string().valid(...ICON_NAMES).optional(),
          link: Joi.string().max(255).optional(),
          subtext: optionalText(120),
        }),
      )
      .min(1)
      .max(24)
      .required(),
    secondaryItems: Joi.array()
      .items(
        Joi.object({
          text: text(120).required(),
          badge: optionalText(60),
          icon: Joi.string().valid(...ICON_NAMES).optional(),
          link: Joi.string().max(255).optional(),
          subtext: optionalText(120),
        }),
      )
      .max(24)
      .optional(),
    speed: Joi.string().valid("slow", "normal", "fast").optional(),
    direction: Joi.string().valid("left", "right").optional(),
    pauseOnHover: Joi.boolean().optional(),
    gradientFades: Joi.boolean().optional(),
    fontSize: Joi.string().valid("small", "medium", "large", "huge").optional(),
  }),
};

export const sectionSchema = Joi.object({
  id: text(64).required(),
  type: Joi.string()
    .valid(...SECTION_TYPES)
    .required(),
  hidden: Joi.boolean().required(),
  settings: Joi.object({
    background: Joi.string()
      .valid(...SECTION_BACKGROUNDS)
      .required(),
    hideOnMobile: Joi.boolean().required(),
    hideOnDesktop: Joi.boolean().optional(),
    spacing: Joi.string()
      .valid(...SECTION_SPACINGS)
      .optional(),
    align: Joi.string()
      .valid(...SECTION_ALIGNMENTS)
      .optional(),
    anchor: Joi.string()
      .pattern(ANCHOR)
      .allow("")
      .optional()
      .messages({ "string.pattern.base": "Anchors use lowercase letters, numbers and hyphens" }),
    customColors: Joi.object({
      background: color.optional(),
      text: color.optional(),
      primary: color.optional(),
      muted: color.optional(),
      border: color.optional(),
    }).optional(),
    font: Joi.string()
      .valid(...FONT_KEYS)
      .optional(),
  }).required(),
  data: Joi.when("type", {
    switch: SECTION_TYPES.map((type) => ({ is: type, then: SECTION_DATA[type].required() })),
  }),
});

export const sectionsSchema = Joi.array()
  .items(sectionSchema)
  .max(60)
  .unique("id")
  .messages({ "array.unique": "Section ids must be unique within a page" });
