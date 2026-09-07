export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">Privacy Policy</h1>
      <p className="text-sm text-on-surface-variant">How Finding Astro collects, uses, and protects data.</p>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Data We Collect</h2>
        <ul className="list-disc pl-5 text-sm text-on-surface-variant space-y-1">
          <li>Account details such as email, role, and profile information.</li>
          <li>Animal records, case reports, and location data.</li>
          <li>Media uploads and evidence files.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">How We Use Data</h2>
        <ul className="list-disc pl-5 text-sm text-on-surface-variant space-y-1">
          <li>To coordinate rescue, medical care, ABC, and adoption.</li>
          <li>To maintain audit trails for operational safety and abuse prevention.</li>
          <li>To enforce platform rules and protect animals and users.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">Your Rights</h2>
        <ul className="list-disc pl-5 text-sm text-on-surface-variant space-y-1">
          <li>Request account deletion at any time.</li>
          <li>Keep animal records private by default.</li>
          <li>Control when a record becomes public for rescue or welfare needs.</li>
        </ul>
      </section>
    </div>
  );
}
