import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import MainLayout from './layouts/MainLayout';

// Pages
import HomePage from './pages/HomePage';
import QuranPage from './pages/QuranPage';
import AudioQuranPage from './pages/AudioQuranPage';
import ProphetsStoriesPage from './pages/ProphetsStoriesPage';
import ProphetStoryDetailPage from './pages/ProphetStoryDetailPage';
import HadithPage from './pages/HadithPage';
import RuqyahPage from './pages/RuqyahPage';
import ChildrenEducationPage from './pages/ChildrenEducationPage';
import AdhkarPage from './pages/AdhkarPage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminHadithPage from './pages/admin/AdminHadithPage';
import AdminProphetsPage from './pages/admin/AdminProphetsPage';
import AdminAdhkarPage from './pages/admin/AdminAdhkarPage';
import AdminRecitersPage from './pages/admin/AdminRecitersPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import AdminRedirect from './components/AdminRedirect';
import PersistentAudioPlayer from './components/PersistentAudioPlayer';
import { AudioProvider } from './contexts/AudioContext';
import { trackPageView } from './utils/analytics';

function RouteChangeTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location);
  }, [location]);

  return null;
}

function App() {
  return (
    <AudioProvider>
      <Router>
        <RouteChangeTracker />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#1E6F5C',
              border: '1px solid #1E6F5C',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'Noto Sans Arabic, sans-serif'
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="quran" element={<QuranPage />} />
          <Route path="audio-quran" element={<AudioQuranPage />} />
          <Route path="prophets-stories" element={<ProphetsStoriesPage />} />
          <Route path="prophets-stories/:id" element={<ProphetStoryDetailPage />} />
          <Route path="hadith" element={<HadithPage />} />
          <Route path="ruqyah" element={<RuqyahPage />} />
          <Route path="children-education" element={<ChildrenEducationPage />} />
          <Route path="adhkar" element={<AdhkarPage />} />
        </Route>
        
        {/* Admin Login Route (outside MainLayout) */}
        <Route path="admin/login" element={<AdminLoginPage />} />
        
        {/* Protected Admin Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route path="admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="admin/hadiths" element={<ProtectedRoute><AdminHadithPage /></ProtectedRoute>} />
          <Route path="admin/prophets" element={<ProtectedRoute><AdminProphetsPage /></ProtectedRoute>} />
          <Route path="admin/adhkar" element={<ProtectedRoute><AdminAdhkarPage /></ProtectedRoute>} />
          <Route path="admin/reciters" element={<ProtectedRoute><AdminRecitersPage /></ProtectedRoute>} />
        </Route>
      </Routes>

      {/* Persistent Audio Player */}
      <PersistentAudioPlayer />
    </Router>
    </AudioProvider>
  );
}

export default App;