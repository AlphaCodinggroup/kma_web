"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Search, X } from "lucide-react"

interface Project {
  id: string
  name: string
  facilities: string[]
  createdAt: string
}

const mockProjects: Project[] = [
  {
    id: "1",
    name: "Safety Audit Q1 2024",
    facilities: ["Main Office Building", "Warehouse A"],
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Fire Safety Inspection",
    facilities: ["Warehouse A"],
    createdAt: "2024-01-10",
  },
  {
    id: "3",
    name: "Emergency Systems Check",
    facilities: ["Production Facility", "Storage Unit B"],
    createdAt: "2024-01-20",
  },
]

const mockFacilities = [
  { id: "1", name: "Main Office Building" },
  { id: "2", name: "Warehouse A" },
  { id: "3", name: "Production Facility" },
  { id: "4", name: "Storage Unit B" },
]

export function ProjectsManagement() {
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    facilities: [] as string[],
  })
  const [selectedFacility, setSelectedFacility] = useState("")

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.facilities.some((facility) => facility.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingProject) {
      setProjects(projects.map((project) => (project.id === editingProject.id ? { ...project, ...formData } : project)))
    } else {
      const newProject: Project = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString().split("T")[0],
      }
      setProjects([...projects, newProject])
    }

    setFormData({ name: "", facilities: [] })
    setEditingProject(null)
    setIsDialogOpen(false)
    setSelectedFacility("")
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      facilities: project.facilities,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setProjects(projects.filter((project) => project.id !== id))
  }

  const handleAddFacility = (facilityName: string) => {
    if (facilityName && !formData.facilities.includes(facilityName)) {
      setFormData({ ...formData, facilities: [...formData.facilities, facilityName] })
      setSelectedFacility("")
    }
  }

  const handleRemoveFacility = (facilityName: string) => {
    setFormData({ ...formData, facilities: formData.facilities.filter((f) => f !== facilityName) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projects Management</h2>
          <p className="text-muted-foreground">Manage audit projects and assignments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingProject(null)
                setFormData({ name: "", facilities: [] })
                setSelectedFacility("")
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
              <DialogDescription>
                {editingProject ? "Update project information" : "Add a new audit project to the system"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="facilities">Facilities</Label>
                  <div className="flex gap-2">
                    <select
                      id="facilities"
                      value={selectedFacility}
                      onChange={(e) => setSelectedFacility(e.target.value)}
                      className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select a facility</option>
                      {mockFacilities
                        .filter((facility) => !formData.facilities.includes(facility.name))
                        .map((facility) => (
                          <option key={facility.id} value={facility.name}>
                            {facility.name}
                          </option>
                        ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => handleAddFacility(selectedFacility)}
                      disabled={!selectedFacility}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.facilities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.facilities.map((facility) => (
                        <Badge key={facility} variant="secondary" className="flex items-center gap-1">
                          {facility}
                          <button
                            type="button"
                            onClick={() => handleRemoveFacility(facility)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={formData.facilities.length === 0}>
                  {editingProject ? "Update Project" : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Total projects: {projects.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Facilities</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {project.facilities.map((facility) => (
                        <Badge key={facility} variant="outline">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{project.createdAt}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(project)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(project.id)}>
                        <Trash2 className="h-4 w-4" />
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
