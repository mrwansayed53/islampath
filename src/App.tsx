import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import MainLayout from './layouts/MainLayout';

// Lazy-loaded Pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const QuranPage = React.lazy(() => import('./pages/QuranPage'));
const AudioQuranPage = React.lazy(() => import('./pages/AudioQuranPage'));
const ProphetsStoriesPage = React.lazy(() => import('./pages/ProphetsStoriesPage'));
const ProphetStoryDetailPage = React.lazy(() => import('./pages/ProphetStoryDetailPage'));
const HadithPage = React.lazy(() => import('./pages/HadithPage'));
const RuqyahPage = React.lazy(() => import('./pages/RuqyahPage'));
const ChildrenEducationPage = React.lazy(() => import('./pages/ChildrenEducationPage'));
const AdhkarPage = React.lazy(() => import('./pages/AdhkarPage'));

// Components
import PersistentAudioPlayer from './components/PersistentAudioPlayer';
import ErrorBoundary from './components/ErrorBoundary';
import { AudioProvider } from './contexts/AudioContext';
import { trackPageView } from './utils/analytics';

// Loading fallback
const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3"></div>
      <p className="text-gray-500 dark:text-gray-400 text-sm font-noto-arabic">جاري التحميل...</p>
    </div>
  </div>
);

function RouteChangeTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location);
  }, [location]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
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
              <Route index element={
                <Suspense fallback={<PageLoader />}>
                  <HomePage />
                </Suspense>
              } />
              <Route path="quran" element={
                <Suspense fallback={<PageLoader />}>
                  <QuranPage />
                </Suspense>
              } />
              <Route path="audio-quran" element={
                <Suspense fallback={<PageLoader />}>
                  <AudioQuranPage />
                </Suspense>
              } />
              <Route path="prophets-stories" element={
                <Suspense fallback={<PageLoader />}>
                  <ProphetsStoriesPage />
                </Suspense>
              } />
              <Route path="prophets-stories/:id" element={
                <Suspense fallback={<PageLoader />}>
                  <ProphetStoryDetailPage />
                </Suspense>
              } />
              <Route path="hadith" element={
                <Suspense fallback={<PageLoader />}>
                  <HadithPage />
                </Suspense>
              } />
              <Route path="ruqyah" element={
                <Suspense fallback={<PageLoader />}>
                  <RuqyahPage />
                </Suspense>
              } />
              <Route path="children-education" element={
                <Suspense fallback={<PageLoader />}>
                  <ChildrenEducationPage />
                </Suspense>
              } />
              <Route path="adhkar" element={
                <Suspense fallback={<PageLoader />}>
                  <AdhkarPage />
                </Suspense>
              } />
            </Route>
          </Routes>

          {/* Persistent Audio Player */}
          <PersistentAudioPlayer />
        </Router>
      </AudioProvider>
    </ErrorBoundary>
  );
}

export default App;