import {
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  Building2,
  Ambulance,
} from "lucide-react";
import Link from "next/link";
import { requireReviewer } from "@/lib/reviewer";
import { signOut } from "@/lib/auth-actions";
import { Button } from "@startup/web-ui/components/ui/button";

const navigation = [
  { href: "/", label: "Overview", Icon: LayoutDashboard },
  { href: "/verification", label: "All reviews", Icon: ClipboardCheck },
  { href: "/verification?type=doctor", label: "Doctors", Icon: Stethoscope },
  {
    href: "/verification?type=facility",
    label: "Hospitals & clinics",
    Icon: Building2,
  },
  {
    href: "/verification?type=driver",
    label: "Ambulance drivers",
    Icon: Ambulance,
  },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireReviewer();
  return (
    <div className="bg-muted/50 min-h-screen md:grid md:grid-cols-[238px_minmax(0,1fr)]">
      <aside className="bg-card border-b md:min-h-screen md:border-r md:border-b-0">
        <div className="flex items-center justify-between border-b px-5 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg font-bold">
              C
            </span>
            <span>
              <strong className="block leading-tight">Clinzo</strong>
              <span className="text-muted-foreground text-xs">
                Company Admin
              </span>
            </span>
          </Link>
        </div>
        <nav
          aria-label="Company Admin"
          className="flex gap-1 overflow-x-auto p-3 md:block md:space-y-1"
        >
          {navigation.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="text-foreground hover:bg-accent focus-visible:outline-ring flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2"
            >
              <Icon className="text-muted-foreground size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="p-3 md:mt-12">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        {children}
      </main>
    </div>
  );
}
