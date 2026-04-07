import { Sidebar } from "@/components/Sidebar";

export default function RelatoriosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
         <Sidebar />
      </div>
      <div className="pl-[220px] print:pl-0 w-full min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
