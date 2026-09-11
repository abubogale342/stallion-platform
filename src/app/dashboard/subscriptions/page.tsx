import AccessDenied from "@/components/admin/AccessDenied";
import { requireDashboardPage } from "@/services/dashboard-page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/ui/Table";

const MOCK_SUBSCRIPTIONS = [
  {
    plan: "Ranch listing",
    status: "Active",
    renewal: "15 Sep 2026",
    customer: "Ana Ribeiro",
  },
  {
    plan: "Ranch listing",
    status: "Past due",
    renewal: "02 Aug 2026",
    customer: "Mark Thompson",
  },
  {
    plan: "Pedigree-only",
    status: "Canceled",
    renewal: "—",
    customer: "Lucia Almeida",
  },
];

export default async function SubscriptionsPage() {
  const gate = await requireDashboardPage("owner");
  if (!gate.ok) {
    return <AccessDenied />;
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-400/80">
          Owner
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Subscriptions
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Placeholder subscription table. Stripe is not connected.
        </p>
      </div>
      <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
        Stripe not connected. These rows are mock data for permission testing.
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/50">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Plan</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Renewal</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y divide-slate-800/60">
            {MOCK_SUBSCRIPTIONS.map((row) => (
              <TableRow key={row.customer} className="text-slate-300">
                <TableCell>{row.customer}</TableCell>
                <TableCell>{row.plan}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.renewal}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
