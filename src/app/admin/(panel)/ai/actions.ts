"use server";

import { z } from "zod";
import { runAction } from "@/lib/action";
import { type AiBlock, BLOCKS_SCHEMA, blocksToDoc } from "@/lib/ai/blocks";
import { aiConfigured, generateJson } from "@/lib/ai/gemini";
import { UserError } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { extractText, type RTNode } from "@/lib/rich-text/model";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/server/queries/settings";

const SYSTEM = (name: string, extra: string) =>
  `You are the writing assistant for ${name}'s professional portfolio website (a software engineer based in Kenya). ` +
  `Write clear, specific, natural English — no hype, no filler, no clichés, no emojis. Write in first person ("I") where the owner is the author. ` +
  `Never invent facts, clients, numbers, dates or URLs: use only what the brief gives you, and keep claims modest and generic if details are missing. ${extra}`;

async function guard() {
  const admin = await requireAdmin("content:write");
  if (!aiConfigured()) throw new UserError("AI is not set up on this server yet (GEMINI_API_KEY missing).");
  const { allowed } = await consumeRateLimit(`ai:${admin.id}`, 30, 600);
  if (!allowed) throw new UserError("You have used the AI a lot in the last 10 minutes. Please wait a few minutes.");
  return admin;
}

const clip = (s: string, n: number) => s.trim().slice(0, n);

/** Writes SEO title/description and a short excerpt/summary from existing content. */
async function suggestSeo(kind: "post" | "project", title: string, text: string, siteName: string) {
  const out = await generateJson<{ seoTitle: string; seoDescription: string; shortText: string }>({
    system: SYSTEM(siteName, "You optimise titles and descriptions for Google search without keyword stuffing."),
    prompt:
      `Page type: ${kind}. Title: ${title}\nContent:\n"""${clip(text, 6000)}"""\n\n` +
      `Return seoTitle (50-60 chars, main keyword near the start), seoDescription (140-160 chars, clear benefit, natural call to read), ` +
      `and shortText (a 1-2 sentence ${kind === "post" ? "excerpt" : "summary"}, max 280 chars).`,
    schema: {
      type: "OBJECT",
      properties: { seoTitle: { type: "STRING" }, seoDescription: { type: "STRING" }, shortText: { type: "STRING" } },
      required: ["seoTitle", "seoDescription", "shortText"],
    },
    temperature: 0.4,
  });
  return { seoTitle: clip(out.seoTitle ?? "", 70), seoDescription: clip(out.seoDescription ?? "", 170), shortText: clip(out.shortText ?? "", 400) };
}

/** A draft must always carry body, short text and both SEO fields: missing pieces are generated in a follow-up call. */
async function completeDraft(kind: "post" | "project", d: { title: string; short: string; seoTitle: string; seoDescription: string; content: RTNode }, siteName: string) {
  const text = extractText(d.content).trim();
  if (text.length < 200) throw new UserError("The AI returned an incomplete article. Please click Generate again (add a bit more detail to the brief if it keeps happening).");
  if (d.short.trim() && d.seoTitle.trim() && d.seoDescription.trim()) return d;
  const s = await suggestSeo(kind, d.title, text, siteName);
  return { ...d, short: d.short.trim() || s.shortText, seoTitle: d.seoTitle.trim() || s.seoTitle, seoDescription: d.seoDescription.trim() || s.seoDescription };
}

