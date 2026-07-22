import { PageSpinner } from "@/components/ui/Spinner";

export default function AppLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <PageSpinner label="Loading Finding Astro..." />
    </div>
  );
}
