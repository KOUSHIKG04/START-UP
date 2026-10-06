import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="bg-muted grid min-h-screen place-items-center px-4 py-12">
      <div className="bg-card w-full max-w-md rounded-2xl p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-xl font-bold">
            C
          </span>
          <div>
            <p className="text-lg font-semibold">Clinzo</p>
            <p className="text-muted-foreground text-sm">Company Admin</p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Reviewer sign in
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Use your company reviewer account to review submitted documents.
        </p>
        <LoginForm serverError={error === "access" ? "This account does not have company reviewer access." : error === "config" ? "Configure this app’s Supabase URL and publishable key first." : undefined} />
      </div>
    </main>
  );
}
