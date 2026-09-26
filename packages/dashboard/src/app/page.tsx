import { GrandmaChat } from "@/components/grandma-chat";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 md:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold">Hello, Obaachan 🌸</h1>
        <p className="text-xl text-muted-foreground">What can I help you with today? Your family&apos;s rules keep every payment safe.</p>
      </header>
      <GrandmaChat />
    </main>
  );
}
