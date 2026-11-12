import { Img } from "./Img";
import { Reveal } from "./Motion";
import { PageHero } from "./ui";
import { RichText } from "@/lib/rich-text/render";
import { formatDate } from "@/lib/utils";
import type { PageDetail } from "@/server/queries/pages";

/** Generic layout for administrator-managed content pages (privacy, terms, other info pages). */
export function ManagedPage({ page, showUpdated }: { page: PageDetail; showUpdated?: boolean }) {
  return (
    <>
      <PageHero eyebrow={showUpdated ? `Last updated ${formatDate(page.updatedAt)}` : undefined} title={page.title} description={page.excerpt} />
      <section className="section">
        <div className="wrap max-w-[800px]">
          {page.featuredImage && (
            <Reveal className="mb-12 aspect-[16/9] overflow-hidden rounded-[18px]">
              <Img image={page.featuredImage} priority sizes="(min-width: 800px) 752px, 100vw" />
            </Reveal>
          )}
          <Reveal>
            <RichText doc={page.content} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
