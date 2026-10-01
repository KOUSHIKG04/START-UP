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
        {error === "access" && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive mt-5 rounded-lg p-3 text-sm"
          >
            This account does not have company reviewer access.
          </p>
        )}
        {error === "config" && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive mt-5 rounded-lg p-3 text-sm"
          >
            Configure this app’s Supabase URL and publishable key first.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
