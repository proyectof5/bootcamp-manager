import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const;

/**
 * Spinner compartido. Migrado a Tailwind + lucide en spec 0008.
 * API compatible con los usos previos (size: 'sm' | 'md').
 */
export default function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin inline-block', sizeMap[size], className)}
      role="status"
      aria-label="Cargando"
    />
  );
}
