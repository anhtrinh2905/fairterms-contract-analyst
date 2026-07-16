import "../fairterms.css";
import "./admin.css";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "./components/AdminSidebar";
import { allowMockAdminInCurrentEnv, isAdminSession } from "@/lib/auth/admin-access";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = await auth();
  const allowMockAdmin = allowMockAdminInCurrentEnv();

  // Support local automated tests with a mocked admin session
  if (allowMockAdmin && !session) {
    session = {
      user: {
        id: "mock-admin-id",
        name: "Mock Administrator",
        email: "admin@example.com",
        image: "https://lh3.googleusercontent.com/a/default-user",
      },
      expires: "2030-01-01T00:00:00.000Z",
    };
  }

  const email = session?.user?.email;

  // Verify admin access — mock mode bypasses DB check
  const isAdmin = allowMockAdmin && session ? true : await isAdminSession(session);

  if (!isAdmin) {
    redirect("/?error=unauthorized");
  }

  return (
    <div className="adm-layout">
      <AdminSidebar />
      <div className="adm-main">
        {/* Topbar */}
        <header className="adm-topbar">
          <div>
            <div className="adm-topbar-title">FairTerms — Admin Portal</div>
            <div className="adm-topbar-sub">Hệ thống quản trị và kiểm soát vận hành nội bộ</div>
          </div>
          <div className="adm-topbar-user">
            <div>
              <div className="adm-topbar-name">{session?.user?.name || "Administrator"}</div>
              <div className="adm-topbar-email">{email}</div>
            </div>
            {session?.user?.image && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={session.user.image}
                alt="Avatar"
                className="adm-avatar"
              />
            )}
          </div>
        </header>
        <main className="adm-content">
          {children}
        </main>
      </div>
    </div>
  );
}
