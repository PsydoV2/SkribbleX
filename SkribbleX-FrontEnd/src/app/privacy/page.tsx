// src/app/privacy/page.tsx
import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata = {
  title: "Privacy Policy — SkribbleX",
};

export default function Privacy() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← SkribbleX
        </Link>
      </header>

      <main className={styles.content}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: March 2025</p>

        <Section title="1. Overview">
          SkribbleX is designed with privacy in mind. We collect the minimum
          data necessary to operate the game and do not sell or share your data
          with third parties.
        </Section>

        <Section title="2. Data We Collect">
          When you use SkribbleX as a Discord Activity, we receive your Discord
          user ID, username, and avatar hash via Discord&apos;s OAuth2 flow.
          This information is used solely to identify you within a game session
          and is not persisted to any database.
        </Section>

        <Section title="3. Session Data">
          All game state (room data, scores, drawings) is held in memory on the
          server and deleted automatically when a session ends or the server
          restarts. No game data is stored permanently.
        </Section>

        <Section title="4. Cookies & Tracking">
          SkribbleX does not use cookies, tracking pixels, analytics services,
          or any third-party data collection tools.
        </Section>

        <Section title="5. Third-Party Services">
          SkribbleX integrates with Discord via the Embedded App SDK. Your use
          of Discord is subject to Discord&apos;s own Privacy Policy at
          discord.com/privacy.
        </Section>

        <Section title="6. Data Retention">
          Since no data is persisted beyond an active session, there is nothing
          to delete. If you have questions about data handling, please contact
          the project maintainer via GitHub.
        </Section>

        <Section title="7. Children">
          SkribbleX is not directed at children under 13. Users must comply with
          Discord&apos;s minimum age requirements.
        </Section>

        <Section title="8. Changes">
          We may update this Privacy Policy from time to time. Any changes will
          be reflected here with an updated date.
        </Section>

        <Section title="9. Contact">
          For privacy-related questions, please open an issue on the GitHub
          repository.
        </Section>
      </main>

      <footer className={styles.footer}>
        <Link href="/tos">Terms of Service</Link>
        <Link href="/">Home</Link>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}
