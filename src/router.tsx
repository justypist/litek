import {
  createBrowserRouter,
  redirect,
  RouterProvider,
} from "react-router-dom";

import { tools } from "@/components/tool";
import { Layout } from "./layout";

// 路由配置
const router = createBrowserRouter([
  {
    path: "",
    element: <Layout />,
    children: [
      {
        path: "tool",
        children: [
          ...tools.map((tool) => (
            {
              path: tool.path,
              element: tool.component,
            }
          )),
          {
            index: true,
            loader: () => redirect("/tool/uuid"),
          },
        ]
      },
    ]
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