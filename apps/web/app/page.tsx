import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  PawPrint,
  ShieldCheck,
  Camera,
  ClipboardCheck,
  Stethoscope,
  CheckCircle2,
  Siren,
  MapPinned,
  Heart,
  Search,
  Leaf,
  Syringe,
  IndianRupee,
  Shield,
  HeartHandshake,
  Lock,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScrollHeader } from "@/components/landing/ScrollHeader";

const HOW_IT_WORKS = [
  {
    icon: Camera,
    title: "Report",
    description: "Submit a geo-tagged report with a photo and description. Emergencies can be reported without an account.",
  },
  {
    icon: Siren,
    title: "Claim & Respond",
    description: "A nearby volunteer, NGO, or partner responder claims the case and heads to the location.",
  },
  {
    icon: Stethoscope,
    title: "Treatment & Proof",
    description: "Care is logged step by step, with photo evidence from pickup through recovery.",
  },
  {
    icon: CheckCircle2,
    title: "Outcome & Payout",
    description: "The case is closed with a public outcome record, and funding is released to the clinic only after verification.",
  },
];

const FEATURES = [
  { icon: Siren, title: "Emergency SOS", description: "Instant, geo-tagged reporting for animals in distress." },
  { icon: MapPinned, title: "Animal Tracking", description: "A living registry of community animals and their status." },
  { icon: Heart, title: "Adoption", description: "Connect with animals ready for a home." },
  { icon: Search, title: "Lost & Found", description: "Report and search for missing companion animals." },
  { icon: Leaf, title: "Wildlife Rescue", description: "Species-specific guidance and dedicated response for wildlife." },
  { icon: Syringe, title: "ABC Program", description: "Sterilization requests and outcomes, tracked end to end." },
  { icon: IndianRupee, title: "Funding Transparency", description: "Every rupee traced from commitment to verified payout." },
  { icon: Shield, title: "Community Safety", description: "Report conflicts and cruelty, with humane-response guidance." },
];

