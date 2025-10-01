"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

interface ReviewChecklistProps {
  auditId: string
  onProgressChange: (progress: number) => void
  onComplete: () => void
  onBack: () => void
}

const reviewItems = [
  { id: 1, title: "Verify all questions were answered completely", category: "Completeness" },
  { id: 2, title: "Check that all required attachments are present", category: "Documentation" },
  { id: 3, title: "Review photo quality and relevance", category: "Documentation" },
  { id: 4, title: "Validate compliance with safety standards", category: "Compliance" },
  { id: 5, title: "Confirm corrective actions are appropriate", category: "Compliance" },
  { id: 6, title: "Verify auditor qualifications and signatures", category: "Authorization" },
  { id: 7, title: "Check date accuracy and timeline compliance", category: "Timeline" },
  { id: 8, title: "Review overall audit methodology", category: "Quality" },
  { id: 9, title: "Validate risk assessments and ratings", category: "Risk Management" },
  { id: 10, title: "Final quality assurance check", category: "Quality" },
]

export function ReviewChecklist({ auditId, onProgressChange, onComplete, onBack }: ReviewChecklistProps) {
  const router = useRouter()
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [showReport, setShowReport] = useState(false)

  const handleItemCheck = (itemId: number, checked: boolean) => {
    const newCheckedItems = new Set(checkedItems)
    if (checked) {
      newCheckedItems.add(itemId)
    } else {
      newCheckedItems.delete(itemId)
    }
    setCheckedItems(newCheckedItems)

    const progress = (newCheckedItems.size / reviewItems.length) * 100
    onProgressChange(progress)
  }

  const isComplete = checkedItems.size === reviewItems.length

  const handleGenerateReport = () => {
    setShowReport(true)
    setTimeout(() => {
      router.push(`/audits/${auditId}/report`)
    }, 2000)
  }

  const groupedItems = reviewItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, typeof reviewItems>,
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Audit
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Review Checklist</h1>
            <p className="text-muted-foreground">Audit ID: {auditId}</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Review Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completed Items</span>
              <span>
                {checkedItems.size} of {reviewItems.length}
              </span>
            </div>
            <Progress value={(checkedItems.size / reviewItems.length) * 100} />
          </div>
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      <div className="space-y-4">
        {Object.entries(groupedItems).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={checkedItems.has(item.id)}
                      onCheckedChange={(checked) => handleItemCheck(item.id, checked as boolean)}
                    />
                    <label
                      htmlFor={`item-${item.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {item.title}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generate Report */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Generate Final Report</h3>
              <p className="text-sm text-muted-foreground">Complete all checklist items to generate the audit report</p>
            </div>
            <Button
              onClick={handleGenerateReport}
              disabled={!isComplete || showReport}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {showReport ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
