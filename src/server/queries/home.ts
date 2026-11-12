import "server-only";
import { db } from "@/lib/db";
import { TAGS } from "@/lib/cache";
import { type SectionType, parseSectionConfig, SECTION_TYPES } from "@/lib/validation";
import { DEFAULT_HOME_SECTIONS } from "@/lib/home-defaults";
import { cached, imageSelect, toImage, type PublicImage } from "./common";

export type HomeSectionDTO = { key: string; type: SectionType; visible: boolean; config: Record<string, unknown> };

async function loadSections(state: "LIVE" | "DRAFT"): Promise<HomeSectionDTO[]> {
  const rows = await db.homeSection.findMany({ where: { state }, orderBy: { position: "asc" } });
  if (!rows.length) {
    return DEFAULT_HOME_SECTIONS.map((s) => ({ ...s, config: parseSectionConfig(s.type, s.config) as Record<string, unknown> }));
  }
  return rows
    .filter((r) => (SECTION_TYPES as string[]).includes(r.type))
    .map((r) => ({
      key: r.key,
      type: r.type as SectionType,
      visible: r.visible,
      config: parseSectionConfig(r.type as SectionType, r.config) as Record<string, unknown>,
    }));
}

export const getLiveHomeSections = cached(() => loadSections("LIVE"), "home:live", [TAGS.home]);

/** Draft homepage for preview (admins only). */
export function getDraftHomeSections() {
  return loadSections("DRAFT");
}

async function loadImages(ids: string[]): Promise<Record<string, PublicImage>> {
  if (!ids.length) return {};
  const rows = await db.mediaAsset.findMany({ where: { id: { in: ids } }, select: imageSelect });
  return Object.fromEntries(rows.map((r) => [r.id, toImage(r)!]));
}
export const getImagesById = cached(loadImages, "media:byId", [TAGS.media]);
