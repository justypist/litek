import type { FC } from "react"
import { Outlet } from "react-router-dom";

import { ThemeProvider } from "@/components/theme/provider"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar";
import { useSEO } from "@/hooks/use-seo";

export const Layout: FC = () => {
  // 使用 SEO hook 自动更新 canonical URL 和其他 SEO 元数据
  useSEO();

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <SidebarProvider>
        <AppSidebar />
        <div className="p-4 flex flex-col w-full h-[100vh] overflow-hidden">
          <nav className="flex items-center justify-between">
            <SidebarTrigger className="size-10" />
            <div role="actions" />
          </nav>
          <main className="flex-1 overflow-auto p-4 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};