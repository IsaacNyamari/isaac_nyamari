/** Subtle CSS fade between public pages (disabled for reduced motion in globals.css). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-fade">{children}</div>;
}
