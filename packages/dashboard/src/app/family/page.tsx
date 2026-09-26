import { FamilyView } from "@/components/family-view";
import { PolicyCard } from "@/components/policy-card";

export default function FamilyPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Tanaka family</h1>
        <p className="text-sm text-muted-foreground">
          The rules Obaachan&apos;s assistant must follow, approvals waiting for you, and every payment decision with its reasons.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PolicyCard />
        <div className="flex flex-col gap-6">
          <FamilyView />
        </div>
      </div>
    </main>
  );
}
