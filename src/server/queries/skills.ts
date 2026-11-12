import "server-only";
import { db } from "@/lib/db";
import { TAGS } from "@/lib/cache";
import { cached } from "./common";

export type SkillGroup = { category: string; skills: { id: string; name: string; description: string; icon: string }[] };

async function loadSkills(): Promise<SkillGroup[]> {
  const rows = await db.skill.findMany({ where: { visible: true }, orderBy: [{ position: "asc" }, { name: "asc" }] });
  const groups = new Map<string, SkillGroup>();
  for (const s of rows) {
    const g = groups.get(s.category) ?? { category: s.category, skills: [] };
    g.skills.push({ id: s.id, name: s.name, description: s.description, icon: s.icon });
    groups.set(s.category, g);
  }
  return [...groups.values()];
}

export const getSkillGroups = cached(loadSkills, "skills", [TAGS.skills]);
