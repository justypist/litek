import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenuButton, SidebarMenuItem, SidebarMenu, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { tools, type Tool } from "@/components/tool";


export const AppSidebar = () => {
  // 递归构建完整路径
  const buildFullPath = (pathSegments: string[]): string => {
    return `/tool/${pathSegments.join("/")}`;
  };

  // 递归渲染子菜单内容
  const renderSubMenuContent = (child: Tool, currentPaths: string[]): ReactNode => {
    if (child.children) {
      // 子菜单内的可折叠项
      return (
        <Collapsible defaultOpen={false} className="group/collapsible">
          <CollapsibleTrigger asChild>
            <SidebarMenuSubButton>
              {child.icon}
              <span>{child.name}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuSubButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {child.children.map((subChild) => (
                <SidebarMenuSubItem key={subChild.name}>
                  {renderSubMenuContent(subChild, [...currentPaths, child.path])}
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // 叶子节点
    return (
      <SidebarMenuSubButton asChild>
        <Link
          to={buildFullPath([...currentPaths, child.path])}
          title={child.description}
        >
          {child.icon}
          <span>{child.name}</span>
        </Link>
      </SidebarMenuSubButton>
    );
  };

  // 递归渲染菜单项
  const renderMenuItem = (tool: Tool, parentPaths: string[] = []): ReactNode => {
    const currentPaths = [...parentPaths, tool.path];

    if (tool.children) {
      // 有子菜单的项目
      return (
        <SidebarMenuItem key={tool.name}>
          <Collapsible
            defaultOpen={false}
            className="group/collapsible"
          >
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
                    {renderSubMenuContent(child, currentPaths)}
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
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
      <SidebarFooter className="flex flex-col gap-2" />
    </Sidebar>
  );
};