import ReportsSearchCard from "@features/reports/ui/ReportsSearchCard";
import ReportsListCard from "@features/reports/ui/ReportsListCard";
import type { ReportRowVM } from "@features/reports/ui/ReportsTable";
import PageHeader from "@shared/ui/page-header";
import { cn } from "@shared/lib/cn";

const MOCK_ITEMS: ReportRowVM[] = [
  {
    id: "RPT-001",
    auditId: "AUD-1001",
    projectName: "Green Tower – Phase A",
    auditor: "María Pérez",
    reviewer: "Juan Gómez",
    generatedDate: new Date().toISOString(),
    totalFindings: 8,
    totalCost: 15400,
  },
  {
    id: "RPT-002",
    auditId: "AUD-1002",
    projectName: "Central Park Residences",
    auditor: "Lucas Ortega",
    reviewer: "Ana Díaz",
    generatedDate: new Date(Date.now() - 86400000).toISOString(),
    totalFindings: 12,
    totalCost: 28890,
  },
  {
    id: "RPT-003",
    auditId: "AUD-1003",
    projectName: "Harbor Logistics Hub",
    auditor: "Sofía Blanco",
    reviewer: "Pablo Ruiz",
    generatedDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    totalFindings: 5,
    totalCost: 7200,
  },
];

const ReportsPage: React.FC = () => {
  return (
    <main className={cn("min-h-dv hoverflow-hidden bg-white")}>
      {/* Page header */}
      <PageHeader
        title="Generated Reports"
        subtitle="View and download all audit reports"
      />

      {/* Search card */}
      <div className="mb-6">
        <ReportsSearchCard placeholder="Search by project name, auditor, or report ID…" />
      </div>

      {/* List card con tabla */}
      <ReportsListCard
        items={MOCK_ITEMS}
        totalCount={MOCK_ITEMS.length}
        description="Complete list of generated audit reports"
        bodyMaxHeightClassName="max-h-[560px]"
      />
    </main>
  );
};

export default ReportsPage;
