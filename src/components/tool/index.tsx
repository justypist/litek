interface Tool {
  name: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

export const tools: Tool[] = [];