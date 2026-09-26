import { ChatPanel } from "@/components/chat-panel";
import { FamilyView } from "@/components/family-view";
import { PolicyCard } from "@/components/policy-card";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Omamori</h1>
        <p className="text-sm text-muted-foreground">
          A payment agent for elderly people. The family sets the rules in ENS, Intercepta screens every payment, and big ones need a World ID approval.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:sticky lg:top-8 lg:h-[calc(100vh-8rem)]">
          <ChatPanel />
        </div>
        <div className="flex flex-col gap-6">
          <PolicyCard />
          <FamilyView />
        </div>
      </div>
    </main>
  );
}
