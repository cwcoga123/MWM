import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  Compass,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'

const principles = [
  {
    icon: Compass,
    number: '01',
    title: 'Listen first',
    body: 'Your lifestyle, timing, and goals shape the search. The right home starts with understanding what matters to you.',
  },
  {
    icon: HeartHandshake,
    number: '02',
    title: 'Strategize with context',
    body: 'Local insight and honest guidance help you evaluate the neighborhood, the numbers, and the opportunity together.',
  },
  {
    icon: ShieldCheck,
    number: '03',
    title: 'Stay through the finish',
    body: 'From inspections and escrow to the day after closing, you have an advocate and project partner at every step.',
  },
]

const tools = [
  { icon: WalletCards, title: 'Shape the plan', body: 'Clarify your budget, priorities, and path before the search begins.' },
  { icon: BarChart3, title: 'Find the signal', body: 'Use market context to compare homes and make a compelling offer.' },
  { icon: CalendarDays, title: 'Coordinate the details', body: 'Keep inspections, escrow, deadlines, and decisions moving together.' },
]

export function AboutTab() {
  return (
    <main className="mortgage-page about-page" id="about">
      <header className="about-profile-header">
        <p className="eyebrow">ABOUT MINH BUI</p>
        <h1>Real estate guidance rooted in relationships.</h1>
        <p>
          I help Bay Area buyers make thoughtful decisions with local insight, steady communication, and a plan that continues long after the keys are handed over.
        </p>
      </header>

      <section className="about-profile-layout" aria-labelledby="about-story-title">
        <div className="about-photo-card">
          <div className="about-photo-placeholder" role="img" aria-label="Photo placeholder for Minh Bui">
            <span>MB</span>
            <small>Portrait coming soon</small>
          </div>
          <div className="about-photo-card__caption">
            <strong>Minh Bui</strong>
            <span>Bay Area Realtor®</span>
          </div>
        </div>

        <div className="about-story">
          <p className="about-section-kicker">MY STORY</p>
          <h2 id="about-story-title">A home search is personal. The guidance should be, too.</h2>
          <p>
            In today&apos;s market, who you work with makes all the difference. I built my practice around the belief that a real estate relationship should go beyond a single transaction—it should be a source of perspective, advocacy, and calm when the decision matters most.
          </p>
          <p>
            Whether you are searching for a first home, making a strategic investment, or finding the next chapter for your family, I bring together market knowledge, skilled negotiation, and hands-on coordination to make the process feel considered from beginning to end.
          </p>
          <div className="about-story__signature">
            <span className="about-story__line" aria-hidden="true" />
            <div>
              <strong>Service for a lifetime.</strong>
              <span>Here for the next question, too.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="about-profile-meta" aria-label="Minh Bui profile details">
        <article>
          <MapPin size={18} aria-hidden="true" />
          <span>Market</span>
          <strong>San Francisco Bay Area</strong>
        </article>
        <article>
          <BookOpen size={18} aria-hidden="true" />
          <span>Specialty</span>
          <strong>Residential buying &amp; strategy</strong>
        </article>
        <article>
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Promise</span>
          <strong>Clear guidance, every step</strong>
        </article>
      </section>

      <section className="about-principles" aria-label="How Minh works">
        {principles.map(({ icon: Icon, number, title, body }) => (
          <article className="about-principle" key={number}>
            <div className="about-principle__top">
              <span>{number}</span>
              <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
            </div>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="about-standard" aria-labelledby="about-standard-title">
        <div>
          <p className="about-section-kicker">THE BUYER EXPERIENCE</p>
          <h2 id="about-standard-title">Guidance that continues after the offer.</h2>
        </div>
        <div className="about-standard__list">
          <p><Check size={16} aria-hidden="true" /> Search with local insight</p>
          <p><Check size={16} aria-hidden="true" /> Compete with a thoughtful offer</p>
          <p><Check size={16} aria-hidden="true" /> Close with a steady project partner</p>
        </div>
      </section>

      <section className="about-tools" aria-labelledby="about-tools-title">
        <div className="about-tools__heading">
          <p className="about-section-kicker">HOW I HELP</p>
          <h2 id="about-tools-title">From first search to final signature.</h2>
        </div>
        <div className="about-tools__grid">
          {tools.map(({ icon: Icon, title, body }) => (
            <article className="about-tool" key={title}>
              <span className="about-tool__icon"><Icon size={19} strokeWidth={1.7} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-cta" aria-labelledby="about-cta-title">
        <div>
          <p className="about-section-kicker">SERVICE FOR A LIFETIME</p>
          <h2 id="about-cta-title">Let&apos;s make your next move a good one.</h2>
        </div>
        <a className="about-cta__link" href="#overview">
          Open your workspace <ArrowRight size={17} aria-hidden="true" />
        </a>
      </section>
    </main>
  )
}
