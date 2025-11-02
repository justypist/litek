import { lazy, type ReactNode, type ComponentType } from 'react';
import { FileJson, Hash, Binary, Network, Globe, Activity, Gauge, Wifi, MapPin, Coins, Image, Share2 } from 'lucide-react'

// 懒加载工具组件
const UUID = lazy(() => import('./uuid'))
const JSON = lazy(() => import('./json'))
const Base64 = lazy(() => import('./base64'))
const Currency = lazy(() => import('./currency'))
const ImageTool = lazy(() => import('./image'))
const Transfer = lazy(() => import('./transfer'))
const DNS = lazy(() => import('./network/dns'))
const Ping = lazy(() => import('./network/ping'))
const TCPing = lazy(() => import('./network/tcping'))
const SpeedTest = lazy(() => import('./network/speedtest'))
const IPQuery = lazy(() => import('./network/ipquery'))

export interface Tool {
  path: string;
  name: string;
  icon: ReactNode;
  description: string;
  component?: ComponentType;
  children?: Tool[];
}

export const tools: Tool[] = [
  {
    path: "uuid",
    name: "UUID Generator",
    description: "Generate a UUID",
    icon: <Hash />,
    component: UUID,
  },
  {
    path: "json",
    name: "JSON Formatter",
    description: "Format and validate JSON",
    icon: <FileJson />,
    component: JSON,
  },
  {
    path: "base64",
    name: "Base64 Encoder/Decoder",
    description: "Encode and decode Base64",
    icon: <Binary />,
    component: Base64,
  },
  {
    path: "currency",
    name: "Currency Converter",
    description: "Real-time currency exchange rates",
    icon: <Coins />,
    component: Currency,
  },
  {
    path: "image",
    name: "Image Processor",
    description: "Compress, convert and resize images",
    icon: <Image />,
    component: ImageTool,
  },
  {
    path: "transfer",
    name: "File Transfer",
    description: "Temporary file sharing with passcode",
    icon: <Share2 />,
    component: Transfer,
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
        component: DNS,
      },
      {
        path: "ping",
        name: "Ping",
        description: "Ping test tool",
        icon: <Activity />,
        component: Ping,
      },
      {
        path: "tcping",
        name: "TCPing",
        description: "TCP port connectivity test",
        icon: <Wifi />,
        component: TCPing,
      },
      {
        path: "speedtest",
        name: "Speed Test",
        description: "Website speed test",
        icon: <Gauge />,
        component: SpeedTest,
      },
      {
        path: "ipquery",
        name: "IP Query",
        description: "Query IP location, quality and risk info",
        icon: <MapPin />,
        component: IPQuery,
      },
    ],
  },
];