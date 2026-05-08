'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const labelMap: Record<string, string> = {
  'audit-log': 'Audit Log',
  'policy-engine': 'Policy Engine',
  'board-reports': 'Board Reports',
  'nlq': 'NL Query',
  'ai-agents': 'AI Agents',
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-400">
      <Link href="/" className="hover:text-white transition-colors">Home</Link>
      {segments.map((seg, i) => (
        <span key={seg} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          <span className={i === segments.length - 1 ? 'text-white' : ''}>
            {labelMap[seg] ?? seg}
          </span>
        </span>
      ))}
    </nav>
  );
}
