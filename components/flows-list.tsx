"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, Eye, GitBranch, HelpCircle } from "lucide-react"

// Mock data for flows
const mockFlows = [
  {
    id: "1",
    name: "Fire Safety Audit Flow",
    description: "Comprehensive fire safety inspection checklist",
    questionCount: 25,
    questions: [
      {
        id: "q1",
        text: "Are fire exits clearly marked and unobstructed?",
        type: "yes_no",
        conditional: null,
      },
      {
        id: "q2",
        text: "Are fire extinguishers present and properly maintained?",
        type: "yes_no",
        conditional: null,
      },
      {
        id: "q3",
        text: "What type of fire extinguisher system is installed?",
        type: "multiple_choice",
        options: ["Foam", "CO2", "Dry Powder", "Water"],
        conditional: { dependsOn: "q2", value: "yes" },
      },
      {
        id: "q4",
        text: "Is the emergency lighting system functional?",
        type: "yes_no",
        conditional: null,
      },
      {
        id: "q5",
        text: "Describe any deficiencies found in the emergency lighting",
        type: "text",
        conditional: { dependsOn: "q4", value: "no" },
      },
    ],
  },
  {
    id: "2",
    name: "Electrical Safety Flow",
    description: "Electrical systems and safety compliance check",
    questionCount: 18,
    questions: [
      {
        id: "q1",
        text: "Are all electrical panels properly labeled?",
        type: "yes_no",
        conditional: null,
      },
      {
        id: "q2",
        text: "Are GFCI outlets installed in wet areas?",
        type: "yes_no",
        conditional: null,
      },
      {
        id: "q3",
        text: "What is the condition of visible wiring?",
        type: "multiple_choice",
        options: ["Excellent", "Good", "Fair", "Poor"],
        conditional: null,
      },
    ],
  },
  {
    id: "3",
    name: "HVAC System Flow",
    description: "Heating, ventilation, and air conditioning inspection",
    questionCount: 22,
    questions: [
      {
        id: "q1",
        text: "Is the HVAC system operational?",
        type: "yes_no",
        conditional: null,
      },
      {
        id: "q2",
        text: "When was the last maintenance performed?",
        type: "date",
        conditional: { dependsOn: "q1", value: "yes" },
      },
      {
        id: "q3",
        text: "Are air filters clean and properly installed?",
        type: "yes_no",
        conditional: { dependsOn: "q1", value: "yes" },
      },
    ],
  },
  {
    id: "4",
    name: "General Building Safety Flow",
    description: "Overall building safety and structural integrity",
    questionCount: 30,
    questions: [
      {
        id: "q1",
        text: "Are all stairways and walkways in good condition?",
        type: "yes_no",
        conditional: null,
      },
      {
        id: "q2",
        text: "Is adequate lighting present throughout the building?",
        type: "yes_no",
        conditional: null,
      },
      {
        id: "q3",
        text: "Are there any visible structural issues?",
        type: "yes_no",
        conditional: null,
      },
      {
        id: "q4",
        text: "Describe the structural issues found",
        type: "text",
        conditional: { dependsOn: "q3", value: "yes" },
      },
    ],
  },
]

export function FlowsList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFlow, setSelectedFlow] = useState<(typeof mockFlows)[0] | null>(null)

  const filteredFlows = mockFlows.filter(
    (flow) =>
      flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flow.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getQuestionTypeLabel = (type: string) => {
    const typeMap = {
      yes_no: "Yes/No",
      multiple_choice: "Multiple Choice",
      text: "Text Input",
      date: "Date",
    }
    return typeMap[type as keyof typeof typeMap] || type
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Flows</h2>
          <p className="text-muted-foreground">View all audit flow templates used in the system</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search flows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Flows Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredFlows.map((flow) => (
          <Card key={flow.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{flow.name}</CardTitle>
                  <CardDescription>{flow.description}</CardDescription>
                </div>
                <GitBranch className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Questions</span>
                  <Badge variant="secondary">{flow.questionCount}</Badge>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full bg-transparent" onClick={() => setSelectedFlow(flow)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Questions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{flow.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">{flow.description}</p>

                      <div className="space-y-3">
                        <h4 className="font-medium">Questions ({flow.questions.length})</h4>
                        {flow.questions.map((question, index) => (
                          <div key={question.id} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <span className="font-medium text-sm">Q{index + 1}</span>
                              <Badge variant="outline" className="text-xs">
                                {getQuestionTypeLabel(question.type)}
                              </Badge>
                            </div>

                            <p className="text-sm">{question.text}</p>

                            {question.type === "multiple_choice" && question.options && (
                              <div className="ml-4">
                                <p className="text-xs text-muted-foreground mb-1">Options:</p>
                                <ul className="text-xs space-y-1">
                                  {question.options.map((option, optIndex) => (
                                    <li key={optIndex} className="flex items-center">
                                      <span className="w-2 h-2 rounded-full bg-muted mr-2" />
                                      {option}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {question.conditional && (
                              <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                <HelpCircle className="mr-1 h-3 w-3" />
                                Conditional: Shows when Q
                                {flow.questions.findIndex((q) => q.id === question.conditional?.dependsOn) + 1} = "
                                {question.conditional.value}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFlows.length === 0 && (
        <div className="text-center py-8">
          <GitBranch className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium">No flows found</h3>
          <p className="mt-1 text-sm text-muted-foreground">No audit flows match your search criteria.</p>
        </div>
      )}
    </div>
  )
}
