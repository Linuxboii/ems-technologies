import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Welcome from './pages/Welcome';
import SopPage from './pages/Sop';
import RequirementsPage from './pages/Requirements';
import DeliverablesPage from './pages/Deliverables';
import PaymentPage from './pages/Payment';
import LoginPage from './pages/Login';
import AccountPage from './pages/Account';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="/sop" element={<ProtectedRoute><SopPage /></ProtectedRoute>} />
            <Route path="/requirements" element={<ProtectedRoute><RequirementsPage /></ProtectedRoute>} />
            <Route path="/deliverables" element={<ProtectedRoute><DeliverablesPage /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          </Routes>
        </main>
        <Footer />
      </AuthProvider>
    </BrowserRouter>
  );
}
