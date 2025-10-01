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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Search, X } from "lucide-react"

interface Project {
  id: string
  name: string
  auditor: string
  buildings: string[]
  createdAt: string
}

const mockProjects: Project[] = [
  {
    id: "1",
    name: "Safety Audit Q1 2024",
    auditor: "Maria Garcia",
    buildings: ["Main Office Building", "Warehouse A"],
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Fire Safety Inspection",
    auditor: "Carlos Lopez",
    buildings: ["Warehouse A"],
    createdAt: "2024-01-10",
  },
  {
    id: "3",
    name: "Emergency Systems Check",
    auditor: "Ana Martinez",
    buildings: ["Production Facility", "Storage Unit B"],
    createdAt: "2024-01-20",
  },
]

const mockAuditors = [
  { id: "1", name: "Maria Garcia" },
  { id: "2", name: "Carlos Lopez" },
  { id: "3", name: "Ana Martinez" },
  { id: "4", name: "John Perez" },
]

const mockBuildings = [
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
    auditor: "",
    buildings: [] as string[],
  })

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.buildings.some((building) => building.toLowerCase().includes(searchTerm.toLowerCase())),
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

    setFormData({ name: "", auditor: "", buildings: [] })
    setEditingProject(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      auditor: project.auditor,
      buildings: project.buildings,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setProjects(projects.filter((project) => project.id !== id))
  }

  const toggleBuilding = (buildingName: string) => {
    setFormData((prev) => ({
      ...prev,
      buildings: prev.buildings.includes(buildingName)
        ? prev.buildings.filter((b) => b !== buildingName)
        : [...prev.buildings, buildingName],
    }))
  }

  const removeBuilding = (buildingName: string) => {
    setFormData((prev) => ({
      ...prev,
      buildings: prev.buildings.filter((b) => b !== buildingName),
    }))
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
                setFormData({ name: "", auditor: "", buildings: [] })
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                  <Label htmlFor="auditor">Assigned Auditor</Label>
                  <Select
                    value={formData.auditor}
                    onValueChange={(value) => setFormData({ ...formData, auditor: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an auditor" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockAuditors.map((auditor) => (
                        <SelectItem key={auditor.id} value={auditor.name}>
                          {auditor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Buildings</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal bg-transparent">
                        {formData.buildings.length === 0 ? (
                          <span className="text-muted-foreground">Select buildings</span>
                        ) : (
                          <span>{formData.buildings.length} building(s) selected</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <div className="p-4 space-y-2">
                        {mockBuildings.map((building) => (
                          <div key={building.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={building.id}
                              checked={formData.buildings.includes(building.name)}
                              onCheckedChange={() => toggleBuilding(building.name)}
                            />
                            <label
                              htmlFor={building.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              {building.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {formData.buildings.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.buildings.map((building) => (
                        <Badge key={building} variant="secondary" className="gap-1">
                          {building}
                          <button
                            type="button"
                            onClick={() => removeBuilding(building)}
                            className="ml-1 hover:bg-muted rounded-full"
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
                <Button type="submit">{editingProject ? "Update Project" : "Create Project"}</Button>
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
                <TableHead>Auditor</TableHead>
                <TableHead>Buildings</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.auditor}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {project.buildings.map((building) => (
                        <Badge key={building} variant="outline">
                          {building}
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
