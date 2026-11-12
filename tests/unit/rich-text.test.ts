import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { extractToc, readingMinutes, safeEmbedUrl, safeHref } from "@/lib/rich-text/model";
import { RichText } from "@/lib/rich-text/render";
import { postInputSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";

const html = (doc: object) => renderToStaticMarkup(RichText({ doc: doc as never }));

describe("rich text rendering", () => {
  it("renders headings, marks, lists, code and tables", () => {
    const out = html({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Getting started" }] },
        { type: "paragraph", content: [{ type: "text", text: "bold", marks: [{ type: "bold" }] }] },
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] }] },
        { type: "codeBlock", attrs: { language: "ts" }, content: [{ type: "text", text: "const a = 1;" }] },
        { type: "table", content: [{ type: "tableRow", content: [{ type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "H" }] }] }] }] },
      ],
    });
    expect(out).toContain('<h2 id="getting-started">');
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<li>");
    expect(out).toContain('data-language="ts"');
    expect(out).toContain("<th>");
  });

  it("drops javascript: links, raw HTML and unknown embeds", () => {
    const out = html({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "click", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] },
        { type: "paragraph", content: [{ type: "text", text: "<img src=x onerror=alert(1)>" }] },
        { type: "youtube", attrs: { src: "https://evil.example/embed/x" } },
        { type: "image", attrs: { src: "javascript:alert(1)" } },
        { type: "rawHtml", attrs: { html: "<script>alert(1)</script>" } },
      ],
    });
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("<img src=x");
    expect(out).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("<script>");
  });

  it("opens external links safely", () => {
    const out = html({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] }] });
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });

  it("matches TOC anchors to rendered heading ids, including duplicates", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Setup" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Setup" }] },
      ],
    };
    const toc = extractToc(doc);
    expect(toc.map((t) => t.id)).toEqual(["setup", "setup-1"]);
    const out = html(doc);
    expect(out).toContain('id="setup"');
    expect(out).toContain('id="setup-1"');
  });
});

describe("helpers", () => {
  it("allowlists link protocols", () => {
    expect(safeHref("/contact")).toBe("/contact");
    expect(safeHref("mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
  });

  it("only embeds YouTube (privacy mode) and Vimeo", () => {
    expect(safeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(safeEmbedUrl("https://vimeo.com/123456")).toBe("https://player.vimeo.com/video/123456?dnt=1");
    expect(safeEmbedUrl("https://evil.youtube.com.example/watch?v=abcdefgh")).toBeNull();
  });

  it("computes reading time and slugs", () => {
    expect(readingMinutes("word ".repeat(450))).toBe(2);
    expect(slugify("Hospital & Pharmacy Systems!")).toBe("hospital-and-pharmacy-systems");
  });

  it("validates post input", () => {
    expect(postInputSchema.safeParse({ title: "x", slug: "ok-slug", content: { type: "doc" }, canonicalUrl: "ftp://x" }).success).toBe(false);
    expect(postInputSchema.safeParse({ title: "x", slug: "ok-slug", content: { type: "doc" } }).success).toBe(true);
  });
});
