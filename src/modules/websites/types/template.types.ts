import type { PageType } from "../../../common/constants/website.js";
import type { FooterData, HeaderData, SectionDataMap, SectionSettings, SectionType } from "./site-content.types.js";

/** Section without an id; ids are generated per website when the template is used. */
export type TemplateSection = {
  [T in SectionType]: { type: T; hidden: boolean; settings: SectionSettings; data: SectionDataMap[T] };
}[SectionType];

export type TemplatePage = {
  name: string;
  slug: string;
  pageType: PageType;
  showInNav: boolean;
  /** Client templates keep hidden pages hidden; platform templates omit this (visible). */
  visible?: boolean;
  sections: TemplateSection[];
};

/** siteName, menu, contact and copyright are filled from the website when it is created. */
export type TemplateHeader = Omit<HeaderData, "siteName" | "menu">;
export type TemplateFooter = Omit<FooterData, "siteName" | "contact" | "copyright">;
