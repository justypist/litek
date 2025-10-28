import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { tools } from "@/components/tool";
import { Link } from "react-router-dom";
import { ModeToggle } from "@/components/theme/toggle";
import { Button } from "../ui/button";

export const AppSidebar = () => (
  <Sidebar>
    <SidebarHeader className="text-2xl font-bold flex justify-center items-center">
      Lite Kit
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>
          Tools
        </SidebarGroupLabel>
        <SidebarGroupContent>
          {
            tools.map((tool) => (
              <SidebarMenuItem key={tool.name}>
                <SidebarMenuButton asChild>
                  <Link to={`/tool/${tool.path}`} title={tool.description}>
                    {tool.icon}
                    {tool.name}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          }
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter className="flex flex-row justify-between items-center gap-2">
      <Button variant="link">
        <a href="mailto:litek@mail.typist.cc">need more tools?</a>
      </Button>
      <ModeToggle />
    </SidebarFooter>
  </Sidebar>
)