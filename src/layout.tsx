import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Sidebar } from "@/components/ui/sidebar"
import type { FC } from "react"
import { Outlet } from "react-router-dom";

export const Layout: FC = () => (
  <SidebarProvider>
    <Sidebar />
    <main>
      <SidebarTrigger />
      <Outlet />
    </main>
  </SidebarProvider>
);