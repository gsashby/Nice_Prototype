type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumb?: string;
  actions?: React.ReactNode;
};

export default function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11.5px] text-[#6B7280]">
        <span className="cursor-pointer text-[#2563EB] hover:underline">AI Trust Center</span>
        <span>›</span>
        <span>{breadcrumb ?? title}</span>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="flex items-center gap-2.5 text-[20px] font-bold text-[#111827] whitespace-nowrap">
          {title}
          {description && (
            <span className="text-[11.5px] font-normal text-[#9CA3AF]">{description}</span>
          )}
        </h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
