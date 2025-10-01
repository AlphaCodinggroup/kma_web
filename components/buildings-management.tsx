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
import { Plus, Edit, Trash2, Search, MapPin } from "lucide-react"

interface Building {
  id: string
  name: string
  address: string
  createdAt: string
}

const mockBuildings: Building[] = [
  {
    id: "1",
    name: "Main Office Building",
    address: "123 Business Ave, Downtown, NY 10001",
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    name: "Warehouse A",
    address: "456 Industrial Blvd, Industrial Park, NY 10002",
    createdAt: "2024-01-05",
  },
  {
    id: "3",
    name: "Production Facility",
    address: "789 Manufacturing St, Factory District, NY 10003",
    createdAt: "2024-01-10",
  },
  {
    id: "4",
    name: "Storage Unit B",
    address: "321 Storage Way, Logistics Center, NY 10004",
    createdAt: "2024-01-15",
  },
]

export function BuildingsManagement() {
  const [buildings, setBuildings] = useState<Building[]>(mockBuildings)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
  })

  const filteredBuildings = buildings.filter(
    (building) =>
      building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      building.address.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingBuilding) {
      setBuildings(
        buildings.map((building) => (building.id === editingBuilding.id ? { ...building, ...formData } : building)),
      )
    } else {
      const newBuilding: Building = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString().split("T")[0],
      }
      setBuildings([...buildings, newBuilding])
    }

    setFormData({ name: "", address: "" })
    setEditingBuilding(null)
    setIsDialogOpen(false)
  }

  const handleEdit = (building: Building) => {
    setEditingBuilding(building)
    setFormData({
      name: building.name,
      address: building.address,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setBuildings(buildings.filter((building) => building.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Buildings Management</h2>
          <p className="text-muted-foreground">Manage building locations for audits</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingBuilding(null)
                setFormData({ name: "", address: "" })
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Building
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBuilding ? "Edit Building" : "Add New Building"}</DialogTitle>
              <DialogDescription>
                {editingBuilding ? "Update building information" : "Add a new building to the system"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Building Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter building name"
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
              </div>
              <DialogFooter>
                <Button type="submit">{editingBuilding ? "Update Building" : "Add Building"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buildings</CardTitle>
          <CardDescription>Total buildings: {buildings.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search buildings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Building Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBuildings.map((building) => (
                <TableRow key={building.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{building.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="truncate" title={building.address}>
                      {building.address}
                    </div>
                  </TableCell>
                  <TableCell>{building.createdAt}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(building)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(building.id)}>
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
