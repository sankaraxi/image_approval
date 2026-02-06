import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* -------- PUBLIC ROUTES -------- */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* -------- USER ROUTE -------- */}
          <Route
            path="/user"
            element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          {/* -------- ADMIN ROUTE -------- */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
