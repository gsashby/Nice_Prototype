import type { AuditEvent } from '@/types/audit';

type Props = { event: AuditEvent | null; onClose: () => void };

export default function AuditLogDrawer({ event, onClose }: Props) {
  if (!event) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="relative w-96 bg-gray-900 border-l border-gray-800 p-6 overflow-auto">
        <h2 className="text-lg font-semibold text-white mb-4">Event Detail</h2>
        <pre className="text-xs text-gray-300 whitespace-pre-wrap">
          {JSON.stringify(event, null, 2)}
        </pre>
      </aside>
    </div>
  );
}
