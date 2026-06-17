import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Welcome from './pages/Welcome';
import SopPage from './pages/Sop';
import DeliverablesPage from './pages/Deliverables';
import TimelinePage from './pages/Timeline';
import PaymentPage from './pages/Payment';

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
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/sop" element={<SopPage />} />
          <Route path="/deliverables" element={<DeliverablesPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/payment" element={<PaymentPage />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
