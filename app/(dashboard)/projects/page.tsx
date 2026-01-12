"use client";

import React, { useState, useRef } from "react";
import PageHeader from "@shared/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/ui/tabs";
import { ProjectsContent } from "@features/projects/ui/ProjectsContent";
import { FacilitiesContent } from "@features/facilities/ui/FacilitiesContent";

const ProjectsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"projects" | "facilities">(
    "projects"
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">
            Projects & Facilities Management
          </h1>
          <p className="text-sm text-gray-700">
            Manage audit projects and facility locations
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateClick}
          className="rounded-xl border border-gray-900 bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
        >
          {activeTab === "projects" ? "New Project" : "New Facility"}
        </button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "projects" | "facilities")}
        className="w-full"
      >
        <TabsList className="w-full justify-start bg-gray-50 border-b border-gray-200 rounded-none p-0 h-auto">
          <TabsTrigger
            value="projects"
            className="rounded-none border-b-3 border-transparent data-[state=active]:border-black data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow-sm px-8 py-3 text-gray-600 data-[state=active]:text-black transition-all"
          >
            Projects
          </TabsTrigger>
          <TabsTrigger
            value="facilities"
            className="rounded-none border-b-3 border-transparent data-[state=active]:border-black data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow-sm px-8 py-3 text-gray-600 data-[state=active]:text-black transition-all"
          >
            Facilities
          </TabsTrigger>
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

