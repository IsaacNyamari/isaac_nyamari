import type { GSchema } from "@/lib/ai/gemini";
import type { RTNode } from "@/lib/rich-text/model";

/** The simple block format Gemini returns; converted to the editor's JSON on the server so the model never writes raw HTML. */
export type AiBlock = { type: "h2" | "h3" | "p" | "ul" | "ol" | "quote"; text?: string; items?: string[] };

/** Splits `**bold**` and `*italic*` into text nodes with marks. */
function inline(text: string): RTNode[] {
  const out: RTNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    const raw = m[0];
    const bold = raw.startsWith("**");
    out.push({ type: "text", text: raw.slice(bold ? 2 : 1, bold ? -2 : -1), marks: [{ type: bold ? "bold" : "italic" }] });
    last = m.index + raw.length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out.filter((n) => n.text);
}

const para = (text: string): RTNode => ({ type: "paragraph", content: inline(text) });

export function blocksToDoc(blocks: AiBlock[]): RTNode {
  const content: RTNode[] = [];
  for (const b of blocks) {
    const text = (b.text ?? "").trim();
    if (b.type === "h2" || b.type === "h3") {
      if (text) content.push({ type: "heading", attrs: { level: b.type === "h2" ? 2 : 3 }, content: [{ type: "text", text: text.replace(/\*+/g, "") }] });
    } else if (b.type === "p") {
      if (text) content.push(para(text));
    } else if (b.type === "quote") {
      if (text) content.push({ type: "blockquote", content: [para(text)] });
    } else {
      const items = (b.items ?? []).map((i) => i.trim()).filter(Boolean);
      if (items.length) {
        content.push({ type: b.type === "ol" ? "orderedList" : "bulletList", content: items.map((i) => ({ type: "listItem", content: [para(i)] })) });
      }
    }
  }
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

export const BLOCKS_SCHEMA: GSchema = {
  type: "ARRAY",
  description: "Article body as ordered blocks",
  items: {
    type: "OBJECT",
    properties: {
      type: { type: "STRING", enum: ["h2", "h3", "p", "ul", "ol", "quote"] },
      text: { type: "STRING", description: "Text for h2/h3/p/quote. Inline **bold** allowed in p/quote." },
      items: { type: "ARRAY", items: { type: "STRING" }, description: "List items for ul/ol" },
    },
    required: ["type"],
  },
};
