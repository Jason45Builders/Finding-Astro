import Link from "next/link";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmergencyReportForm } from "@/components/forms/EmergencyReportForm";

export default function EmergencyPage() {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="bg-error text-on-error rounded-xl p-6 flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 shrink-0" />
          <div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile">Emergency Report</h1>
            <p className="text-on-error/80 text-sm">No account needed — file a report and a nearby responder will be notified.</p>
          </div>
        </div>

        <Card className="p-6 shadow-xl">
          <EmergencyReportForm homeHref="/" />
        </Card>
      </div>
    </div>
  );
}
