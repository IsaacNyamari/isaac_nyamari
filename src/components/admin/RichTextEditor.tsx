"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Youtube } from "@tiptap/extension-youtube";
import { Placeholder } from "@tiptap/extension-placeholder";
import {
  Bold, Code, Code2, Columns3, Heading2, Heading3, Image as ImageIcon, Italic, Link2, List, ListOrdered, Minus, Quote,
  Redo2, Rows3, Strikethrough, Table as TableIcon, Trash2, Underline, Undo2, Unlink, Video,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { MediaPicker } from "./MediaPicker";
import { Button, Dialog, Field, Input } from "./ui";
import type { RTNode } from "@/lib/rich-text/model";

/** Image node with media-library id, caption and intrinsic size stored as attributes. */
const MediaImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: { default: null },
      caption: { default: "" },
      width: { default: null },
      height: { default: null },
    };
  },
});

const SAFE_LINK = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

export function RichTextEditor({ value, onChange, placeholder, minimal }: { value: RTNode; onChange: (doc: RTNode) => void; placeholder?: string; minimal?: boolean }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [imageEdit, setImageEdit] = useState<{ alt: string; caption: string } | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, protocols: ["mailto", "tel"], isAllowedUri: (url) => SAFE_LINK.test(url) },
      }),
      MediaImage.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({ nocookie: true, controls: true, modestBranding: true }),
      Placeholder.configure({ placeholder: placeholder ?? "Start writing…" }),
    ],
    content: value as object,
    editorProps: { attributes: { class: "prose-rt max-w-none", "aria-label": "Content editor", role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RTNode),
  });

  if (!editor) {
    return <div className="admin-card h-[420px] animate-pulse" aria-busy="true" />;
  }

  return (
    <div className="admin-card tiptap-surface overflow-hidden">
      <Toolbar
        editor={editor}
        minimal={minimal}
        onImage={() => setPickerOpen(true)}
        onLink={() => setLinkOpen(true)}
        onVideo={() => setVideoOpen(true)}
        onEditImage={() => {
          const a = editor.getAttributes("image");
          setImageEdit({ alt: a.alt ?? "", caption: a.caption ?? "" });
        }}
      />
      <EditorContent editor={editor} />

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(items) => {
          editor
            .chain()
            .focus()
            .insertContent(
              items
                .filter((m) => m.kind === "IMAGE")
                .map((m) => ({ type: "image", attrs: { src: m.url, alt: m.alt, mediaId: m.id, caption: m.caption, width: m.width, height: m.height } })),
            )
            .run();
        }}
        multiple
      />
      <LinkDialog open={linkOpen} editor={editor} onClose={() => setLinkOpen(false)} />
      <VideoDialog open={videoOpen} editor={editor} onClose={() => setVideoOpen(false)} />
      <Dialog
        open={imageEdit !== null}
        onClose={() => setImageEdit(null)}
        title="Image details"
        footer={
          <>
            <Button variant="ghost" onClick={() => setImageEdit(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (imageEdit) editor.chain().focus().updateAttributes("image", { alt: imageEdit.alt, caption: imageEdit.caption }).run();
                setImageEdit(null);
              }}
            >
              Apply
            </Button>
          </>
        }
      >
        {imageEdit && (
          <div className="space-y-3">
            <Field label="Alt text" htmlFor="img-alt">
              <Input id="img-alt" value={imageEdit.alt} onChange={(e) => setImageEdit({ ...imageEdit, alt: e.target.value })} />
            </Field>
            <Field label="Caption" htmlFor="img-cap">
              <Input id="img-cap" value={imageEdit.caption} onChange={(e) => setImageEdit({ ...imageEdit, caption: e.target.value })} />
            </Field>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function Toolbar({ editor, minimal, onImage, onLink, onVideo, onEditImage }: { editor: Editor; minimal?: boolean; onImage: () => void; onLink: () => void; onVideo: () => void; onEditImage: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      image: e.isActive("image"),
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  return (
    <div role="toolbar" aria-label="Formatting" className="sticky top-16 z-10 flex flex-wrap items-center gap-0.5 border-b border-[#e3e6ed] bg-[#fafbfc] px-2 py-1.5">
      <Tb label="Heading 2" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 /></Tb>
      <Tb label="Heading 3" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 /></Tb>
      <Sep />
      <Tb label="Bold" active={s.bold} onClick={() => c().toggleBold().run()}><Bold /></Tb>
      <Tb label="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}><Italic /></Tb>
      <Tb label="Underline" active={s.underline} onClick={() => c().toggleUnderline().run()}><Underline /></Tb>
      <Tb label="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}><Strikethrough /></Tb>
      <Tb label="Inline code" active={s.code} onClick={() => c().toggleCode().run()}><Code /></Tb>
      <Sep />
      <Tb label="Bulleted list" active={s.bullet} onClick={() => c().toggleBulletList().run()}><List /></Tb>
      <Tb label="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}><ListOrdered /></Tb>
      <Tb label="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote /></Tb>
      <Tb label="Code block" active={s.codeBlock} onClick={() => c().toggleCodeBlock().run()}><Code2 /></Tb>
      <Tb label="Divider" onClick={() => c().setHorizontalRule().run()}><Minus /></Tb>
      <Sep />
      <Tb label="Link" active={s.link} onClick={onLink}><Link2 /></Tb>
      {s.link && <Tb label="Remove link" onClick={() => c().unsetLink().run()}><Unlink /></Tb>}
      {!minimal && (
        <>
          <Tb label="Insert image" onClick={onImage}><ImageIcon /></Tb>
          {s.image && (
            <button type="button" onClick={onEditImage} className="rounded px-2 py-1 text-xs font-medium text-[#3a4258] hover:bg-[#eef0f4]">Alt / caption</button>
          )}
          <Tb label="Embed video" onClick={onVideo}><Video /></Tb>
          <Tb label="Insert table" active={s.table} onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon /></Tb>
          {s.table && (
            <>
              <Tb label="Add row" onClick={() => c().addRowAfter().run()}><Rows3 /></Tb>
              <Tb label="Add column" onClick={() => c().addColumnAfter().run()}><Columns3 /></Tb>
              <Tb label="Delete table" onClick={() => c().deleteTable().run()}><Trash2 /></Tb>
            </>
          )}
        </>
      )}
      <span className="ml-auto flex">
        <Tb label="Undo" disabled={!s.canUndo} onClick={() => c().undo().run()}><Undo2 /></Tb>
        <Tb label="Redo" disabled={!s.canRedo} onClick={() => c().redo().run()}><Redo2 /></Tb>
      </span>
    </div>
  );
}

function Tb({ label, active, onClick, children, disabled }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("grid h-8 w-8 place-items-center rounded text-[#3a4258] transition-colors hover:bg-[#eef0f4] disabled:opacity-35 [&_svg]:h-4 [&_svg]:w-4", active && "bg-ink text-white hover:bg-ink")}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 h-5 w-px bg-[#e3e6ed]" aria-hidden="true" />;
}

function LinkDialog({ open, editor, onClose }: { open: boolean; editor: Editor; onClose: () => void }) {
  const [href, setHref] = useState("");
  const [error, setError] = useState("");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Insert link"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const v = href.trim();
              if (!SAFE_LINK.test(v)) return setError("Use https://…, mailto:, tel: or a path like /contact");
              editor.chain().focus().extendMarkRange("link").setLink({ href: v }).run();
              setHref("");
              setError("");
              onClose();
            }}
          >
            Apply
          </Button>
        </>
      }
    >
      <Field label="URL" error={error} htmlFor="link-url" help="Select text in the editor first to turn it into a link.">
        <Input id="link-url" value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://example.com or /contact" autoFocus />
      </Field>
    </Dialog>
  );
}

function VideoDialog({ open, editor, onClose }: { open: boolean; editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Embed YouTube video"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const ok = editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run();
              if (!ok) return setError("Paste a valid YouTube link.");
              setUrl("");
              setError("");
              onClose();
            }}
          >
            Embed
          </Button>
        </>
      }
    >
      <Field label="YouTube URL" error={error} htmlFor="yt-url" help="Videos are embedded using YouTube's privacy-enhanced mode.">
        <Input id="yt-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" autoFocus />
      </Field>
    </Dialog>
  );
}
