"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, X } from "lucide-react"

interface PDFViewerProps {
  fileUrl: string
  onClose: () => void
}

interface Comment {
  id: number
  page: number
  x: number
  y: number
  text: string
  timestamp: string
}

export function PDFViewer({ fileUrl, onClose }: PDFViewerProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [selectedPage, setSelectedPage] = useState(1)

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now(),
        page: selectedPage,
        x: Math.random() * 100,
        y: Math.random() * 100,
        text: newComment,
        timestamp: new Date().toLocaleString(),
      }
      setComments([...comments, comment])
      setNewComment("")
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            PDF Viewer with Comments
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 h-full">
          {/* PDF Viewer Area */}
          <div className="flex-1 bg-gray-100 rounded-lg p-4 relative">
            <div className="bg-white shadow-lg mx-auto" style={{ width: "595px", height: "842px" }}>
              {/* Mock PDF content */}
              <div className="p-8 h-full">
                <h2 className="text-xl font-bold mb-4">Safety Compliance Report</h2>
                <p className="mb-4">This document contains the detailed findings from the safety audit...</p>
                <div className="space-y-2">
                  <p>• Fire safety equipment inspection results</p>
                  <p>• Emergency exit accessibility assessment</p>
                  <p>• Safety protocol compliance review</p>
                </div>

                {/* Comment markers */}
                {comments
                  .filter((comment) => comment.page === selectedPage)
                  .map((comment) => (
                    <div
                      key={comment.id}
                      className="absolute w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center cursor-pointer"
                      style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                      title={comment.text}
                    >
                      <MessageSquare className="h-3 w-3" />
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Comments Panel */}
          <div className="w-80 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Comment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter your comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button onClick={handleAddComment} className="w-full">
                  Add Comment
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comments ({comments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm">{comment.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Page {comment.page} • {comment.timestamp}
                      </p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
