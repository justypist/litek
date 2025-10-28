import type { ReactNode } from 'react';
import { FileJson, Hash, Binary, Network, Globe, Activity, Gauge, Wifi } from 'lucide-react'

import UUID from './uuid'
import JSON from './json'
import Base64 from './base64'
import { DNS, Ping, TCPing, SpeedTest } from './network'

export interface Tool {
  path: string;
  name: string;
  icon: ReactNode;
  description: string;
  component?: ReactNode;
  children?: Tool[];
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
  },
  {
    path: "network",
    name: "Network Tools",
    description: "Network testing tools",
    icon: <Network />,
    children: [
      {
        path: "dns",
        name: "DNS Lookup",
        description: "DNS query tool",
        icon: <Globe />,
        component: <DNS />,
      },
      {
        path: "ping",
        name: "Ping",
        description: "Ping test tool",
        icon: <Activity />,
        component: <Ping />,
      },
      {
        path: "tcping",
        name: "TCPing",
        description: "TCP port connectivity test",
        icon: <Wifi />,
        component: <TCPing />,
      },
      {
        path: "speedtest",
        name: "Speed Test",
        description: "Website speed test",
        icon: <Gauge />,
        component: <SpeedTest />,
      },
    ],
  },
];