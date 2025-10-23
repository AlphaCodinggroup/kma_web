"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface AuditReportProps {
  auditId: string
}

// Mock report data - replace with actual API calls
const mockReportData = {
  id: "AUD-001",
  title: "Safety Compliance Audit - Building A",
  auditor: "John Smith",
  reviewer: "Sarah Johnson",
  auditDate: "2024-01-15",
  completedDate: "2024-01-20",
  reviewDate: "2024-01-22",
  status: "Approved",
  findings: [
    {
      id: 1,
      category: "Fire Safety",
      description: "Fire exit signage replacement required",
      severity: "Medium",
      quantity: 8,
      unitPrice: 45.0,
      totalPrice: 360.0,
      photos: ["/fire-exit-sign.jpg", "/emergency-lighting.png"],
    },
    {
      id: 2,
      category: "Equipment Maintenance",
      description: "Fire extinguisher servicing",
      severity: "High",
      quantity: 3,
      unitPrice: 85.0,
      totalPrice: 255.0,
      photos: ["/fire-extinguisher-maintenance.jpg"],
    },
    {
      id: 3,
      category: "Safety Equipment",
      description: "First aid kit restocking",
      severity: "Low",
      quantity: 5,
      unitPrice: 25.0,
      totalPrice: 125.0,
      photos: ["/first-aid-kit-supplies.jpg"],
    },
  ],
  summary: {
    totalFindings: 3,
    totalCost: 740.0,
    highSeverity: 1,
    mediumSeverity: 1,
    lowSeverity: 1,
  },
}

export function AuditReport({ auditId }: AuditReportProps) {
  const router = useRouter()
  const [report] = useState(mockReportData)

  const handleDownload = () => {
    // Mock download functionality
    console.log("Downloading report...")
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Audit Report</h1>
            <p className="text-muted-foreground">Generated on {report.reviewDate}</p>
          </div>
        </div>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Report Header */}
      <Card>
        <CardHeader className="text-center border-b">
          <CardTitle className="text-3xl font-bold text-primary">AUDIT REPORT</CardTitle>
          <p className="text-lg text-muted-foreground">{report.title}</p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="font-medium text-muted-foreground">Audit ID</label>
              <p className="font-mono">{report.id}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Auditor</label>
              <p>{report.auditor}</p>
            </div>
            <div>
              <label className="font-medium text-muted-foreground">Reviewer</label>
              <p>{report.reviewer}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{report.summary.totalFindings}</div>
              <div className="text-sm text-muted-foreground">Total Findings</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">${report.summary.totalCost.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Findings */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Detailed Findings</h2>
        {report.findings.map((finding, index) => (
          <Card key={finding.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {index + 1}. {finding.description}
                </CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">{finding.category}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photos */}
              <div>
                <h4 className="font-medium mb-3">Evidence Photos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {finding.photos.map((photo, photoIndex) => (
                    <div
                      key={photoIndex}
                      className="group relative aspect-[4/3] bg-muted rounded-xl overflow-hidden border-2 border-border hover:border-primary transition-all duration-300 hover:shadow-lg"
                    >
                      <Image
                        src={photo || "/placeholder.svg"}
                        alt={`Evidence photo ${photoIndex + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Photo {photoIndex + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Cost Analysis</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="text-muted-foreground">Quantity</label>
                    <p className="font-medium">{finding.quantity} units</p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">Unit Price</label>
                    <p className="font-medium">${finding.unitPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">Total Cost</label>
                    <p className="font-bold text-primary">${finding.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer */}
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This report was generated on {report.reviewDate} and reviewed by {report.reviewer}
            </p>
            <p className="text-xs text-muted-foreground">Report ID: {report.id} | Page 1 of 1</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
