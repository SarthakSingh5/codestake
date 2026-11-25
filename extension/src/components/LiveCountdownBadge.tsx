import { useLiveTimer } from '../hooks/useLiveTimer';

interface Props {
  expiresAt: string | number | null | undefined;
  style?: 'digital' | 'verbose';
  className?: string;
  prefix?: string;
  onExpire?: () => void;
}

export function LiveCountdownBadge({ expiresAt, style = 'digital', className = '', prefix = '⏱️ ', onExpire }: Props) {
  const { formatted, isExpired } = useLiveTimer(expiresAt, style, onExpire);

  if (!expiresAt) return null;

  return (
    <span
      className={`font-mono font-black tabular-nums inline-flex items-center gap-1 ${isExpired ? 'text-gray-500 bg-gray-200' : 'text-[#ff3333]'
        } ${className}`}
    >
      <span>{prefix}</span>
      <span>{formatted}</span>
    </span>
  );
}

