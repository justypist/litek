import { Suspense, createElement, lazy } from "react";
import {
  createBrowserRouter,
  redirect,
  RouterProvider,
  type RouteObject,
} from "react-router-dom";

import { tools, type Tool } from "@/components/tool";
import { Layout } from "./layout";

// 懒加载 Transfer 组件用于独立的下载路由
const Transfer = lazy(() => import("@/components/tool/transfer"));

// 加载中的占位组件
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center flex flex-col items-center gap-3">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-4 border-muted"></div>
        <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
      <p className="text-sm text-muted-foreground font-medium">Loading...</p>
    </div>
  </div>
);

const buildToolRoutes = (tools: Tool[]): RouteObject[] => {
  return tools.map((tool) => {
    const route: RouteObject = {
      path: tool.path,
    };

    if (tool.component) {
      // 使用 Suspense 包裹懒加载组件
      route.element = (
        <Suspense fallback={<LoadingFallback />}>
          {createElement(tool.component)}
        </Suspense>
      );
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
  // 独立的分享下载路由（不在 Layout 中）
  {
    path: "share/:shareId",
    element: (
      <Suspense fallback={<LoadingFallback />}>
        {createElement(Transfer)}
      </Suspense>
    ),
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