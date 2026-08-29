import { components, demoSteps, invariants, riskProfiles } from "@/lib/covenant";

const statusLabels = {
  draft: "Draft",
  testing: "Testing",
  active: "Active",
  blocked: "Blocked",
  verified: "Verified"
};

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">Alpaca AI Trading Agents Hackathon</p>
          <h1>Covenant</h1>
          <p className="subtitle">
            The proof-carrying options agent that tries to break your mandate before it trades.
          </p>
          <div className="heroActions" aria-label="Primary demo actions">
            <a href="#demo">Demo path</a>
            <a href="#invariants">Invariant set</a>
          </div>
        </div>
        <div className="proofPanel" aria-label="Current proof status">
          <span>TradePermit status</span>
          <strong>Signed, exact, short TTL</strong>
          <p>
            Missing, expired, replayed, mutated, or oversized permits fail before Alpaca receives an
            order.
          </p>
        </div>
      </section>

      <section className="sectionGrid" aria-label="Covenant product components">
        {components.map((component) => (
          <article className="componentCard" key={component.name}>
            <div>
              <span className={`status ${component.status}`}>{statusLabels[component.status]}</span>
              <h2>{component.name}</h2>
            </div>
            <p>{component.authority}</p>
            <small>{component.output}</small>
          </article>
        ))}
      </section>

      <section className="workbench" id="demo">
        <div className="mandateBox">
          <p className="eyebrow">Judge mode</p>
          <h2>Mandate Studio</h2>
          <blockquote>
            Grow the account, max 0.5% per trade, no naked options, stop at -1%, but trade at least
            once daily.
          </blockquote>
          <div className="alert">
            Contradiction found: forced daily trading conflicts with fail-closed abstention safety.
          </div>
        </div>
        <div className="timeline">
          {demoSteps.map((step) => (
            <div className="timelineItem" key={`${step.timebox}-${step.screen}`}>
              <span>{step.timebox}</span>
              <strong>{step.screen}</strong>
              <p>{step.action}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="twoColumn" id="invariants">
        <div>
          <p className="eyebrow">Executable policy</p>
          <h2>Eight Invariants</h2>
          <div className="invariantList">
            {invariants.map((invariant) => (
              <article key={invariant.id}>
                <span>{invariant.id}</span>
                <p>{invariant.rule}</p>
                <small>{invariant.owner}</small>
              </article>
            ))}
          </div>
        </div>
        <aside className="riskTable">
          <p className="eyebrow">Default demo risk</p>
          <h2>Paper Profiles</h2>
          {riskProfiles.map((profile) => (
            <div className="riskRow" key={profile.name}>
              <strong>{profile.name}</strong>
              <span>{profile.perTrade} trade</span>
              <span>{profile.portfolioHeat} heat</span>
              <span>{profile.dailyHalt} halt</span>
            </div>
          ))}
          <p className="disclaimer">
            Paper trading only. Not investment advice. Options involve significant risk.
          </p>
        </aside>
      </section>
    </main>
  );
}
