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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Search, MapPin, X } from "lucide-react"

interface Facility {
  id: string
  name: string
  address: string
  auditors: string[]
  createdAt: string
}

const mockFacilities: Facility[] = [
  {
    id: "1",
    name: "Main Office Building",
    address: "123 Business Ave, Downtown, NY 10001",
    auditors: ["Maria Garcia", "Carlos Lopez"],
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Warehouse A",
    address: "456 Industrial Blvd, Industrial Park, NY 10002",
    auditors: ["Carlos Lopez"],
    createdAt: "2024-01-05",
  },
  {
    id: "3",
    name: "Production Facility",
    address: "789 Manufacturing St, Factory District, NY 10003",
    auditors: ["Ana Martinez", "John Perez"],
    createdAt: "2024-01-10",
  },
  {
    id: "4",
    name: "Storage Unit B",
    address: "321 Storage Way, Logistics Center, NY 10004",
    auditors: ["John Perez"],
    createdAt: "2024-01-15",
  },
]

const mockAuditors = [
  { id: "1", name: "Maria Garcia" },
  { id: "2", name: "Carlos Lopez" },
  { id: "3", name: "Ana Martinez" },
  { id: "4", name: "John Perez" },
]

export function BuildingsManagement() {
  const [facilities, setFacilities] = useState<Facility[]>(mockFacilities)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    auditors: [] as string[],
  })
  const [selectedAuditor, setSelectedAuditor] = useState("")

  const filteredFacilities = facilities.filter(
    (facility) =>
      facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      facility.auditors.some((auditor) => auditor.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingFacility) {
      setFacilities(
        facilities.map((facility) => (facility.id === editingFacility.id ? { ...facility, ...formData } : facility)),
      )
    } else {
      const newFacility: Facility = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString().split("T")[0],
      }
      setFacilities([...facilities, newFacility])
    }

    setFormData({ name: "", address: "", auditors: [] })
    setEditingFacility(null)
    setIsDialogOpen(false)
    setSelectedAuditor("")
  }

  const handleEdit = (facility: Facility) => {
    setEditingFacility(facility)
    setFormData({
      name: facility.name,
      address: facility.address,
      auditors: facility.auditors,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setFacilities(facilities.filter((facility) => facility.id !== id))
  }

  const handleAddAuditor = (auditorName: string) => {
    if (auditorName && !formData.auditors.includes(auditorName)) {
      setFormData({ ...formData, auditors: [...formData.auditors, auditorName] })
      setSelectedAuditor("")
    }
  }

  const handleRemoveAuditor = (auditorName: string) => {
    setFormData({ ...formData, auditors: formData.auditors.filter((a) => a !== auditorName) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Facilities Management</h2>
          <p className="text-muted-foreground">Manage facility locations for audits</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingFacility(null)
                setFormData({ name: "", address: "", auditors: [] })
                setSelectedAuditor("")
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Facility
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingFacility ? "Edit Facility" : "Add New Facility"}</DialogTitle>
              <DialogDescription>
                {editingFacility ? "Update facility information" : "Add a new facility to the system"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Facility Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter facility name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter complete address"
                    required
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="auditors">Assigned Auditors</Label>
                  <div className="flex gap-2">
                    <select
                      id="auditors"
                      value={selectedAuditor}
                      onChange={(e) => setSelectedAuditor(e.target.value)}
                      className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select an auditor</option>
                      {mockAuditors
                        .filter((auditor) => !formData.auditors.includes(auditor.name))
                        .map((auditor) => (
                          <option key={auditor.id} value={auditor.name}>
                            {auditor.name}
                          </option>
                        ))}
                    </select>
                    <Button type="button" onClick={() => handleAddAuditor(selectedAuditor)} disabled={!selectedAuditor}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.auditors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.auditors.map((auditor) => (
                        <Badge key={auditor} variant="secondary" className="flex items-center gap-1">
                          {auditor}
                          <button
                            type="button"
                            onClick={() => handleRemoveAuditor(auditor)}
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
                <Button type="submit">{editingFacility ? "Update Facility" : "Add Facility"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facilities</CardTitle>
          <CardDescription>Total facilities: {facilities.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search facilities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Auditors</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFacilities.map((facility) => (
                <TableRow key={facility.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{facility.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate" title={facility.address}>
                      {facility.address}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {facility.auditors.map((auditor) => (
                        <Badge key={auditor} variant="outline">
                          {auditor}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{facility.createdAt}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(facility)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(facility.id)}>
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
