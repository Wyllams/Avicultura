import { Sidebar } from "@/components/Sidebar";

export default function MortalidadeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface-container-lowest">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-56 print:ml-0 h-screen overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
