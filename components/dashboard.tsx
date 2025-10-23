"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart3, Users, FileText, CheckCircle, FolderOpen, Building, GitBranch } from "lucide-react"
import { AuditsList } from "./audits-list"
import { UserManagement } from "./user-management"
import { ProjectsManagement } from "./projects-management"
import { BuildingsManagement } from "./buildings-management"
import { FlowsList } from "./flows-list"

const currentUser = {
  id: "1",
  name: "John Perez",
  email: "john@company.com",
  role: "administrator" as "auditor" | "administrator" | "qc_manager",
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  const getRoleDisplayName = (role: string) => {
    const roleMap = {
      administrator: "Project Manager",
      auditor: "Auditor",
      qc_manager: "QC Manager",
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  const getNavigationItems = (role: string) => {
    const baseItems = [
      { id: "overview", label: "Dashboard", icon: BarChart3 },
      { id: "audits", label: "Audits", icon: FileText },
      { id: "flows", label: "Flows", icon: GitBranch },
    ]

    if (role === "administrator") {
      baseItems.push(
        { id: "projects", label: "Projects", icon: FolderOpen },
        { id: "buildings", label: "Facilities", icon: Building },
        { id: "users", label: "User Management", icon: Users },
      )
    }

    return baseItems
  }

  // Métricas basadas en rol
  const getMetrics = (role: string) => {
    if (role === "administrator") {
      return {
        totalAudits: 156,
        totalProjects: 24,
        completedAudits: 142,
      }
    } else {
      // Para auditor y QC manager - métricas personales/asignadas
      return {
        myAudits: 23,
        completedAudits: 18,
        thisWeekAudits: 7,
      }
    }
  }

  const navigationItems = getNavigationItems(currentUser.role)
  const metrics = getMetrics(currentUser.role)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">Audit Management System</h1>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <Badge variant="secondary" className="capitalize">
              {getRoleDisplayName(currentUser.role)}
            </Badge>
            <Avatar>
              <AvatarImage src="/placeholder.svg?height=32&width=32" />
              <AvatarFallback>
                {currentUser.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Dashboard Overview */}
            <TabsContent value="overview" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Dashboard</h2>
                <div className="text-sm text-muted-foreground">Welcome, {currentUser.name}</div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentUser.role === "administrator" ? (
                  <>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Audits</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalAudits}</div>
                        <p className="text-xs text-muted-foreground">All system audits</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalProjects}</div>
                        <p className="text-xs text-muted-foreground">Active projects in system</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.completedAudits}</div>
                        <p className="text-xs text-muted-foreground">Finished audits</p>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Audits</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.myAudits}</div>
                        <p className="text-xs text-muted-foreground">Assigned audits</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Week</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.thisWeekAudits}</div>
                        <p className="text-xs text-muted-foreground">Scheduled audits</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.completedAudits}</div>
                        <p className="text-xs text-muted-foreground">Finished audits</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest audits completed by auditors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        title: "Project Alpha audit completed by Maria Garcia",
                        time: "2 hours ago",
                        auditor: "Maria Garcia",
                      },
                      {
                        title: "Project Beta audit completed by Carlos Lopez",
                        time: "4 hours ago",
                        auditor: "Carlos Lopez",
                      },
                      {
                        title: "Project Gamma audit completed by Ana Martinez",
                        time: "1 day ago",
                        auditor: "Ana Martinez",
                      },
                      {
                        title: "Project Delta audit completed by John Perez",
                        time: "2 days ago",
                        auditor: "John Perez",
                      },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Auditorías */}
            <TabsContent value="audits">
              <AuditsList userRole={currentUser.role} />
            </TabsContent>

            {/* Reports */}
            {/* <TabsContent value="reports">
              <ReportsList userRole={currentUser.role} />
            </TabsContent> */}

            {/* Flows */}
            <TabsContent value="flows">
              <FlowsList />
            </TabsContent>

            {/* Projects Management - Solo para administradores */}
            {currentUser.role === "administrator" && (
              <TabsContent value="projects">
                <ProjectsManagement />
              </TabsContent>
            )}

            {/* Facilities Management - Solo para administradores */}
            {currentUser.role === "administrator" && (
              <TabsContent value="buildings">
                <BuildingsManagement />
              </TabsContent>
            )}

            {/* User Management - Solo para administradores */}
            {currentUser.role === "administrator" && (
              <TabsContent value="users">
                <UserManagement />
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>
    </div>
  )
}
