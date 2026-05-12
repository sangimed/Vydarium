import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Shell } from "./components/Shell";
import { AddVideo } from "./pages/AddVideo";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { SearchPage } from "./pages/SearchPage";
import { Settings } from "./pages/Settings";
import { VideoDetail } from "./pages/VideoDetail";
import { VideoList } from "./pages/VideoList";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="add" element={<AddVideo />} />
          <Route path="videos" element={<VideoList />} />
          <Route path="videos/:id" element={<VideoDetail />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}

function RequireAuth() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center bg-[#f7f7f3] text-stone-700">Loading</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
