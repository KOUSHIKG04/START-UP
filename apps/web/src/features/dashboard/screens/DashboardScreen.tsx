import { Button } from "@startup/web-ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@startup/web-ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@startup/web-ui/components/ui/table";

export default function DashboardScreen() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10 font-sans text-foreground">
      {/* Banner */}
      <header className="rounded-2xl bg-gradient-to-r from-[#0A4A47] to-[#087F78] p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Admin Operations Portal
            </h1>
            <p className="mt-1 text-sm text-emerald-100/90">
              MedCab Real-Time Dispatch, Providers & Platform Metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
            >
              Export Report
            </Button>
            <Button className="bg-white text-[#087F78] hover:bg-emerald-50">
              + New Broadcast
            </Button>
          </div>
        </div>
      </header>

      {/* Metrics Cards */}
      <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardDescription className="uppercase text-xs font-semibold tracking-wider">
              Active Consultations
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-foreground mt-1">
              1,248
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="inline-block bg-secondary text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
              +18% Today
            </span>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardDescription className="uppercase text-xs font-semibold tracking-wider">
              Ambulances On-Duty
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-foreground mt-1">
              84 / 92
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="inline-block bg-secondary text-[#087F8C] text-xs font-semibold px-2.5 py-1 rounded-full">
              Ready & En Route
            </span>
          </CardContent>
        </Card>

        <Card className="border border-[#EF3B43]/30 shadow-sm">
          <CardHeader>
            <CardDescription className="uppercase text-xs font-semibold tracking-wider text-[#EF3B43]">
              Active Emergency SOS
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-[#EF3B43] mt-1">
              3 Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="inline-block bg-[#FDF2F2] text-[#EF3B43] text-xs font-semibold px-2.5 py-1 rounded-full">
              Dispatch Assigned
            </span>
          </CardContent>
        </Card>
      </section>

      {/* Quick Dispatch Controls & Activity Table */}
      <section className="mt-8">
        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
            <div>
              <CardTitle className="text-lg font-bold">Quick Dispatch Controls</CardTitle>
              <CardDescription className="text-sm mt-0.5">
                Manage platform operations across patient, doctor, and driver flows.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                Filters
              </Button>
              <Button size="sm">Action</Button>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 mb-6">
              <Button size="sm" variant="default">
                Patient Flow
              </Button>
              <Button size="sm" variant="secondary">
                Doctor Dashboard
              </Button>
              <Button size="sm" variant="secondary">
                Driver Network
              </Button>
              <Button size="sm" variant="destructive">
                Emergency SOS
              </Button>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Incident ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Vehicle / Doctor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono font-medium">SOS-9021</TableCell>
                    <TableCell>Cardiac Emergency</TableCell>
                    <TableCell>Indiranagar, Bangalore</TableCell>
                    <TableCell>AMB-104 (ALS)</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FDF2F2] text-[#EF3B43]">
                        En Route (4 mins)
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="xs">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">APT-4421</TableCell>
                    <TableCell>Home Consultation</TableCell>
                    <TableCell>Koramangala, Bangalore</TableCell>
                    <TableCell>Dr. Ananya Sharma</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-primary">
                        In Progress
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="xs">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono font-medium">TRP-3102</TableCell>
                    <TableCell>Patient Transfer</TableCell>
                    <TableCell>Whitefield, Bangalore</TableCell>
                    <TableCell>AMB-088 (BLS)</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground">
                        Completed
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="xs">
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
