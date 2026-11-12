import Link from "next/link";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { GridGlow } from "@/components/site/ui";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="on-dark relative flex min-h-[70vh] items-center overflow-hidden">
        <GridGlow />
        <div className="wrap relative py-24">
          <p className="font-mono text-sm text-gold-hi">$ curl {"<this page>"} → 404</p>
          <h1 className="h-display mt-5">This page doesn&apos;t exist.</h1>
          <p className="lead mt-6">The link may be broken, or the content may have been moved or unpublished.</p>
          <div className="btn-row mt-10 flex flex-wrap gap-3">
            <Link href="/" className="btn btn-gold">Back to home</Link>
            <Link href="/insights" className="btn btn-ghost">Read insights</Link>
            <Link href="/contact" className="btn btn-ghost">Contact</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