const PAYOUT_GATES = [
  { icon: FileCheck2, label: "Proof submitted", description: "Bills and treatment records on file." },
  { icon: ShieldCheck, label: "Verified", description: "Confirmed by the treating clinic or hospital." },
  { icon: Lock, label: "Funds released", description: "Paid directly to the clinic — never to an individual." },
];

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("fa_token")?.value;

  if (token) {
    redirect("/dashboard");
  }

  return (
    <div className="bg-background text-on-surface">
      <ScrollHeader>
        <nav className="flex justify-between items-center h-16 md:h-20 px-container-padding-mobile md:px-container-padding-desktop max-w-[1200px] mx-auto">
          <div className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary flex items-center gap-2">
            <PawPrint className="w-6 h-6" />
            <span>Finding Astro</span>
          </div>
          <div className="hidden md:flex gap-6">
            <a className="font-title-md text-sm text-on-surface-variant hover:text-secondary transition-colors duration-150 ease-out" href="#mission">Mission</a>
            <a className="font-title-md text-sm text-on-surface-variant hover:text-secondary transition-colors duration-150 ease-out" href="#how-it-works">How it Works</a>
            <a className="font-title-md text-sm text-on-surface-variant hover:text-secondary transition-colors duration-150 ease-out" href="#transparency">Transparency</a>
            <a className="font-title-md text-sm text-on-surface-variant hover:text-secondary transition-colors duration-150 ease-out" href="#partners">Partners</a>
          </div>
          <div className="flex gap-2 md:gap-3">
            <Link href="/auth/login"><Button variant="outline" size="sm" className="md:h-11 md:px-6 md:text-sm">Sign In</Button></Link>
            <Link href="/auth/signup"><Button variant="primary" size="sm" className="md:h-11 md:px-6 md:text-sm">Create Account</Button></Link>
          </div>
        </nav>
      </ScrollHeader>

      <main className="pt-20 md:pt-20">
        {/* Hero */}
        <section className="px-container-padding-mobile md:px-container-padding-desktop py-stack-lg md:py-24">
          <div className="max-w-[1200px] mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left flex flex-col gap-stack-md items-center md:items-start">
              <h1 className="font-display-lg text-[40px] md:text-display-lg leading-tight text-primary">Civic Animal Care, Reimagined.</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
                A platform connecting citizens, volunteers, and verified clinics to respond to animals in need — with full transparency from the first report to the final outcome.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link href="/auth/signup" className="w-full sm:w-auto">
                  <Button variant="coral" size="lg" className="w-full">
                    Create Account
                  </Button>
                </Link>
                <Link href="/auth/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative aspect-square md:aspect-auto md:h-[440px] rounded-[40px] overflow-hidden bg-primary flex items-center justify-center">
              <PawPrint className="w-40 h-40 text-on-primary/15" />
              <span className="absolute top-6 left-6 bg-surface/90 text-primary font-label-caps text-label-caps px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                <MapPinned className="w-3.5 h-3.5" /> Geo-Tagged Reports
              </span>
              <span className="absolute bottom-6 right-6 bg-secondary-container text-on-secondary-container font-label-caps text-label-caps px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Outcomes
              </span>
            </div>
          </div>
        </section>

        {/* Mission Strip */}
        <section className="bg-primary text-on-primary py-stack-lg scroll-mt-20" id="mission">
          <div className="max-w-[1200px] mx-auto px-container-padding-mobile md:px-container-padding-desktop flex flex-col md:flex-row items-start gap-6 md:gap-12">
            <ShieldCheck className="w-9 h-9 md:w-12 md:h-12 text-secondary-container shrink-0" />
            <div>
              <span className="font-label-caps text-label-caps text-primary-fixed tracking-widest mb-2 block uppercase">Our Accountability Promise</span>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg mb-3">Built for trust, wherever you are</h2>
              <p className="font-body-lg text-body-lg opacity-90 leading-relaxed max-w-2xl">
                Every report is geo-tagged and timestamped. Cases are tracked from first sighting to verified outcome, and funding is released only after documented proof of treatment — civic infrastructure people can actually rely on.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-container-padding-mobile md:px-container-padding-desktop py-stack-lg md:py-24 bg-surface-container-low scroll-mt-20" id="how-it-works">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center md:mb-16 mb-stack-md">
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-3">A Transparent Journey</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">Every report follows the same accountable path, from the moment it's filed to the moment it's resolved.</p>
            </div>
            <div className="relative flex flex-col md:flex-row md:justify-between gap-8 md:gap-6">
              <div className="hidden md:block absolute top-10 left-0 right-0 h-0.5 bg-outline-variant z-0" />
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.title} className="relative z-10 flex md:flex-col gap-4 md:gap-0 items-start md:items-center md:text-center md:max-w-[220px]">
                  <div
                    className={
                      "w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center shrink-0 border-2 md:mb-5 " +
                      (i === HOW_IT_WORKS.length - 1
                        ? "bg-primary text-on-primary border-primary shadow-md"
                        : "bg-surface-container-lowest text-primary border-primary")
                    }
                  >
                    <step.icon className="w-6 h-6 md:w-7 md:h-7" />
                  </div>
                  <div>
                    <h3 className="font-title-md text-title-md text-primary mb-1">{step.title}</h3>
                    <p className="text-sm text-on-surface-variant">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="px-container-padding-mobile md:px-container-padding-desktop py-stack-lg md:py-24">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-stack-md md:mb-12">What the Platform Does</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 animate-stagger">
              {FEATURES.map((f) => (
                <Card key={f.title} className="p-4 md:p-6 hover:border-primary transition-colors duration-150 ease-out">
                  <f.icon className="w-7 h-7 md:w-8 md:h-8 text-primary mb-3" />
                  <h3 className="font-title-md text-sm md:text-base text-on-surface mb-1">{f.title}</h3>
                  <p className="text-xs md:text-sm text-on-surface-variant">{f.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Transparency */}
        <section className="px-container-padding-mobile md:px-container-padding-desktop py-stack-lg md:py-24 bg-surface-container-highest scroll-mt-20" id="transparency">
          <div className="max-w-[1200px] mx-auto">
            <Card className="p-6 md:p-12 flex flex-col md:flex-row gap-10 md:gap-16 items-start">
              <div className="flex-1">
                <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-4 md:mb-6">Institutional Integrity</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-6 md:mb-8">
                  No individual ever collects money for a street rescue.{" "}
                  <span className="font-bold text-primary">Every payout goes directly to the treating clinic</span>, released only once treatment is verified.
                </p>
                <div className="space-y-3">
                  {PAYOUT_GATES.map((gate, i) => (
                    <div key={gate.label} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-md">
                      <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 font-mono text-sm font-bold">
                        {i + 1}
                      </div>
                      <gate.icon className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-on-surface">{gate.label}</p>
                        <p className="text-xs text-on-surface-variant">{gate.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-1/3">
                <div className="aspect-square bg-surface-container rounded-3xl p-8 flex flex-col justify-center items-center text-center border-2 border-dashed border-primary/20">
                  <Lock className="w-16 h-16 text-primary/30 mb-4" />
                  <p className="font-title-md text-primary mb-2">Verified Before Paid</p>
                  <p className="text-sm text-on-surface-variant">Funds move only after proof of treatment is on record.</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Partners */}
        <section className="px-container-padding-mobile md:px-container-padding-desktop py-stack-lg md:py-24 scroll-mt-20" id="partners">
          <div className="max-w-[1200px] mx-auto text-center">
            <HeartHandshake className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-4">Powered by a Verified Network</h2>
            <p className="text-on-surface-variant max-w-xl mx-auto mb-8">
              Every response depends on verified clinics, NGOs, and welfare organizations who show up when it matters. If you run one, join the network.
            </p>
            <Link href="/partner-signup">
              <Button variant="outline" size="lg">Become a Partner</Button>
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-container-padding-mobile md:px-container-padding-desktop py-stack-lg md:py-24 bg-surface relative overflow-hidden">
          <div className="max-w-[800px] mx-auto text-center relative z-10">
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-4 md:mb-6">Ready to help an animal near you?</h2>
            <p className="font-body-lg text-on-surface-variant mb-8 md:mb-10">Create an account to report, respond, or track a case from start to finish.</p>
            <Link href="/auth/signup">
              <Button variant="coral" size="lg">Create Your Account</Button>
            </Link>
          </div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-fixed-dim/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-secondary-fixed/20 rounded-full blur-[100px] pointer-events-none" />
        </section>
      </main>

      <footer className="bg-surface-container-lowest border-t-2 border-surface-container-high py-stack-lg px-container-padding-mobile md:px-container-padding-desktop">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-stack-md text-center md:text-left">
          <div className="flex flex-col items-center md:items-start">
            <span className="font-headline-lg text-headline-lg-mobile font-bold text-primary flex items-center gap-2">
              <PawPrint className="w-5 h-5" /> Finding Astro
            </span>
            <p className="text-sm text-on-surface-variant mt-2 max-w-sm">Civic infrastructure for animal welfare.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link className="text-sm text-on-surface-variant hover:text-primary transition-colors duration-150 ease-out" href="/auth/login">Sign In</Link>
            <Link className="text-sm text-on-surface-variant hover:text-primary transition-colors duration-150 ease-out" href="/auth/signup">Create Account</Link>
            <Link className="text-sm text-on-surface-variant hover:text-primary transition-colors duration-150 ease-out" href="/partner-signup">Partner With Us</Link>
          </div>
        </div>
        <p className="text-center text-xs text-outline mt-stack-md">© {new Date().getFullYear()} Finding Astro</p>
      </footer>
    </div>
  );
}
