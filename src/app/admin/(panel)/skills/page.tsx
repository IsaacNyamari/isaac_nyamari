import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { SkillsManager } from "./SkillsManager";

export const metadata = { title: "Skills" };

export default async function SkillsPage() {
  const skills = await db.skill.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader
        title="Skills"
        crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Skills" }]}
        description="Shown on the homepage and About page, grouped by category. No proficiency ratings are displayed."
      />
      <SkillsManager
        key={skills.map((s) => `${s.id}${s.position}${s.updatedAt.getTime()}`).join()}
        skills={skills.map((s) => ({ id: s.id, name: s.name, category: s.category, description: s.description, icon: s.icon, visible: s.visible }))}
      />
    </>
  );
}
