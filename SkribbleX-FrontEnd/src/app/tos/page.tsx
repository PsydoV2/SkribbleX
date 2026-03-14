// src/app/tos/page.tsx
import Link from "next/link";
import styles from "./tos.module.css";

export const metadata = {
  title: "Terms of Service — SkribbleX",
};

export default function TOS() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← SkribbleX
        </Link>
      </header>

      <main className={styles.content}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: March 2025</p>

        <Section title="1. Acceptance">
          By accessing or using SkribbleX (&quot;the Service&quot;), you agree
          to be bound by these Terms of Service. If you do not agree, please do
          not use the Service.
        </Section>

        <Section title="2. Description">
          SkribbleX is a free, open-source multiplayer drawing and guessing game
          designed to be used as a Discord Activity. It is provided as-is,
          without any guarantees of uptime, availability, or fitness for a
          particular purpose.
        </Section>

        <Section title="3. User Conduct">
          You agree not to use the Service to transmit content that is unlawful,
          harmful, threatening, abusive, harassing, defamatory, or otherwise
          objectionable. You are solely responsible for content you submit
          during gameplay.
        </Section>

        <Section title="4. Intellectual Property">
          SkribbleX is open source and licensed under the MIT License. You are
          free to fork, modify, and self-host the project in accordance with
          that license.
        </Section>

        <Section title="5. Disclaimers">
          The Service is provided &quot;as is&quot; without warranty of any
          kind. We are not liable for any damages arising from your use of or
          inability to use the Service.
        </Section>

        <Section title="6. Changes">
          We reserve the right to modify these Terms at any time. Continued use
          of the Service after changes constitutes acceptance of the new Terms.
        </Section>

        <Section title="7. Contact">
          Questions about these Terms can be directed to the project maintainer
          via the GitHub repository.
        </Section>
      </main>

      <footer className={styles.footer}>
        <Link href="/privacy">Privacy Policy</Link>
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
