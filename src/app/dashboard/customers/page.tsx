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

const MOCK_CUSTOMERS = [
  {
    name: "Ana Ribeiro",
    email: "ana.ribeiro@example.com",
    farm: "Haras Serra Azul",
    status: "Active",
  },
  {
    name: "Mark Thompson",
    email: "mark.thompson@example.com",
    farm: "Thompson Performance Horses",
    status: "Past due",
  },
  {
    name: "Lucia Almeida",
    email: "lucia.almeida@example.com",
    farm: "Estância do Vale",
    status: "Canceled",
  },
];

export default async function CustomersPage() {
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
          Customers
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Placeholder customer list. This is not live billing data.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/50">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Farm</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody className="divide-y divide-slate-800/60">
            {MOCK_CUSTOMERS.map((row) => (
              <TableRow key={row.email} className="text-slate-300">
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.farm}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
