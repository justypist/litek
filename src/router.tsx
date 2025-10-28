import {
  createBrowserRouter,
  redirect,
  RouterProvider,
  type RouteObject,
} from "react-router-dom";

import { tools, type Tool } from "@/components/tool";
import { Layout } from "./layout";

const buildToolRoutes = (tools: Tool[]): RouteObject[] => {
  return tools.map((tool) => {
    const route: RouteObject = {
      path: tool.path,
    };

    if (tool.component) {
      route.element = tool.component;
    }

    if (tool.children && tool.children.length > 0) {
      route.children = buildToolRoutes(tool.children);
    }

    return route;
  });
};

// 路由配置
const router = createBrowserRouter([
  {
    path: "",
    element: <Layout />,
    children: [
      {
        path: "tool",
        children: [
          ...buildToolRoutes(tools),
          {
            index: true,
            loader: () => redirect("/tool/uuid"),
          },
        ],
      },
    ],
  },
  {
    index: true,
    loader: () => redirect("/tool"),
  },
  {
    path: "*",
    loader: () => redirect("/tool"),
  },
]);

// 路由提供者组件
export const AppRouter = () => <RouterProvider router={router} />;