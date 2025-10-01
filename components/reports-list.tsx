"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Download, Search } from "lucide-react"
import Link from "next/link"

interface ReportsListProps {
  userRole: string
}

export function ReportsList({ userRole }: ReportsListProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Sample reports data
  const reports = [
    {
      id: "RPT-001",
      auditId: "AUD-001",
      projectName: "Office Building Safety Audit",
      auditor: "Maria Garcia",
      reviewer: "John Perez",
      generatedDate: "2024-01-15",
      totalFindings: 8,
      totalCost: 2450.0,
      status: "Final",
    },
    {
      id: "RPT-002",
      auditId: "AUD-003",
      projectName: "Warehouse Fire Safety Check",
      auditor: "Carlos Lopez",
      reviewer: "Ana Martinez",
      generatedDate: "2024-01-12",
      totalFindings: 12,
      totalCost: 3200.0,
      status: "Final",
    },
    {
      id: "RPT-003",
      auditId: "AUD-005",
      projectName: "Restaurant Health Inspection",
      auditor: "Ana Martinez",
      reviewer: "John Perez",
      generatedDate: "2024-01-10",
      totalFindings: 5,
      totalCost: 1800.0,
      status: "Final",
    },
    {
      id: "RPT-004",
      auditId: "AUD-007",
      projectName: "School Safety Assessment",
      auditor: "John Perez",
      reviewer: "Maria Garcia",
      generatedDate: "2024-01-08",
      totalFindings: 15,
      totalCost: 4500.0,
      status: "Final",
    },
    {
      id: "RPT-005",
      auditId: "AUD-009",
      projectName: "Factory Compliance Audit",
      auditor: "Carlos Lopez",
      reviewer: "Ana Martinez",
      generatedDate: "2024-01-05",
      totalFindings: 20,
      totalCost: 6750.0,
      status: "Final",
    },
  ]

  const filteredReports = reports.filter(
    (report) =>
      report.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Generated Reports</h2>
          <p className="text-muted-foreground">View and download all audit reports</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by project name, auditor, or report ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Reports ({filteredReports.length})</CardTitle>
          <CardDescription>Complete list of generated audit reports</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report ID</TableHead>
                <TableHead>Project Name</TableHead>
                <TableHead>Auditor</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Generated Date</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.id}</TableCell>
                  <TableCell>{report.projectName}</TableCell>
                  <TableCell>{report.auditor}</TableCell>
                  <TableCell>{report.reviewer}</TableCell>
                  <TableCell>{new Date(report.generatedDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{report.totalFindings}</Badge>
                  </TableCell>
                  <TableCell>${report.totalCost.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/audits/${report.auditId}/report`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
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
