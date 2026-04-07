import { Sidebar } from "@/components/Sidebar";

export default function GranjasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="pl-[220px] w-full min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
