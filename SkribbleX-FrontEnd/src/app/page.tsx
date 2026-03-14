// src/app/page.tsx
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.logoMark}>
            <span className={styles.logoX}>X</span>
            <span className={styles.logoRest}>Skribble</span>
          </div>

          <h1 className={styles.headline}>
            Draw.
            <br />
            Guess.
            <br />
            <span className={styles.headlineAccent}>Win.</span>
          </h1>

          <p className={styles.sub}>
            A fast, free multiplayer drawing & guessing game —<br />
            built as a native <strong>Discord Activity</strong>.
          </p>

          <div className={styles.actions}>
            <Link href="/game" className={styles.ctaPrimary}>
              Play Now
            </Link>
            <a
              href="https://github.com/PsydoV2/SkribbleX"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaSecondary}
            >
              GitHub ↗
            </a>
          </div>
        </div>

        {/* Decorative canvas mockup */}
        <div className={styles.canvasMockup} aria-hidden>
          <div className={styles.mockupFrame}>
            <div className={styles.mockupTopbar}>
              <span className={styles.mockupDot} />
              <span className={styles.mockupDot} />
              <span className={styles.mockupDot} />
            </div>
            <div className={styles.mockupBody}>
              <svg
                viewBox="0 0 240 160"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.mockupSvg}
              >
                {/* Squiggly drawing of a cat */}
                <path
                  d="M80 120 Q90 80 100 70 Q110 60 120 65 Q130 60 140 70 Q150 80 160 120 Z"
                  fill="none"
                  stroke="#f5c400"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M100 70 Q95 50 88 45 Q85 55 90 65"
                  fill="none"
                  stroke="#f5c400"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M140 70 Q145 50 152 45 Q155 55 150 65"
                  fill="none"
                  stroke="#f5c400"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="110" cy="85" r="3" fill="#f5c400" />
                <circle cx="130" cy="85" r="3" fill="#f5c400" />
                <path
                  d="M115 95 Q120 100 125 95"
                  fill="none"
                  stroke="#f5c400"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M100 92 L85 88 M100 95 L83 95 M100 98 L85 102"
                  fill="none"
                  stroke="#f5c400"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M140 92 L155 88 M140 95 L157 95 M140 98 L155 102"
                  fill="none"
                  stroke="#f5c400"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <div className={styles.mockupGuess}>
                <span>🎉 Player_42 guessed it!</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      {/* <section className={styles.features}>
        <h2 className={styles.featuresTitle}>Everything you need</h2>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureCardTitle}>{f.title}</h3>
              <p className={styles.featureCardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section> */}

      {/* ── CTA Banner ───────────────────────────────────────────────── */}
      <section className={styles.banner}>
        <p className={styles.bannerText}>Ready to play?</p>
        <Link href="/game" className={styles.ctaPrimary}>
          Open the Game ↗
        </Link>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <span>SkribbleX — free & open source</span>
        <div className={styles.footerLinks}>
          <Link href="/tos">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <a
            href="https://github.com/PsydoV2/SkribbleX"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}

// const FEATURES = [
//   {
//     icon: "🎨",
//     title: "Real-time Drawing",
//     desc: "Shared canvas with ultra-low latency sync via WebSockets.",
//   },
//   {
//     icon: "🔤",
//     title: "Guess the Word",
//     desc: "Type your guesses — faster answers earn more points.",
//   },
//   {
//     icon: "👥",
//     title: "Discord Activity",
//     desc: "Runs natively inside Discord. No browser needed.",
//   },
//   {
//     icon: "🏆",
//     title: "Live Scoreboard",
//     desc: "Scores update instantly. Drawer earns points too.",
//   },
//   {
//     icon: "🌍",
//     title: "DE & EN",
//     desc: "320 words across 8 categories in German and English.",
//   },
//   {
//     icon: "💻",
//     title: "Self-hosted",
//     desc: "Zero cost. Run it on your own server in minutes.",
//   },
// ];
