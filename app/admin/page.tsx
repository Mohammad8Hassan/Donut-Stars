import AdminDashboard from "@/app/components/admin/AdminDashboard";

export default function AdminPage() {
  // Keep the page component intentionally thin so the dashboard can stay as the
  // reusable client entry point for future nested admin routes if needed.
  return <AdminDashboard />;
}
