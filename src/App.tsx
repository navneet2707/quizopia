import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateQuiz from "./pages/admin/CreateQuiz";
import QuizDetail from "./pages/admin/QuizDetail";
import HeadAdminDashboard from "./pages/admin/HeadAdminDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import TakeQuiz from "./pages/student/TakeQuiz";
import ClaimRole from "./pages/ClaimRole";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Role elevation (any authenticated user can attempt) */}
            <Route
              path="/claim-role"
              element={
                <ProtectedRoute>
                  <ClaimRole />
                </ProtectedRoute>
              }
            />

            {/* Head Admin Route */}
            <Route
              path="/head-admin"
              element={
                <ProtectedRoute requiredRole="head_admin">
                  <HeadAdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes (head_admin + admin) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole={['admin', 'head_admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/quiz/new"
              element={
                <ProtectedRoute requiredRole={['admin', 'head_admin']}>
                  <CreateQuiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/quiz/:id"
              element={
                <ProtectedRoute requiredRole={['admin', 'head_admin']}>
                  <QuizDetail />
                </ProtectedRoute>
              }
            />

            {/* Student Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/quiz/:id"
              element={
                <ProtectedRoute requiredRole="student">
                  <TakeQuiz />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
