import {
  createBrowserRouter,
  redirect,
  RouterProvider,
} from "react-router-dom";

import { Layout } from "./layout";
import { tools } from "@/components/tool";

// 路由配置
const router = createBrowserRouter([
  {
    path: "",
    element: <Layout />,
    children: [
      {
        path: "tools",
        children: [
          ...tools.map((tool) => (
            {
              path: tool.name,
              element: tool.component,
            }
          )),
          {
            index: true,
            element: null,
          },
        ]
      },
    ]
  },
  {
    index: true,
    loader: () => {
      return redirect("/tools");
    },
  },
  {
    path: "*",
    loader: () => {
      return redirect("/tools");
    },
  },
]);

// 路由提供者组件
export const AppRouter = () => <RouterProvider router={router} />;