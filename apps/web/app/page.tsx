import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Heart,
  HeartHandshake,
  Leaf,
  MapPinned,
  ShieldCheck,
  Siren,
  Stethoscope,
  Users,
  Building2,
  HandHeart,
  GraduationCap,
} from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScrollHeader } from "@/components/landing/ScrollHeader";

const JOURNEY = [
  { number: "01", icon: Camera, title: "Report what you see", description: "Share an animal's situation, location and photos. Emergency reports can start without an account." },
  { number: "02", icon: Siren, title: "Bring the right people together", description: "Cases can reach nearby responders, volunteers and participating welfare organizations." },
  { number: "03", icon: Stethoscope, title: "Record the care", description: "Treatment and response updates create a clearer record of what happened and what is needed next." },
  { number: "04", icon: ClipboardCheck, title: "Follow the outcome", description: "Documented updates help communities and authorized teams follow cases through resolution." },
];

const PILLARS = [
  { icon: Siren, eyebrow: "Respond", title: "When an animal needs help now", description: "Emergency SOS, rescue cases, responder coordination, ambulance support and cruelty reporting bring urgent needs into a clearer workflow.", links: [{ label: "Report an emergency", href: "/emergency" }, { label: "Explore the platform", href: "/auth/signup" }] },
  { icon: Heart, eyebrow: "Care for life", title: "Beyond the rescue", description: "Animal records, adoption, rehoming, foster opportunities, lost-and-found support and wildlife guidance help care continue beyond the first response.", links: [{ label: "Get involved", href: "/auth/signup" }, { label: "Read the welfare library", href: "/library" }] },
  { icon: Users, eyebrow: "Work together", title: "A community that can coordinate", description: "Community stories, rescue collectives, volunteer teams and organization workspaces give people practical ways to work toward better outcomes together.", links: [{ label: "Join the community", href: "/auth/signup" }, { label: "Register an organization", href: "/ngo-verification" }] },
  { icon: Leaf, eyebrow: "Prevent and protect", title: "Build safer, more humane communities", description: "Animal Birth Control (ABC), education, wildlife response and community-safety tools support prevention as well as response.", links: [{ label: "Explore the library", href: "/library" }, { label: "Create an account", href: "/auth/signup" }] },
];

const TRUST_POINTS = [
  { icon: MapPinned, title: "Location-aware reporting", description: "Reports include location context so a response can be coordinated more effectively." },
  { icon: ShieldCheck, title: "Evidence and verification", description: "Case updates and supporting records help authorized teams review progress and outcomes." },
  { icon: HeartHandshake, title: "Accountability by design", description: "The platform is built to make responsibilities, case progress and documented outcomes easier to follow." },
];

