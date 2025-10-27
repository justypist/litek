import type { ReactNode } from "react";

export interface Tool {
  path: string;
  name: string;
  icon: ReactNode;
  description: string;
  component: ReactNode;
}