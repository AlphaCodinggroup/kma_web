import { AuditReport } from "@/components/audit-report"

interface AuditReportPageProps {
  params: {
    id: string
  }
}

export default function AuditReportPage({ params }: AuditReportPageProps) {
  return (
    <div className="container mx-auto p-6">
      <AuditReport auditId={params.id} />
    </div>
  )
}