const AUDIENCES = [
  { icon: HandHeart, title: "Citizens & volunteers", description: "Report concerns, respond to cases and find meaningful ways to help.", href: "/auth/signup", action: "Get involved" },
  { icon: Building2, title: "NGOs & rescue groups", description: "Coordinate people, animals, tasks and day-to-day welfare operations.", href: "/ngo-verification", action: "Register your organization" },
  { icon: Stethoscope, title: "Clinics & service partners", description: "Connect with a welfare network supporting more coordinated care.", href: "/partner-signup", action: "Become a partner" },
  { icon: GraduationCap, title: "Learners & communities", description: "Explore practical animal-welfare knowledge and humane guidance.", href: "/library", action: "Explore the library" },
];

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("fa_token")?.value;
  if (token) redirect("/dashboard");

  return (
    <div className="bg-background text-on-surface overflow-x-clip">
      <ScrollHeader>
        <nav aria-label="Main navigation" className="flex h-16 md:h-[76px] items-center justify-between gap-3 px-container-padding-mobile md:px-container-padding-desktop max-w-[1200px] mx-auto">
          <Link href="/" aria-label="Finding Astro home" className="flex min-w-0 items-center gap-2 text-primary">
            <LogoMark className="h-8 w-8 shrink-0" />
            <span className="text-base md:text-lg font-bold tracking-tight whitespace-nowrap">Finding Astro</span>
          </Link>
          <div className="hidden lg:flex items-center gap-5">
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#mission">Our mission</a>
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#platform">The platform</a>
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#accountability">Accountability</a>
            <a className="text-sm text-on-surface-variant hover:text-primary transition-colors" href="#partners">Get involved</a>
            <Link className="text-sm font-semibold text-primary hover:text-secondary transition-colors" href="/library">Free library</Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/auth/login" className="hidden sm:block"><Button variant="outline" size="sm" className="md:h-10 md:px-4">Sign in</Button></Link>
            <Link href="/auth/signup" aria-label="Sign up and join"><Button variant="coral" size="sm" className="whitespace-nowrap px-3 md:h-10 md:px-4"><span className="sm:hidden">Signup</span><span className="hidden sm:inline">Join</span></Button></Link>
          </div>
        </nav>
      </ScrollHeader>

      <main className="pt-16 md:pt-[76px]">
        <section id="mission" className="px-container-padding-mobile md:px-container-padding-desktop pt-7 pb-12 md:pt-14 md:pb-20">
          <div className="mx-auto grid max-w-[1200px] items-center gap-8 md:grid-cols-[0.95fr_1.05fr] md:gap-12 lg:gap-16">
            <div className="flex flex-col items-start">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-semibold tracking-wide text-primary"><span className="h-2 w-2 rounded-full bg-secondary" />A connected platform for animal welfare</div>
              <h1 className="max-w-[620px] text-[clamp(2.35rem,7.2vw,4.5rem)] font-black leading-[1.04] tracking-[-0.045em] text-primary">Every animal deserves a response.<span className="mt-1 block text-secondary">Every act of care counts.</span></h1>
              <p className="mt-5 max-w-[540px] text-base leading-7 text-on-surface-variant md:mt-6 md:text-lg md:leading-8">Finding Astro connects people, responders and animal-welfare organizations — from urgent rescue and treatment to adoption, prevention and long-term community care.</p>
              <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row md:mt-8">
                <Link href="/emergency" className="w-full sm:w-auto"><Button variant="coral" size="lg" className="w-full justify-center gap-2 sm:w-auto"><Siren className="h-4 w-4" />Report an emergency</Button></Link>
                <Link href="/library" className="w-full sm:w-auto"><Button variant="outline" size="lg" className="w-full justify-center gap-2 whitespace-nowrap sm:w-auto"><BookOpen className="h-4 w-4 shrink-0" />Animal Welfare Library <ArrowRight className="h-4 w-4 shrink-0" /></Button></Link>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-on-surface-variant sm:text-sm">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" />Emergency reporting without an account</span>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[620px] md:max-w-none">
              <div className="absolute -inset-3 rounded-[2rem] bg-primary/5 md:-inset-4 md:rounded-[2.5rem]" />
              <div className="relative aspect-[5/4] overflow-hidden rounded-[1.6rem] bg-primary md:aspect-[0.98/1] md:rounded-[2rem]">
                <Image src="/images/dog-01.jpg" alt="An Indian community dog, representing the animals and communities Finding Astro exists to support" fill priority sizes="(min-width: 768px) 52vw, 100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/5 to-primary/10" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7 md:p-8">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75 sm:text-xs">From first report to next steps</p>
                  <p className="mt-2 max-w-sm text-xl font-bold leading-snug sm:text-2xl">One clearer path for people who want to help.</p>
                  <div className="mt-4 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm"><MapPinned className="h-3.5 w-3.5" />Location-aware</span><span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm"><ShieldCheck className="h-3.5 w-3.5" />Evidence-led</span></div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container"><Heart className="h-4 w-4" /></span><span className="text-xs font-bold leading-snug text-primary sm:text-sm">Care that continues</span></div>
                <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary-container"><ShieldCheck className="h-4 w-4" /></span><span className="text-xs font-bold leading-snug text-primary sm:text-sm">Accountability at every step</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-primary text-on-primary">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-container-padding-mobile py-8 md:flex-row md:items-center md:justify-between md:gap-10 md:px-container-padding-desktop md:py-10">
            <div className="max-w-3xl"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-fixed md:text-xs">The mission</p><h2 className="text-xl font-bold leading-snug md:text-2xl">Animal welfare works better when the whole community can work together.</h2></div>
            <p className="max-w-md text-sm leading-6 text-on-primary/80 md:text-base">Built around practical action, shared responsibility and clearer records — not just awareness.</p>
          </div>
        </section>

        <section id="platform" className="scroll-mt-24 px-container-padding-mobile py-14 md:px-container-padding-desktop md:py-20">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8 flex flex-col gap-3 md:mb-11 md:flex-row md:items-end md:justify-between"><div className="max-w-2xl"><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-secondary">One platform. Connected work.</p><h2 className="text-2xl font-black leading-tight tracking-tight text-primary md:text-4xl">Support the whole journey of animal welfare.</h2></div><p className="max-w-md text-sm leading-6 text-on-surface-variant md:text-base">From urgent response to prevention and lifelong care, each part has a place in the same wider mission.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {PILLARS.map((pillar, index) => <Card key={pillar.eyebrow} className="group flex h-full flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg md:p-6">
                <div className="mb-5 flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container text-on-primary-container transition-colors group-hover:bg-primary group-hover:text-on-primary"><pillar.icon className="h-5 w-5" /></span><span className="text-xs font-bold tracking-[0.16em] text-outline">0{index + 1}</span></div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">{pillar.eyebrow}</p><h3 className="text-lg font-bold leading-snug text-primary">{pillar.title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-on-surface-variant">{pillar.description}</p>
                <div className="mt-5 flex flex-col items-start gap-2 border-t border-outline-variant pt-4">{pillar.links.map((item, linkIndex) => <Link key={item.label} href={item.href} className={linkIndex === 0 ? "inline-flex min-h-9 items-center gap-1.5 text-sm font-bold text-primary underline-offset-4 hover:underline" : "inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-on-surface-variant underline-offset-4 hover:text-primary hover:underline"}>{item.label}<ArrowRight className="h-3.5 w-3.5" /></Link>)}</div>
              </Card>)}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 bg-surface-container-low px-container-padding-mobile py-14 md:px-container-padding-desktop md:py-20">
          <div className="mx-auto max-w-[1200px]">
            <div className="mx-auto mb-9 max-w-2xl text-center md:mb-12"><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-secondary">A clearer path to action</p><h2 className="text-2xl font-black leading-tight tracking-tight text-primary md:text-4xl">From a report to a recorded outcome.</h2><p className="mt-4 text-sm leading-6 text-on-surface-variant md:text-base">A shared workflow helps the people involved understand what has been reported, what action is being taken and what happens next.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              {JOURNEY.map((step) => <div key={step.number} className="relative rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 md:p-6"><div className="mb-5 flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary"><step.icon className="h-5 w-5" /></span><span className="text-sm font-black tracking-widest text-outline">{step.number}</span></div><h3 className="text-base font-bold text-primary md:text-lg">{step.title}</h3><p className="mt-2 text-sm leading-6 text-on-surface-variant">{step.description}</p></div>)}
            </div>
            <p className="mt-5 text-center text-xs leading-5 text-on-surface-variant">Response times and outcomes depend on local availability and the circumstances of each case.</p>
          </div>
        </section>

        <section id="accountability" className="scroll-mt-24 px-container-padding-mobile py-14 md:px-container-padding-desktop md:py-20">
          <div className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-14">
            <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Trust through process</p><h2 className="text-2xl font-black leading-tight tracking-tight text-primary md:text-4xl">Compassion matters. So does accountability.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-on-surface-variant md:text-base">Animal welfare involves people, resources and difficult decisions. Finding Astro is designed to make reporting, coordination and case records easier to follow, with verification where the workflow requires it.</p><Link href="/auth/signup" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline">See how you can participate <ArrowRight className="h-4 w-4" /></Link></div>
            <div className="space-y-3">{TRUST_POINTS.map((point) => <div key={point.title} className="flex gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container"><point.icon className="h-5 w-5" /></span><div><h3 className="font-bold text-primary">{point.title}</h3><p className="mt-1 text-sm leading-6 text-on-surface-variant">{point.description}</p></div></div>)}<div className="rounded-2xl border border-secondary/30 bg-secondary-container/30 p-4 sm:p-5"><p className="text-sm font-bold text-primary">A resource-first approach to support</p><p className="mt-1 text-sm leading-6 text-on-surface-variant">People can help by arranging needed supplies directly, while corporate CSR partnerships can support organized welfare programs. The applicable process should be clear for each initiative.</p></div></div>
          </div>
        </section>

        <section id="partners" className="scroll-mt-24 bg-surface-container-low px-container-padding-mobile py-14 md:px-container-padding-desktop md:py-20">
          <div className="mx-auto max-w-[1200px]"><div className="mb-8 max-w-2xl md:mb-10"><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Find your way in</p><h2 className="text-2xl font-black leading-tight tracking-tight text-primary md:text-4xl">Different roles. One shared purpose.</h2><p className="mt-3 text-sm leading-6 text-on-surface-variant md:text-base">Whether you are helping one animal or coordinating a wider program, start with the path that fits you.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{AUDIENCES.map((audience) => <Card key={audience.title} className="flex h-full flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 md:p-6"><span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container text-on-primary-container"><audience.icon className="h-5 w-5" /></span><h3 className="text-base font-bold text-primary">{audience.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-on-surface-variant">{audience.description}</p><Link href={audience.href} className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline">{audience.action}<ArrowRight className="h-4 w-4" /></Link></Card>)}</div>
          </div>
        </section>

        <section className="px-container-padding-mobile py-12 md:px-container-padding-desktop md:py-16"><div className="mx-auto grid max-w-[1200px] overflow-hidden rounded-3xl bg-primary text-on-primary md:grid-cols-[1fr_auto]"><div className="p-6 sm:p-8 md:p-10"><span className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-fixed"><BookOpen className="h-4 w-4" />Learn and share</span><h2 className="max-w-2xl text-2xl font-black leading-tight md:text-3xl">Practical animal-welfare knowledge, open to everyone.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-on-primary/80 md:text-base">Explore the free library for guidance and learning resources that can help communities make more informed, humane decisions.</p><Link href="/library" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface-container-lowest px-4 py-2 text-sm font-bold text-primary transition hover:bg-white">Explore the free library <ArrowRight className="h-4 w-4" /></Link></div><div className="hidden min-w-[180px] items-center justify-center px-10 md:flex"><div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10"><BookOpen className="h-14 w-14 text-white" /></div></div></div></section>

        <section className="px-container-padding-mobile pb-14 md:px-container-padding-desktop md:pb-20"><div className="mx-auto flex max-w-[1200px] flex-col gap-6 rounded-3xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 md:flex-row md:items-center md:justify-between md:p-10"><div className="max-w-2xl"><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Start where you are</p><h2 className="text-2xl font-black leading-tight tracking-tight text-primary md:text-3xl">One report, one act of care, one stronger community.</h2><p className="mt-3 text-sm leading-6 text-on-surface-variant md:text-base">Report an animal in distress, join the community or connect your organization with the work.</p></div><div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col"><Link href="/emergency"><Button variant="coral" size="lg" className="w-full justify-center gap-2"><Siren className="h-4 w-4" />Report an emergency</Button></Link><Link href="/auth/signup"><Button variant="outline" size="lg" className="w-full justify-center gap-2">Create an account <ArrowRight className="h-4 w-4" /></Button></Link></div></div></section>
      </main>

      <footer className="border-t border-outline-variant bg-surface-container-lowest px-container-padding-mobile py-8 md:px-container-padding-desktop md:py-10">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><Link href="/" className="inline-flex items-center gap-2 text-primary"><LogoMark className="h-7 w-7" /><span className="font-bold tracking-tight">Finding Astro</span></Link><p className="mt-2 max-w-sm text-sm leading-6 text-on-surface-variant">Connected action for animal rescue, protection and lifelong welfare.</p></div><div className="flex flex-wrap gap-x-5 gap-y-3 text-sm"><Link className="text-on-surface-variant hover:text-primary" href="/emergency">Emergency SOS</Link><Link className="text-on-surface-variant hover:text-primary" href="/library">Free library</Link><Link className="text-on-surface-variant hover:text-primary" href="/ngo-verification">Organizations</Link><Link className="text-on-surface-variant hover:text-primary" href="/partner-signup">Partners</Link><Link className="text-on-surface-variant hover:text-primary" href="/auth/login">Sign in</Link></div></div>
        <div className="mx-auto mt-6 max-w-[1200px] border-t border-outline-variant pt-4 text-xs text-on-surface-variant">© {new Date().getFullYear()} Finding Astro</div>
      </footer>
    </div>
  );
}
