export default function LegalPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">Legal</h1>
      <p className="text-sm text-on-surface-variant">Operational policies and complaint framework for Finding Astro.</p>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Prevention of Cruelty to Animals Act, 1960</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Animal cruelty is punishable under the <strong>Prevention of Cruelty to Animals Act, 1960</strong>. Reports can be escalated to the Animal Welfare Board of India, local NGOs with legal standing, and the police under Section 11 of the PCA Act.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Complaint & Escalation</h2>
        <ul className="list-disc pl-5 text-sm text-on-surface-variant space-y-1">
          <li>File a case report through the app for immediate review.</li>
          <li>Share evidence through secure uploads; do not submit illegal content.</li>
          <li>Admin and NGO partners may review, assign, and escalate cases.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Data & Privacy</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          We store only the data needed for rescue coordination and case management. Animal location data is private by default and may be made public only for operational needs such as emergency rescue, ABC coordination, medical help, or adoption. You may request account deletion at any time.
        </p>
      </section>
    </div>
  );
}
