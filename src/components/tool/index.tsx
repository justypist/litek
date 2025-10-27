import type { ReactNode } from 'react';
import { Hash } from 'lucide-react'

import UUID from './uuid'

export interface Tool {
  path: string;
  name: string;
  icon: ReactNode;
  description: string;
  component: ReactNode;
}

export const tools: Tool[] = [
  {
    path: "uuid",
    name: "UUID Generator",
    description: "Generate a UUID",
    icon: <Hash />,
    component: <UUID />,
  }
];