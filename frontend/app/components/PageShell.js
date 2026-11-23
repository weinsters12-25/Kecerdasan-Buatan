import SiteHeader from "./SiteHeader";
import ScrollProgress from "./ScrollProgress";
import CommandPalette from "./CommandPalette";

export default function PageShell({ children }) {
  return (
    <div className="app">
      <ScrollProgress />
      <CommandPalette />
      <div className="wrap">
        <SiteHeader />
        {children}
      </div>
      <footer className="footer">
        <div className="wrap">Rekomendasi dihitung dari kemiripan isi dokumen (NLP).</div>
      </footer>
    </div>
  );
}