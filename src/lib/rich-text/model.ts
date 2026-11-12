/** Minimal ProseMirror/Tiptap JSON shape. Content is stored in this structured form, never as HTML. */
export type RTMark = { type: string; attrs?: Record<string, unknown> };
export type RTNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RTNode[];
  marks?: RTMark[];
  text?: string;
};

export const EMPTY_DOC: RTNode = { type: "doc", content: [{ type: "paragraph" }] };

export function asDoc(value: unknown): RTNode {
  if (value && typeof value === "object" && (value as RTNode).type === "doc") return value as RTNode;
  return EMPTY_DOC;
}

type SeedBlock = string | { h2: string } | { h3: string } | { list: string[] };

/** Builds a doc from simple blocks — used by seed data. */
export function docFromBlocks(...blocks: SeedBlock[]): RTNode {
  return {
    type: "doc",
    content: blocks.map((b) => {
      if (typeof b === "string") return { type: "paragraph", content: [{ type: "text", text: b }] };
      if ("h2" in b) return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: b.h2 }] };
      if ("h3" in b) return { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: b.h3 }] };
      return {
        type: "bulletList",
        content: b.list.map((item) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: item }] }],
        })),
      };
    }),
  };
}

const BLOCK_TYPES = new Set(["paragraph", "heading", "listItem", "blockquote", "codeBlock", "tableCell", "tableHeader"]);

export function extractText(node: RTNode | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "image") return String(node.attrs?.caption ?? "");
  const inner = (node.content ?? []).map(extractText).join(BLOCK_TYPES.has(node.type) ? "" : "\n");
  return BLOCK_TYPES.has(node.type) ? `${inner}\n` : inner;
}

export function readingMinutes(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 225));
}

export function headingId(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "section";
}

export type TocItem = { id: string; text: string; level: number };

export function uniqueId(base: string, seen: Map<string, number>) {
  const n = seen.get(base) ?? 0;
  seen.set(base, n + 1);
  return n === 0 ? base : `${base}-${n}`;
}

/** Mirrors the id assignment of the renderer so TOC anchors always match. */
export function extractToc(doc: RTNode): TocItem[] {
  const items: TocItem[] = [];
  const seen = new Map<string, number>();
  const walk = (node: RTNode) => {
    if (node.type === "heading") {
      const level = Math.min(4, Math.max(2, Number(node.attrs?.level ?? 2)));
      const text = extractText(node).trim();
      const id = uniqueId(headingId(text), seen);
      if (text && level <= 3) items.push({ id, text, level });
      return;
    }
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return items;
}

/** Media asset ids referenced by image nodes. */
export function collectMediaIds(node: RTNode | null | undefined, out = new Set<string>()): Set<string> {
  if (!node) return out;
  if (node.type === "image" && typeof node.attrs?.mediaId === "string") out.add(node.attrs.mediaId);
  for (const child of node.content ?? []) collectMediaIds(child, out);
  return out;
}

const SAFE_PROTOCOL = /^(https?:|mailto:|tel:)/i;

/** Returns a safe href or null. Relative paths and fragments are allowed. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const v = href.trim();
  if (!v) return null;
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  if (v.startsWith("#")) return v;
  return SAFE_PROTOCOL.test(v) ? v : null;
}

/** Only YouTube / Vimeo embeds are allowed; YouTube uses the privacy-enhanced domain. */
export function safeEmbedUrl(src: unknown): string | null {
  if (typeof src !== "string") return null;
  try {
    const url = new URL(src);
    const host = url.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.slice(1);
    else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      id = url.searchParams.get("v") ?? url.pathname.split("/").filter(Boolean).pop() ?? "";
    } else if (host === "vimeo.com" || host === "player.vimeo.com") {
      const vid = url.pathname.split("/").filter(Boolean).pop() ?? "";
      return /^\d+$/.test(vid) ? `https://player.vimeo.com/video/${vid}?dnt=1` : null;
    } else return null;
    return /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export function safeImageSrc(src: unknown): string | null {
  if (typeof src !== "string") return null;
  if (src.startsWith("/") && !src.startsWith("//")) return src;
  return /^https:\/\//i.test(src) ? src : null;
}
