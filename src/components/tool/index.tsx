import type { ReactNode } from 'react';
import { FileJson, Hash } from 'lucide-react'

import UUID from './uuid'
import JSON from './json'

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
  },
  {
    path: "json",
    name: "JSON Formatter",
    description: "Format and validate JSON",
    icon: <FileJson />,
    component: <JSON />,
  }
];