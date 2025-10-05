import DashboardActivitySection from "@widgets/dashboard/DashboardActivitySection";
import DashboardMetrics from "@widgets/dashboard/DashboardMetrics";

const activity = [
  {
    project: "Project Alpha",
    auditor: "Maria Garcia",
    time: "2 hours ago",
    variant: "success" as const,
  },
  {
    project: "Project Beta",
    auditor: "Carlos Lopez",
    time: "4 hours ago",
    variant: "neutral" as const,
  },
  {
    project: "Project Gamma",
    auditor: "Ana Martinez",
    time: "1 day ago",
    variant: "warning" as const,
  },
  {
    project: "Project Delta",
    auditor: "John Perez",
    time: "2 days ago",
    variant: "success" as const,
  },
];

const metrics = [
  {
    title: "Total Audits",
    value: "156",
    subtitle: "All system audits",
    icon: "file-text" as const,
  },
  {
    title: "Total Projects",
    value: "24",
    subtitle: "Active projects in system",
    icon: "bar-chart-3" as const,
  },
  {
    title: "Completed",
    value: "142",
    subtitle: "Finished audits",
    icon: "check-circle-2" as const,
  },
];

const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <span className="text-sm text-gray-700">Welcome, John Perez</span>
      </div>
      <DashboardMetrics items={metrics} />
      <DashboardActivitySection items={activity} />
    </div>
  );
};
export default DashboardPage;
