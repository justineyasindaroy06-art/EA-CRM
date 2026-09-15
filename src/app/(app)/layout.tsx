import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { GlobalSearch } from "@/components/GlobalSearch";
import { getAllWorkspaces, getCurrentWorkspaceId } from "@/lib/workspace";
import { getSession } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [workspaces, currentWorkspaceId, session] = await Promise.all([
    getAllWorkspaces(),
    getCurrentWorkspaceId(),
    getSession(),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaces={workspaces} currentWorkspaceId={currentWorkspaceId} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-3 md:px-6">
          <GlobalSearch />
          {session && <span className="hidden text-sm text-neutral-500 md:inline">{session.email}</span>}
        </header>

        <main className="flex-1 px-4 py-6 pb-20 md:px-6 md:pb-6">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}
