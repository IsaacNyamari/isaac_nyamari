import { PageHeader } from "@/components/admin/ui";
import { maxUploadBytes } from "@/lib/media";
import { MediaLibrary } from "./MediaLibrary";

export const metadata = { title: "Media library" };

export default function MediaPage() {
  return (
    <>
      <PageHeader
        title="Media library"
        crumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Media" }]}
        description={`JPEG, PNG, WebP, GIF, AVIF and PDF up to ${Math.round(maxUploadBytes() / 1048576)} MB. SVG is disabled for security.`}
      />
      <MediaLibrary />
    </>
  );
}
