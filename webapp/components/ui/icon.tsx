'use client';

import { FC, SVGProps } from 'react';
import dynamic from 'next/dynamic';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: string;
}

const iconComponents: { [key: string]: React.ComponentType<any> } = {
  openai: dynamic(() => import('@/icons/openai.svg')),
  ollama: dynamic(() => import('@/icons/ollama.svg')),
  xinference: dynamic(() => import('@/icons/xinference.svg')),
  knowledge: dynamic(() => import('@/icons/knowledge.svg')),
};

const Icon: FC<IconProps> = ({ name, ...props }) => {
  if (!name) return null;
  const IconComponent = iconComponents[name.toLowerCase()];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent {...props} />;
};

export { Icon }; 