import { Hash } from 'lucide-react'

import type { Tool } from "./type";
import { UUID } from './uuid'

export const tools: Tool[] = [
  {
    path: "uuid",
    name: "UUID Generator",
    description: "Generate a UUID",
    icon: <Hash />,
    component: <UUID />,
  }
];