import type { ReactNode } from "react";
import { type RTMark, type RTNode, extractText, headingId, safeEmbedUrl, safeHref, safeImageSrc, uniqueId } from "./model";

type Ctx = { headingIds: Map<string, number> };

function applyMarks(text: ReactNode, marks: RTMark[] | undefined, key: string): ReactNode {
  let out = text;
  for (const [i, mark] of (marks ?? []).entries()) {
    const k = `${key}-m${i}`;
    switch (mark.type) {
      case "bold": out = <strong key={k}>{out}</strong>; break;
      case "italic": out = <em key={k}>{out}</em>; break;
      case "underline": out = <u key={k}>{out}</u>; break;
      case "strike": out = <s key={k}>{out}</s>; break;
      case "code": out = <code key={k}>{out}</code>; break;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (!href) break;
        const external = /^https?:/i.test(href);
        out = (
          <a key={k} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
            {out}
          </a>
        );
        break;
      }
      default: break; // unknown marks are dropped
    }
  }
  return out;
}

function children(node: RTNode, ctx: Ctx, key: string) {
  return (node.content ?? []).map((child, i) => renderNode(child, ctx, `${key}-${i}`));
}

function cellAttrs(node: RTNode) {
  const colSpan = Number(node.attrs?.colspan ?? 1);
  const rowSpan = Number(node.attrs?.rowspan ?? 1);
  return { colSpan: colSpan > 1 ? colSpan : undefined, rowSpan: rowSpan > 1 ? rowSpan : undefined };
}

function renderNode(node: RTNode, ctx: Ctx, key: string): ReactNode {
  switch (node.type) {
    case "doc": return <>{children(node, ctx, key)}</>;
    case "text": return <span key={key}>{applyMarks(node.text ?? "", node.marks, key)}</span>;
    case "paragraph": return <p key={key}>{children(node, ctx, key)}</p>;
    case "heading": {
      const level = Math.min(4, Math.max(2, Number(node.attrs?.level ?? 2)));
      const id = uniqueId(headingId(extractText(node).trim()), ctx.headingIds);
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      return <Tag key={key} id={id}>{children(node, ctx, key)}</Tag>;
    }
    case "bulletList": return <ul key={key}>{children(node, ctx, key)}</ul>;
    case "orderedList": {
      const start = Number(node.attrs?.start ?? 1);
      return <ol key={key} start={start > 1 ? start : undefined}>{children(node, ctx, key)}</ol>;
    }
    case "listItem": return <li key={key}>{children(node, ctx, key)}</li>;
    case "blockquote": return <blockquote key={key}>{children(node, ctx, key)}</blockquote>;
    case "codeBlock": {
      const lang = typeof node.attrs?.language === "string" ? node.attrs.language.replace(/[^\w-]/g, "") : "";
      return (
        <pre key={key} data-language={lang || undefined}>
          <code>{extractText(node).replace(/\n$/, "")}</code>
        </pre>
      );
    }
    case "horizontalRule": return <hr key={key} />;
    case "hardBreak": return <br key={key} />;
    case "image": {
      const src = safeImageSrc(node.attrs?.src);
      if (!src) return null;
      const alt = String(node.attrs?.alt ?? "");
      const caption = String(node.attrs?.caption ?? "");
      const width = Number(node.attrs?.width) || undefined;
      const height = Number(node.attrs?.height) || undefined;
      return (
        <figure key={key}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>
      );
    }
    case "youtube": {
      const src = safeEmbedUrl(node.attrs?.src);
      if (!src) return null;
      return (
        <div key={key} className="rt-embed">
          <iframe
            src={src}
            title="Embedded video"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>
      );
    }
    case "table":
      return (
        <div key={key} className="rt-table">
          <table><tbody>{children(node, ctx, key)}</tbody></table>
        </div>
      );
    case "tableRow": return <tr key={key}>{children(node, ctx, key)}</tr>;
    case "tableHeader": return <th key={key} {...cellAttrs(node)}>{children(node, ctx, key)}</th>;
    case "tableCell": return <td key={key} {...cellAttrs(node)}>{children(node, ctx, key)}</td>;
    default:
      // Unknown node types render their children only — raw HTML is never emitted.
      return node.content ? <span key={key}>{children(node, ctx, key)}</span> : null;
  }
}

export function RichText({ doc, className }: { doc: RTNode; className?: string }) {
  return <div className={className ?? "prose-rt"}>{renderNode(doc, { headingIds: new Map() }, "n")}</div>;
}
