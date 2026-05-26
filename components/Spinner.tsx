interface SpinnerProps {
  size?: 'sm' | 'md';
  className?: string;
}

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClass = size === 'sm' ? 'spinner-border-sm' : '';
  return (
    <span
      className={`spinner-border ${sizeClass} ${className}`.trim()}
      role="status"
      aria-hidden="true"
    />
  );
}
