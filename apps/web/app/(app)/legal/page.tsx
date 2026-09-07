export default function LegalPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">Legal</h1>
      <p className="text-sm text-on-surface-variant">Operational policies, legal framework, and complaint procedures for Finding Astro.</p>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Prevention of Cruelty to Animals Act, 1960</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Animal cruelty is punishable under the <strong>Prevention of Cruelty to Animals Act, 1960</strong>. Reports can be escalated to the Animal Welfare Board of India, local NGOs with legal standing, and the police under Section 11 of the PCA Act. Finding Astro supports reporting and documentation of cruelty, neglect, and illegal confinement through its case management system.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Complaint and Escalation</h2>
        <ul className="list-disc pl-5 text-sm text-on-surface-variant space-y-1">
          <li>File a case report through the app for immediate review by admin, NGO, or government partners.</li>
          <li>Share evidence through secure uploads; do not submit illegal or harmful content.</li>
          <li>Admin and NGO partners may review, assign, escalate, and close cases.</li>
          <li>Serious offences may be referred to law enforcement or the Animal Welfare Board of India.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Data Protection and Privacy</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          We store only the data needed for rescue coordination and case management. Animal location data is private by default and may be made public only for operational needs such as emergency rescue, ABC coordination, medical help, or adoption. You may request account deletion at any time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">User Responsibilities</h2>
        <ul className="list-disc pl-5 text-sm text-on-surface-variant space-y-1">
          <li>Use the app only for lawful animal welfare and rescue coordination.</li>
          <li>Do not submit false, misleading, or harmful reports.</li>
          <li>Do not harass, threaten, or harm animals or other users.</li>
          <li>Do not attempt to access private records or abuse platform features.</li>
          <li>Do not upload malware, illegal content, or copyrighted material without permission.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Platform Rules and Enforcement</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Finding Astro enforces platform rules through admin review, rate limiting, identity verification, and audit logging. Violations may result in account suspension, content removal, or escalation to authorities.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Contact</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          For legal notices, abuse reports, or privacy concerns, contact the platform administrator through the in-app support channel or the contact details provided in the app.
        </p>
      </section>
    </div>
  );
}
