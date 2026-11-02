"use client";

import React, { useRef } from "react";
import PageHeader from "@shared/ui/page-header";
import { useUrlParameter } from "@shared/lib/useUrlParameter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/ui/tabs";
import { ProjectsContent } from "@features/projects/ui/ProjectsContent";
import { FacilitiesContent } from "@features/facilities/ui/FacilitiesContent";

const ProjectsPage: React.FC = () => {
  const [tab, setActiveTab] = useUrlParameter("tab", "projects");
  const activeTab = tab === "facilities" ? "facilities" : "projects";

  // Refs to trigger create actions in child components
  const projectsCreateRef = useRef<(() => void) | undefined>(undefined);
  const facilitiesCreateRef = useRef<(() => void) | undefined>(undefined);

  const handleCreateClick = () => {
    if (activeTab === "projects" && projectsCreateRef.current) {
      projectsCreateRef.current();
    } else if (activeTab === "facilities" && facilitiesCreateRef.current) {
      facilitiesCreateRef.current();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={activeTab === "projects" ? "Projects" : "Facilities"}
        subtitle={activeTab === "projects" ? "Organize audit work, assignments and project reports." : "Manage inspection locations and facility details."}
        primaryAction={{ label: activeTab === "projects" ? "New Project" : "New Facility", onClick: handleCreateClick }}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "projects" | "facilities")}
        className="w-full"
      >
        <TabsList aria-label="Project and facility lists">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">
          <ProjectsContent createTriggerRef={projectsCreateRef} />
        </TabsContent>

        <TabsContent value="facilities" className="mt-6">
          <FacilitiesContent createTriggerRef={facilitiesCreateRef} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectsPage;

