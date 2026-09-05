import { LogoutButton } from "@/components/LogoutButton";

export function PlaceholderDashboard({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-bg-subtle p-8">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        <LogoutButton />
      </div>
      <p className="mx-auto mt-4 max-w-3xl text-sm text-text-muted">
        Bu sahifa hali qurilmagan — dizayn tizimi tayyor bo&apos;lgach to&apos;liq
        dashboard shu yerga qo&apos;shiladi.
      </p>
    </main>
  );
}
