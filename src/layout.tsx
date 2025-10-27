import type { FC } from "react"
import { Outlet } from "react-router-dom";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar";

export const Layout: FC = () => (
  <SidebarProvider>
    <AppSidebar />
    <div className="p-4 flex flex-col w-full h-[100vh]">
      <nav className="flex items-center justify-between">
        <SidebarTrigger className="size-10" />
        <div role="actions" />
      </nav>
      <main className="flex-1 overflow-auto p-4">
        <Outlet />
      </main>
    </div>
  </SidebarProvider>
);