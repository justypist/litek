import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { tools } from "@/components/tool";

export const AppSidebar = () => (
  <Sidebar>
    <SidebarHeader>
      Lite Kit
    </SidebarHeader>
    <SidebarContent>
      {
        tools.map((tool) => (
          <SidebarMenuItem key={tool.name}>
            <SidebarMenuButton>
              {tool.icon}
              {tool.name}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))
      }
    </SidebarContent>
    <SidebarFooter>
      <a href="mailto:litek@mail.typist.cc">contact us</a>
    </SidebarFooter>
  </Sidebar>
)