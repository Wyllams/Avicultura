import { Sidebar } from "@/components/Sidebar";

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface-container-lowest">
      <Sidebar />
      <div className="flex-1 flex flex-col pl-[220px]">
        {children}
      </div>
    </div>
  );
}
