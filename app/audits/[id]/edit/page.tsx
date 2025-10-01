import { AuditEditor } from "@/components/audit-editor"

interface AuditEditPageProps {
  params: {
    id: string
  }
}

export default function AuditEditPage({ params }: AuditEditPageProps) {
  return (
    <div className="container mx-auto p-6">
      <AuditEditor auditId={params.id} />
    </div>
  )
}
