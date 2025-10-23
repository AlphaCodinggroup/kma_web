"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Edit } from "lucide-react"
import { useRouter } from "next/navigation"

interface AuditsListProps {
  userRole: "auditor" | "administrator" | "qc_manager"
}

export function AuditsList({ userRole }: AuditsListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

  const audits = [
    {
      id: "AUD-001",
      project: "Alpha Project",
      auditor: "Maria Garcia",
      status: "completed",
      auditDate: "2024-01-15",
    },
    {
      id: "AUD-002",
      project: "Beta Project",
      auditor: "Carlos Lopez",
      status: "in_review",
      auditDate: "2024-01-20",
    },
    {
      id: "AUD-003",
      project: "Gamma Project",
      auditor: "Ana Martin",
      status: "pending_review",
      auditDate: "2024-01-25",
    },
    {
      id: "AUD-004",
      project: "Delta Project",
      auditor: "John Perez",
      status: "in_review",
      auditDate: "2024-01-18",
    },
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: "Completed", variant: "default" as const },
      in_review: { label: "In Review", variant: "secondary" as const },
      pending_review: { label: "Pending Review", variant: "outline" as const },
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const handleEditAudit = (auditId: string) => {
    router.push(`/audits/${auditId}/edit`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audits</h2>
          <p className="text-muted-foreground">
            {userRole === "administrator" ? "Manage all system audits" : "Manage your assigned audits"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search audits..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Auditor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Audit Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits
                .filter(
                  (audit) =>
                    audit.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    audit.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    audit.id.toLowerCase().includes(searchTerm.toLowerCase()),
                )
                .map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">{audit.id}</TableCell>
                    <TableCell>{audit.project}</TableCell>
                    <TableCell>{audit.auditor}</TableCell>
                    <TableCell>{getStatusBadge(audit.status)}</TableCell>
                    <TableCell>{audit.auditDate}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEditAudit(audit.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
