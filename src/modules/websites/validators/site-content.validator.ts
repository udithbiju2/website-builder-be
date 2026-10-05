import Joi from "joi";
import {
  BUTTON_STYLES,
  CARD_STYLES,
  FONT_KEYS,
  FOOTER_DESIGNS,
  HEADER_DESIGNS,
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
  menu: Joi.array().items(link).max(12).required(),
  cta: link.optional(),
  announcement: optionalText(200),
  sticky: Joi.boolean().required(),
  hidden: Joi.boolean().optional(),
});

export const footerSchema = Joi.object({
  design: Joi.string()
    .valid(...FOOTER_DESIGNS)
    .required(),
  siteName: text(120).required(),
  logo: image.optional(),
  description: optionalText(500),
  columns: Joi.array()
    .items(Joi.object({ title: text(60).required(), links: Joi.array().items(link).max(12).required() }))
    .max(4)
    .required(),
  contact: Joi.object({
    email: optionalText(255),
    phone: optionalText(32),
    address: optionalText(500),
  }).optional(),
  social: Joi.array().items(link).max(10).required(),
  copyright: text(200).allow("").required(),
  hidden: Joi.boolean().optional(),
});

const SECTION_DATA: Record<SectionType, Joi.ObjectSchema> = {
  header: headerSchema,
  footer: footerSchema,
  hero: Joi.object({
    variant: Joi.string().valid("centered", "split").required(),
    eyebrow: optionalText(200),
    heading: text(200).required(),
    subheading: optionalText(500),
    primaryCta: link.optional(),
    secondaryCta: link.optional(),
    image: image.optional(),
  }),
  features: Joi.object({
    heading: text(200).required(),
    intro: optionalText(500),
    columns: columns.required(),
    mobileColumns: columns.required(),
    items: Joi.array()
      .items(
        Joi.object({
          icon: Joi.string()
            .valid(...ICON_NAMES)
            .optional(),
          title: text(120).required(),
          description: text(600).allow("").required(),
        }),
      )
      .max(24)
      .required(),
  }),
  services: Joi.object({
    heading: text(200).required(),
    intro: optionalText(500),
    columns: columns.required(),
    mobileColumns: columns.required(),
    items: Joi.array()
      .items(
        Joi.object({
          title: text(120).required(),
          description: text(600).allow("").required(),
          image: image.optional(),
          link: link.optional(),
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
    heading: text(200).required(),
    intro: optionalText(500),
    items: Joi.array()
      .items(Joi.object({ question: text(300).required(), answer: text(2000).required() }))
      .max(40)
      .required(),
  }),
  cta: Joi.object({
    heading: text(200).required(),
    text: optionalText(500),
    button: link.required(),
  }),
  contact: Joi.object({
    heading: text(200).required(),
    text: optionalText(500),
    email: optionalText(255),
    phone: optionalText(32),
    address: optionalText(500),
    showForm: Joi.boolean().required(),
    submitLabel: text(40).required(),
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
    heading: text(200).required(),
    intro: optionalText(500),
    plans: Joi.array()
      .items(
        Joi.object({
          name: text(60).required(),
          price: text(20).required(),
          period: optionalText(20),
          description: optionalText(300),
          features: Joi.array().items(text(160)).max(12).required(),
          cta: link.optional(),
          featured: Joi.boolean().required(),
        }),
      )
      .max(4)
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
    heading: text(200).required(),
    intro: optionalText(500),
    columns: columns.required(),
    mobileColumns: columns.required(),
    members: Joi.array()
      .items(
        Joi.object({
          name: text(120).required(),
          role: optionalText(120),
          bio: optionalText(600),
          photo: image.optional(),
          link: link.optional(),
        }),
      )
      .max(24)
      .required(),
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
