import { cn } from '@/lib/utils';

export default function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-[#E5E7EB]', className)} />
  );
}
