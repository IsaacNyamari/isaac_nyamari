import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, UserError } from "@/lib/errors";
import { categoryInputSchema, tagInputSchema } from "@/lib/validation";

export async function saveCategory(id: string | null, data: unknown) {
  const input = categoryInputSchema.parse(data);
  return id ? db.category.update({ where: { id }, data: input }) : db.category.create({ data: input });
}

/** Categories that still hold posts cannot be removed — reassign the posts first. */
export async function deleteCategory(id: string) {
  const cat = await db.category.findUnique({ where: { id }, include: { _count: { select: { posts: true } } } });
  if (!cat) throw new NotFoundError("Category");
  if (cat._count.posts > 0) {
    throw new UserError(`"${cat.name}" is assigned to ${cat._count.posts} post(s). Move them to another category first.`);
  }
  await db.category.delete({ where: { id } });
}

export async function saveTag(id: string | null, data: unknown) {
  const input = tagInputSchema.parse(data);
  return id ? db.tag.update({ where: { id }, data: input }) : db.tag.create({ data: input });
}

/** Tags used by published posts are protected so public tag pages never break silently. */
export async function deleteTag(id: string, opts: { force?: boolean } = {}) {
  const tag = await db.tag.findUnique({ where: { id } });
  if (!tag) throw new NotFoundError("Tag");
  const used = await db.postTag.count({ where: { tagId: id } });
  if (used > 0 && !opts.force) {
    throw new UserError(`"${tag.name}" is used by ${used} post(s). Remove it from those posts first.`);
  }
  await db.tag.delete({ where: { id } });
}

/** Creates tags by name when they don't exist yet (used by the post editor). */
export async function ensureTags(names: string[]) {
  const { slugify } = await import("@/lib/slug");
  const results = [];
  for (const raw of names) {
    const name = raw.trim().slice(0, 60);
    const slug = slugify(name);
    if (!name || !slug) continue;
    results.push(await db.tag.upsert({ where: { slug }, create: { name, slug }, update: {} }));
  }
  return results;
}
