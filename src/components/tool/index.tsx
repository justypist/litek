import type { ReactNode } from 'react';
import { FileJson, Hash, Binary } from 'lucide-react'

import UUID from './uuid'
import JSON from './json'
import Base64 from './base64'

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
  },
  {
    path: "base64",
    name: "Base64 Encoder/Decoder",
    description: "Encode and decode Base64",
    icon: <Binary />,
    component: <Base64 />,
  }
];