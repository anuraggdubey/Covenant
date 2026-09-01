import Link from "next/link";

const FOOTER_GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Candidate Lab", href: "/candidates" },
      { label: "Mandate Studio", href: "/mandates" },
      { label: "Break Me", href: "/break-me" },
    ],
  },
  {
    title: "Proof",
    links: [
      { label: "Permit Console", href: "/permits" },
      { label: "Execution", href: "/execution" },
      { label: "Proof Explorer", href: "/proof" },
      { label: "Shadow Ledger", href: "/shadow-ledger" },
    ],
  },
  {
    title: "Guarantees",
    links: [
      { label: "Powerless by construction", href: "/permits" },
      { label: "Fail-closed state", href: "/break-me" },
      { label: "Replay verifier", href: "/proof" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <section className="footer-brand">
          <Link href="/" className="footer-wordmark" aria-label="Covenant home">
            Covenant
          </Link>
          <h2>Proof before permission.</h2>
          <p>
            A paper-trading options agent where strategy can propose, but only a signed,
            exact-match TradePermit can execute.
          </p>
          <div className="footer-command">
            <span>Verify locally</span>
            <code>npm run verify -- demo/run_manifest.json</code>
          </div>
        </section>

        <section className="footer-links" aria-label="Footer navigation">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              {group.links.map((link) => (
                <Link href={link.href} key={`${group.title}-${link.href}-${link.label}`}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </section>

        <section className="footer-waitlist" aria-label="Mandate shortcut">
          <span className="eyebrow">Mandate shortcut</span>
          <p>Start with a plain-English policy and inspect the compiled rule surface.</p>
          <Link href="/mandates" className="btn-primary">
            Open Mandate Studio
          </Link>
        </section>
      </div>

      <div className="footer-bottom">
        <span>Paper trading only. Not investment advice.</span>
        <span>Options involve significant risk. Paper results are hypothetical.</span>
      </div>
    </footer>
  );
}
