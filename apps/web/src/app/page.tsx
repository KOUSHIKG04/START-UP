import { Banner, PageShell, cn } from "@startup/web-ui";

export default function Home() {
  return (
    <PageShell>
      {/* 1. Admin Web Banner (Uses Linear Gradient 0% #0A4A47 -> 100% #087F78) */}
      <Banner
        title="Admin Operations Portal"
        subtitle="MedCab Real-Time Dispatch, Providers & Platform Metrics"
      />

      {/* 2. Metrics Grid styled with Design System tokens */}
      <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-patient-surface shadow-sm">
          <p className="text-xs font-semibold text-patient-muted uppercase tracking-wider">
            Active Consultations
          </p>
          <h2 className="text-3xl font-extrabold text-patient-text mt-2">1,248</h2>
          <span className="inline-block mt-3 bg-patient-surface text-patient-primary text-xs font-semibold px-2.5 py-1 rounded-full">
            +18% Today
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-patient-surface shadow-sm">
          <p className="text-xs font-semibold text-patient-muted uppercase tracking-wider">
            Ambulances On-Duty
          </p>
          <h2 className="text-3xl font-extrabold text-patient-text mt-2">84 / 92</h2>
          <span className="inline-block mt-3 bg-driver-surface text-driver-primary text-xs font-semibold px-2.5 py-1 rounded-full">
            Ready & En Route
          </span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-sos-primary/20 shadow-sm">
          <p className="text-xs font-semibold text-sos-primary uppercase tracking-wider">
            Active Emergency SOS
          </p>
          <h2 className="text-3xl font-extrabold text-sos-header mt-2">3 Alerts</h2>
          <span className="inline-block mt-3 bg-sos-surface text-sos-primary text-xs font-semibold px-2.5 py-1 rounded-full">
            Dispatch Assigned
          </span>
        </div>
      </section>

      {/* 3. Action Table / Control Section */}
      <section className="mt-8 p-6 bg-white rounded-2xl border border-patient-surface shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-patient-surface">
          <div>
            <h3 className="text-lg font-bold text-patient-text">Quick Dispatch Controls</h3>
            <p className="text-sm text-patient-slate mt-0.5">
              Manage platform operations across patient, doctor, and driver flows.
            </p>
          </div>
          <button className="bg-patient-primary hover:bg-patient-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
            + New Broadcast
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-xl text-white",
              "bg-patient-primary hover:bg-patient-primary-dark transition-colors"
            )}
          >
            Patient Flow
          </button>
          <button
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-xl text-white",
              "bg-doctor-primary hover:bg-doctor-dark transition-colors"
            )}
          >
            Doctor Dashboard
          </button>
          <button
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-xl text-white",
              "bg-driver-primary hover:bg-driver-dark transition-colors"
            )}
          >
            Driver Network
          </button>
          <button
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-xl text-white",
              "bg-sos-primary hover:bg-sos-dark transition-colors"
            )}
          >
            Emergency SOS
          </button>
        </div>
      </section>
    </PageShell>
  );
}
