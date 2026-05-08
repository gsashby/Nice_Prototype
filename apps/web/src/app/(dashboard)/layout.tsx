import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#F2F4F7] text-[#1F2937]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
