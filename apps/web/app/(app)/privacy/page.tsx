export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-headline-lg text-headline-lg text-on-surface">Privacy Policy</h1>
      <p className="text-sm text-on-surface-variant">Last updated: September 2026. This policy explains how Finding Astro collects, uses, stores, and protects your information.</p>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">1. Scope</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          This Privacy Policy applies to the Finding Astro application, website, and related services. By using the app, you agree to the practices described below. If you do not agree, please discontinue use.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">2. Information We Collect</h2>
        <ul className="list-disc pl-5 text-sm text-on-surface-variant space-y-1">
          <li><strong>Account information:</strong> email, role, full name, profile photo, reputation score, and activity metadata.</li>
          <li><strong>Location data:</strong> approximate or precise coordinates when you enable location services, only when necessary for rescue or case coordination.</li>
          <li><strong>Animal records:</strong> species, status, location, description, medical notes, photos, and visibility preferences.</li>
          <li><strong>Case reports:</strong> descriptions, evidence uploads, status updates, and assigned responders.</li>
          <li><strong>Media:</strong> photos, videos, documents, and other files uploaded through secure upload flows.</li>
          <li><strong>Device and usage data:</strong> IP address, user-agent, approximate region, and interaction logs for security and rate-limiting.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">3. How We Use Data</h2>
        <ul className="list-disc pl-5 text-sm text-on-surface-variant space-y-1">
          <li>Coordinate rescue, medical care, ABC programmes, adoption, and welfare payments.</li>
          <li>Maintain audit trails and abuse-prevention signals to protect animals and users.</li>
          <li>Enforce platform rules, prevent misuse, and comply with legal obligations.</li>
          <li>Improve app reliability, performance, and safety features.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">4. Data Sharing and Disclosure</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          We do not sell personal data. We may share limited information with verified partner organisations, government agencies, or law enforcement when required for rescue, legal compliance, or protection of animals and people. Animal location data remains private by default and is shared publicly only when explicitly required for operational needs such as emergency rescue, ABC, medical help, or adoption, and only for the minimum necessary duration.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">5. Data Storage and Security</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Data is stored using Supabase and Upstash Redis. Access is restricted through role-based controls, service-role isolation, audit logging, rate limiting, and input validation. While we implement reasonable safeguards, no system is completely secure; users should also protect account credentials.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">6. Data Retention</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          We retain data only as long as necessary for operational, legal, and audit purposes. You may request account deletion at any time. Some records may be retained in anonymised or aggregated form for legal compliance or safety analytics.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">7. Your Rights</h2>
        <ul className="list-disc pl-5 text-sm text-on-surface-variant space-y-1">
          <li>Access and update your account information.</li>
          <li>Delete your account and request removal of personal data.</li>
          <li>Keep animal records private by default.</li>
          <li>Control when a record becomes public for rescue or welfare needs.</li>
          <li>Raise concerns through in-app reporting or abuse review channels.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">8. Cookies and Tracking</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          The app uses essential cookies and local storage for authentication and session management. We do not use third-party advertising trackers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">9. Third-Party Services</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          We rely on Supabase for database and storage, Upstash for Redis rate limiting, and optional providers for email/SMS notifications. These providers have their own privacy and security practices, and we encourage you to review them.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">10. Children&apos;s Privacy</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          The service is intended for users aged 18 and above. We do not knowingly collect personal information from minors. If you believe a minor has provided data, contact us for removal.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">11. Changes to This Policy</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          We may update this policy from time to time. Continued use of the app after changes implies acceptance of the updated policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-title-md text-title-md text-on-surface">12. Contact</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          For privacy questions, account deletion requests, or legal notices, contact the platform administrator through the in-app support channel or the contact details provided in the app.
        </p>
      </section>
    </div>
  );
}
