"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { FileText, ArrowLeft, Filter, Download, MessageSquare, X, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { PDFViewer } from "./pdf-viewer"

interface AuditEditorProps {
  auditId: string
}

const mockAudit = {
  id: "AUD-001",
  title: "Safety Compliance Audit - Building A",
  auditor: "John Smith",
  status: "Completed",
  auditDate: "2024-01-15",
  completedDate: "2024-01-20",
  questions: [
    {
      id: 1,
      question: "Are all fire exits clearly marked and unobstructed?",
      answer: "Yes",
      notes: "All exits properly marked with illuminated signs",
      attachments: [],
    },
    {
      id: 2,
      question: "Is emergency lighting functional?",
      answer: "Yes",
      notes: "All emergency lights tested and working",
      attachments: [],
    },
    {
      id: 3,
      question: "Is emergency equipment accessible and functional?",
      answer: "No",
      notes: "Fire extinguisher on 2nd floor needs maintenance",
      attachments: [
        { id: 1, name: "fire-extinguisher-maintenance.pdf", type: "pdf", url: "/fire-extinguisher-maintenance.jpg" },
        { id: 2, name: "equipment-photos.jpg", type: "image", url: "/emergency-lighting.png" },
      ],
    },
    {
      id: 4,
      question: "Are first aid kits properly stocked?",
      answer: "No",
      notes: "Missing bandages and antiseptic",
      attachments: [{ id: 3, name: "first-aid-inventory.pdf", type: "pdf", url: "/first-aid-kit-supplies.jpg" }],
    },
  ],
  reportData: [
    {
      id: 1,
      comments: "Fire extinguisher requires immediate maintenance and recertification",
      photos: ["/fire-extinguisher-maintenance.jpg"],
      quantity: "1 unit",
      totalCost: "$150.00",
    },
    {
      id: 2,
      comments: "First aid kit needs restocking with essential supplies",
      photos: ["/first-aid-kit-supplies.jpg"],
      quantity: "2 kits",
      totalCost: "$85.00",
    },
    {
      id: 3,
      comments: "Emergency lighting system backup battery replacement",
      photos: ["/emergency-lighting.png"],
      quantity: "3 units",
      totalCost: "$220.00",
    },
  ],
}

export function AuditEditor({ auditId }: AuditEditorProps) {
  const router = useRouter()
  const [audit] = useState(mockAudit)
  const [showAllQuestions, setShowAllQuestions] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [reportData, setReportData] = useState(audit.reportData)
  const [editingComments, setEditingComments] = useState<{ [key: number]: boolean }>({})
  const [comments, setComments] = useState<{
    [key: number]: Array<{ id: number; text: string; author: string; timestamp: string }>
  }>({})
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({})
  const [showComments, setShowComments] = useState<{ [key: number]: boolean }>({})

  const filteredQuestions = showAllQuestions ? audit.questions : audit.questions.filter((q) => q.answer === "Yes")

  const addComment = (itemId: number) => {
    if (!newComment[itemId]?.trim()) return

    const comment = {
      id: Date.now(),
      text: newComment[itemId],
      author: "Current User",
      timestamp: new Date().toLocaleString(),
    }

    setComments((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), comment],
    }))

    setNewComment((prev) => ({ ...prev, [itemId]: "" }))
  }

  const toggleEditComments = (id: number) => {
    setEditingComments((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleComments = (itemId: number) => {
    setShowComments((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const exportToPDF = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Audits
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{audit.title}</h1>
            <p className="text-muted-foreground">
              Audit ID: {audit.id} • Auditor: {audit.auditor}
            </p>
          </div>
        </div>
        <Badge variant="secondary">{audit.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Audit Date</label>
            <p className="text-sm">{audit.auditDate}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Completed Date</label>
            <p className="text-sm">{audit.completedDate}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="questions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="questions">Questions & Attachments</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{showAllQuestions ? "All Questions" : "Questions Answered YES"}</h3>
            <Button variant="outline" onClick={() => setShowAllQuestions(!showAllQuestions)}>
              <Filter className="h-4 w-4 mr-2" />
              {showAllQuestions ? "Show YES Only" : "Show All Questions"}
            </Button>
          </div>

          {filteredQuestions.map((question) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-lg">{question.question}</CardTitle>
                <Badge variant={question.answer === "Yes" ? "default" : "destructive"}>{question.answer}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Auditor Notes</label>
                  <p className="text-sm text-muted-foreground mt-1">{question.notes}</p>
                </div>

                {question.attachments.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Attachments</label>
                    <div className="mt-2 space-y-2">
                      {question.attachments.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setSelectedFile(file.url)}>
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="report">
          <div className="flex gap-6 h-[800px]">
            {/* Left side - Report */}
            <div className="flex-1 overflow-y-auto">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Final Report</CardTitle>
                  <Button onClick={exportToPDF} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export to PDF
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {reportData.map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors relative group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-semibold text-lg">Finding #{item.id}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleComments(item.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Comment
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <h4 className="font-medium mb-2">Description</h4>
                            <p className="text-sm text-gray-700 mb-4">{item.comments}</p>

                            <h4 className="font-medium mb-2">Evidence Photos</h4>
                            <div className="flex gap-2 mb-4">
                              {item.photos.map((photo, index) => (
                                <img
                                  key={index}
                                  src={photo || "/placeholder.svg"}
                                  alt={`Evidence ${index + 1}`}
                                  className="w-24 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setSelectedFile(photo)}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-1">Quantity</h4>
                              <p className="text-sm font-semibold">{item.quantity}</p>
                            </div>
                            <div>
                              <h4 className="font-medium mb-1">Total Cost</h4>
                              <p className="text-lg font-bold text-green-600">{item.totalCost}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right side - Comments Panel */}
            <div className="w-80 border-l bg-gray-50">
              <div className="p-4 border-b bg-white">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                </h3>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto h-full">
                {Object.keys(showComments).some((key) => showComments[Number.parseInt(key)]) ? (
                  Object.entries(showComments)
                    .filter(([_, show]) => show)
                    .map(([itemId]) => {
                      const id = Number.parseInt(itemId)
                      const itemComments = comments[id] || []

                      return (
                        <div key={id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Finding #{id}</h4>
                            <Button variant="ghost" size="sm" onClick={() => toggleComments(id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Existing comments */}
                          <div className="space-y-2">
                            {itemComments.map((comment) => (
                              <div key={comment.id} className="bg-white p-3 rounded-lg border text-sm">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-medium text-xs text-gray-600">{comment.author}</span>
                                  <span className="text-xs text-gray-400">{comment.timestamp}</span>
                                </div>
                                <p className="text-gray-800">{comment.text}</p>
                              </div>
                            ))}
                          </div>

                          {/* Add new comment */}
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Add a comment..."
                              value={newComment[id] || ""}
                              onChange={(e) => setNewComment((prev) => ({ ...prev, [id]: e.target.value }))}
                              className="text-sm min-h-[80px]"
                            />
                            <Button
                              size="sm"
                              onClick={() => addComment(id)}
                              disabled={!newComment[id]?.trim()}
                              className="w-full"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Comment
                            </Button>
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <div className="text-center text-gray-500 text-sm mt-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Click "Comment" on any finding to start a discussion</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {selectedFile && <PDFViewer fileUrl={selectedFile} onClose={() => setSelectedFile(null)} />}
    </div>
  )
}