const briefSchema = z.object({
  brief: z.string().trim().min(10, "Describe the topic in at least a sentence.").max(4000),
  tone: z.enum(["professional", "friendly", "technical"]).default("professional"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  categories: z.array(z.string()).max(50).default([]),
  tags: z.array(z.string()).max(100).default([]),
});

const WORDS = { short: "about 400 words", medium: "about 800 words", long: "about 1400 words" } as const;

export type AiPostDraft = {
  title: string; excerpt: string; content: RTNode; seoTitle: string; seoDescription: string;
  categoryName: string; tagNames: string[];
};

export async function aiPostDraftAction(input: unknown) {
  return runAction(async (): Promise<AiPostDraft> => {
    await guard();
    const i = briefSchema.parse(input);
    const settings = await getSettings();
    const out = await generateJson<{
      title: string; excerpt: string; blocks: AiBlock[]; seoTitle: string; seoDescription: string; categoryName: string; tagNames: string[];
    }>({
      system: SYSTEM(settings.siteName, `Tone: ${i.tone}. Structure articles with an introduction, 3-6 sections using h2 headings (h3 where useful), and a short conclusion. Do not repeat the title as a heading.`),
      prompt:
        `Write a blog article, ${WORDS[i.length]}, from this brief:\n"""${i.brief}"""\n\n` +
        `Also provide: a title (max 100 chars), an excerpt (max 300 chars), seoTitle (50-60 chars, includes the main keyword), seoDescription (140-160 chars, inviting, includes the keyword), ` +
        `categoryName (choose exactly one of [${i.categories.join(" | ")}] or "" if none fit), tagNames (up to 5, choose only from [${i.tags.join(" | ")}]).`,
      schema: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" }, excerpt: { type: "STRING" }, blocks: BLOCKS_SCHEMA,
          seoTitle: { type: "STRING" }, seoDescription: { type: "STRING" }, categoryName: { type: "STRING" },
          tagNames: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["title", "excerpt", "blocks", "seoTitle", "seoDescription"],
      },
    });
    const done = await completeDraft("post", {
      title: out.title ?? "", short: out.excerpt ?? "", seoTitle: out.seoTitle ?? "", seoDescription: out.seoDescription ?? "", content: blocksToDoc(out.blocks ?? []),
    }, settings.siteName);
    return {
      title: clip(out.title ?? "", 160), excerpt: clip(done.short, 400), content: done.content,
      seoTitle: clip(done.seoTitle, 70), seoDescription: clip(done.seoDescription, 170),
      categoryName: out.categoryName ?? "", tagNames: (out.tagNames ?? []).slice(0, 5),
    };
  });
}

export type AiProjectDraft = {
  title: string; summary: string; problem: string; solution: string; content: RTNode; role: string;
  technologies: string[]; categoryNames: string[]; seoTitle: string; seoDescription: string;
};

export async function aiProjectDraftAction(input: unknown) {
  return runAction(async (): Promise<AiProjectDraft> => {
    await guard();
    const i = briefSchema.parse(input);
    const settings = await getSettings();
    const out = await generateJson<{
      title: string; summary: string; problem: string; solution: string; blocks: AiBlock[]; role: string;
      technologies: string[]; categoryNames: string[]; seoTitle: string; seoDescription: string;
    }>({
      system: SYSTEM(settings.siteName, `Tone: ${i.tone}. This is a portfolio case study.`),
      prompt:
        `Create a portfolio project case study from this brief:\n"""${i.brief}"""\n\n` +
        `Provide: title (max 100 chars), summary (1-2 sentences, max 300 chars), problem (2-4 sentences: the problem addressed), solution (2-4 sentences: what was built and how), ` +
        `blocks (a full write-up, ${WORDS[i.length]}, with h2 sections such as Background, Approach, Architecture, Results — only claim what the brief supports), ` +
        `role (short, e.g. "Lead developer" — only if the brief implies it, else ""), technologies (tool/framework names mentioned or clearly implied, max 12), ` +
        `categoryNames (choose from [${i.categories.join(" | ")}], up to 2), seoTitle (50-60 chars), seoDescription (140-160 chars).`,
      schema: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" }, summary: { type: "STRING" }, problem: { type: "STRING" }, solution: { type: "STRING" },
          blocks: BLOCKS_SCHEMA, role: { type: "STRING" }, technologies: { type: "ARRAY", items: { type: "STRING" } },
          categoryNames: { type: "ARRAY", items: { type: "STRING" } }, seoTitle: { type: "STRING" }, seoDescription: { type: "STRING" },
        },
        required: ["title", "summary", "problem", "solution", "blocks", "seoTitle", "seoDescription"],
      },
    });
    const done = await completeDraft("project", {
      title: out.title ?? "", short: out.summary ?? "", seoTitle: out.seoTitle ?? "", seoDescription: out.seoDescription ?? "", content: blocksToDoc(out.blocks ?? []),
    }, settings.siteName);
    return {
      title: clip(out.title ?? "", 160), summary: clip(done.short, 500), problem: clip(out.problem ?? "", 4000), solution: clip(out.solution ?? "", 4000),
      content: done.content, role: clip(out.role ?? "", 160),
      technologies: (out.technologies ?? []).map((t) => clip(t, 60)).filter(Boolean).slice(0, 12),
      categoryNames: out.categoryNames ?? [], seoTitle: clip(done.seoTitle, 70), seoDescription: clip(done.seoDescription, 170),
    };
  });
}

const seoSchema = z.object({
  kind: z.enum(["post", "project"]),
  title: z.string().trim().min(1, "Add a title first.").max(200),
  text: z.string().trim().max(20000).default(""),
});

/** Suggests SEO title/description (and a short excerpt/summary) from what is already written. */
export async function aiSeoAction(input: unknown) {
  return runAction(async () => {
    await guard();
    const i = seoSchema.parse(input);
    const settings = await getSettings();
    return suggestSeo(i.kind, i.title, i.text, settings.siteName);
  });
}
