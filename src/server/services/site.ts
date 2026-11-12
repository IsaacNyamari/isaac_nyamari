import "server-only";
import { db } from "@/lib/db";
import { UserError } from "@/lib/errors";
import {
  homeSectionsInputSchema, navMenuSchema, parseSectionConfig, sectionConfigSchemas, settingsSchema, skillInputSchema,
  type SectionType,
} from "@/lib/validation";
import { DEFAULT_HOME_SECTIONS } from "@/lib/home-defaults";
import { toJson } from "./workflow";

// ─── Settings ───────────────────────────────────────────────────────────────

export async function updateSettings(adminId: string, data: unknown) {
  const s = settingsSchema.parse(data);
  const values = {
    ...s.general,
    email: s.contact.email,
    phone: s.contact.phone,
    whatsapp: s.contact.whatsapp,
    locationText: s.contact.locationText,
    contactCtaTitle: s.contact.contactCtaTitle,
    contactCtaText: s.contact.contactCtaText,
    notifyEmail: s.contact.notifyEmail,
    socials: toJson(s.contact.socials),
    ...s.branding,
    ...s.seo,
    ...s.footer,
    updatedById: adminId,
  };
  return db.siteSettings.upsert({ where: { id: "site" }, create: { id: "site", ...values }, update: values });
}

// ─── Navigation ─────────────────────────────────────────────────────────────

export async function saveNavigation(key: "header" | "footer", data: unknown) {
  const { items } = navMenuSchema.parse(data);
  return db.$transaction(async (tx) => {
    const menu = await tx.navigationMenu.upsert({
      where: { key },
      create: { key, name: key === "header" ? "Header" : "Footer" },
      update: {},
    });
    await tx.navigationItem.deleteMany({ where: { menuId: menu.id } });
    if (items.length) {
      await tx.navigationItem.createMany({
        data: items.map((i, position) => ({
          menuId: menu.id,
          label: i.label,
          href: i.href,
          external: /^(https?:|mailto:|tel:)/i.test(i.href),
          newTab: i.newTab,
          enabled: i.enabled,
          position,
        })),
      });
    }
    return menu;
  });
}

// ─── Skills ─────────────────────────────────────────────────────────────────

export async function saveSkill(id: string | null, data: unknown) {
  const input = skillInputSchema.parse(data);
  if (id) return db.skill.update({ where: { id }, data: input });
  const max = await db.skill.aggregate({ _max: { position: true } });
  return db.skill.create({ data: { ...input, position: (max._max.position ?? -1) + 1 } });
}

export async function deleteSkill(id: string) {
  await db.skill.delete({ where: { id } });
}

export async function reorderSkills(ids: string[]) {
  await db.$transaction(ids.map((id, position) => db.skill.update({ where: { id }, data: { position } })));
}

// ─── Homepage ───────────────────────────────────────────────────────────────

/** Makes sure a DRAFT copy exists (seeded from LIVE or defaults) and returns it. */
export async function getEditableHomeSections() {
  let draft = await db.homeSection.findMany({ where: { state: "DRAFT" }, orderBy: { position: "asc" } });
  if (!draft.length) {
    const live = await db.homeSection.findMany({ where: { state: "LIVE" }, orderBy: { position: "asc" } });
    const source = live.length
      ? live.map((s) => ({ key: s.key, type: s.type as SectionType, visible: s.visible, config: s.config }))
      : DEFAULT_HOME_SECTIONS;
    await db.homeSection.createMany({
      data: source.map((s, position) => ({
        state: "DRAFT" as const,
        key: s.key,
        type: s.type,
        position,
        visible: s.visible,
        config: toJson(parseSectionConfig(s.type, s.config)),
      })),
    });
    draft = await db.homeSection.findMany({ where: { state: "DRAFT" }, orderBy: { position: "asc" } });
  }
  return draft.map((s) => ({
    key: s.key,
    type: s.type as SectionType,
    visible: s.visible,
    config: parseSectionConfig(s.type as SectionType, s.config) as Record<string, unknown>,
    updatedAt: s.updatedAt.toISOString(),
  }));
}

export async function saveHomeDraft(data: unknown) {
  const sections = homeSectionsInputSchema.parse(data);
  const keys = new Set<string>();
  const rows = sections.map((s, position) => {
    if (keys.has(s.key)) throw new UserError(`Duplicate section key "${s.key}".`);
    keys.add(s.key);
    const result = sectionConfigSchemas[s.type].safeParse(s.config ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new UserError(`${s.type} section: ${issue.path.join(".")} — ${issue.message}`);
    }
    return { state: "DRAFT" as const, key: s.key, type: s.type, position, visible: s.visible, config: toJson(result.data) };
  });
  await db.$transaction([
    db.homeSection.deleteMany({ where: { state: "DRAFT" } }),
    db.homeSection.createMany({ data: rows }),
  ]);
}

/** Copies the draft layout to the live homepage atomically. */
export async function publishHome() {
  const draft = await db.homeSection.findMany({ where: { state: "DRAFT" }, orderBy: { position: "asc" } });
  if (!draft.length) throw new UserError("There is no draft homepage to publish yet.");
  await db.$transaction([
    db.homeSection.deleteMany({ where: { state: "LIVE" } }),
    db.homeSection.createMany({
      data: draft.map((s) => ({
        state: "LIVE" as const, key: s.key, type: s.type, position: s.position, visible: s.visible, config: toJson(s.config),
      })),
    }),
  ]);
}

/** Throws the draft away and starts again from the live homepage. */
export async function resetHomeDraft() {
  await db.homeSection.deleteMany({ where: { state: "DRAFT" } });
  return getEditableHomeSections();
}

export async function homeHasUnpublishedChanges() {
  const [draft, live] = await Promise.all([
    db.homeSection.findMany({ where: { state: "DRAFT" }, orderBy: { position: "asc" } }),
    db.homeSection.findMany({ where: { state: "LIVE" }, orderBy: { position: "asc" } }),
  ]);
  if (!draft.length) return false;
  const sig = (rows: typeof draft) => JSON.stringify(rows.map((r) => [r.key, r.type, r.visible, r.config]));
  return sig(draft) !== sig(live);
}
