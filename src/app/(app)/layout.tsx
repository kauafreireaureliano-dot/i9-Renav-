import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { NAV_ITEMS } from "@/lib/nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(user.role, item.permission)
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-black text-white shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <span className="text-xl font-bold tracking-tight">
            I9 <span className="text-primary">AUTO</span>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav items={items} />
        </div>
        <div className="px-6 py-4 border-t border-white/10 text-xs text-neutral-500">
          I9 Car Multimarcas
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <div className="lg:hidden font-bold">
            I9 <span className="text-primary">AUTO</span>
          </div>
          <div className="flex-1" />
          <UserMenu name={user.name} role={user.role} />
        </header>
        <main className="flex-1 p-6 bg-muted/30">{children}</main>
      </div>
    </div>
  );
}
