import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface TreeIconButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  title: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export const TreeIconButton: React.FC<TreeIconButtonProps> = ({
  icon: Icon,
  onClick,
  title,
  variant = 'outline',
  size = 'sm',
  className = '',
}) => {
  return (
    <Button
      size={size}
      variant={variant}
      onClick={onClick}
      className={`h-8 w-8 p-0 ${className}`}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
};

