import type { ReactNode } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenuButton, SidebarMenuItem, SidebarMenu, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { tools, type Tool } from "@/components/tool";
import { Link } from "react-router-dom";
import { ModeToggle } from "@/components/theme/toggle";
import { Button } from "../ui/button";
import { ChevronRight } from "lucide-react";

export const AppSidebar = () => {
  // 递归构建完整路径
  const buildFullPath = (pathSegments: string[]): string => {
    return `/tool/${pathSegments.join("/")}`;
  };

  // 递归渲染菜单项
  const renderMenuItem = (tool: Tool, parentPaths: string[] = []): ReactNode => {
    const currentPaths = [...parentPaths, tool.path];

    if (tool.children) {
      // 有子菜单的项目
      return (
        <Collapsible
          key={tool.name}
          defaultOpen={false}
          className="group/collapsible"
        >
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip={tool.description}>
                {tool.icon}
                <span>{tool.name}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {tool.children.map((child) => (
                  <SidebarMenuSubItem key={child.name}>
                    {child.children ? (
                      renderMenuItem(child, currentPaths)
                    ) : (
                      <SidebarMenuSubButton asChild>
                        <Link
                          to={buildFullPath([...currentPaths, child.path])}
                          title={child.description}
                        >
                          {child.icon}
                          <span>{child.name}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    )}
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    // 没有子菜单的项目
    return (
      <SidebarMenuItem key={tool.name}>
        <SidebarMenuButton asChild tooltip={tool.description}>
          <Link to={buildFullPath(currentPaths)}>
            {tool.icon}
            <span>{tool.name}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="text-2xl font-bold flex justify-center items-center">
        Lite Kit
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((tool) => renderMenuItem(tool))}
            </SidebarMenu>
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
  );
};