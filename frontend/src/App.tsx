import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { Toaster } from '@/components/ui/sonner';
import Layout from '@/components/Layout/Layout';
import SignIn from '@/pages/SignIn';
import SignUp from '@/pages/SignUp';
import Dashboard from '@/pages/Dashboard';
import MyBooks from '@/pages/MyBooks';
import DocumentView from '@/pages/DocumentView';
import LessonView from '@/pages/LessonView';
import KnowledgeBase from '@/pages/KnowledgeBase';
import ChatView from '@/pages/ChatView';
import StudyPlanner from '@/pages/StudyPlanner';
import Groups from '@/pages/Groups';
import GroupDetail from '@/pages/GroupDetail';
import Settings from '@/pages/Settings';
import LearningDashboard from '@/pages/LearningDashboard';
import ChapterReader from '@/pages/ChapterReader';
import Quiz from '@/pages/Quiz';
import ProgressAnalytics from '@/pages/ProgressAnalytics';
import LessonWorkspace from '@/pages/LessonWorkspace';
import KnowledgeBaseDetail from '@/pages/KnowledgeBaseDetail';
import DocumentViewer from '@/components/DocumentViewer';
import DownloadManager from '@/components/DownloadManager';
import Pricing from '@/pages/Pricing';
import Subscription from '@/pages/Subscription';
import { DashboardSkeleton } from '@/components/SkeletonLoader';

// Lazy load heavy components for better performance
const AnalyticsDashboard = lazy(() => import('@/pages/AnalyticsDashboard'));
const FlashcardStudy = lazy(() => import('@/components/FlashcardStudy'));
const FlashcardManager = lazy(() => import('@/components/FlashcardManager'));
const PracticeProblems = lazy(() => import('@/components/PracticeProblems'));
const MindMapGenerator = lazy(() => import('@/components/MindMapGenerator'));
const ComprehensiveLessonGenerator = lazy(() => import('@/components/ComprehensiveLessonGenerator'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/signin" />;
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="learnsynth-theme">
      <AuthProvider>
        <CurrencyProvider>
          <SubscriptionProvider>
            <SocketProvider>
              <BrowserRouter>
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="books" element={<MyBooks />} />
              <Route path="documents/:id" element={<DocumentView />} />
              <Route path="lessons/:id" element={<LessonView />} />
              <Route path="learning/dashboard/:documentId" element={<LearningDashboard />} />
              <Route path="learning/chapter/:chapterId" element={<ChapterReader />} />
              <Route path="learning/quiz/:chapterId" element={<Quiz />} />
              <Route path="learning/analytics/:documentId" element={<ProgressAnalytics />} />
              <Route path="workspace/:documentId" element={<LessonWorkspace />} />
              <Route path="knowledge" element={<KnowledgeBase />} />
              <Route path="knowledge/:id" element={<KnowledgeBaseDetail />} />
              <Route path="documents/:id" element={<DocumentViewer />} />
              <Route path="chat" element={<ChatView />} />
              <Route path="study" element={<StudyPlanner />} />
              <Route path="groups" element={<Groups />} />
              <Route path="groups/:groupId" element={<GroupDetail />} />
              <Route path="downloads" element={<DownloadManager />} />
              <Route
                path="analytics"
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><DashboardSkeleton /></div>}>
                    <AnalyticsDashboard />
                  </Suspense>
                }
              />
              <Route
                path="flashcards"
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><DashboardSkeleton /></div>}>
                    <FlashcardManager />
                  </Suspense>
                }
              />
              <Route
                path="flashcards/study"
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><DashboardSkeleton /></div>}>
                    <FlashcardStudy />
                  </Suspense>
                }
              />
              <Route
                path="practice-problems"
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><DashboardSkeleton /></div>}>
                    <PracticeProblems />
                  </Suspense>
                }
              />
              <Route
                path="mind-maps"
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><DashboardSkeleton /></div>}>
                    <MindMapGenerator />
                  </Suspense>
                }
              />
              <Route
                path="comprehensive-lessons"
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><DashboardSkeleton /></div>}>
                    <ComprehensiveLessonGenerator />
                  </Suspense>
                }
              />
              <Route path="subscription" element={<Subscription />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          <Toaster />
            </BrowserRouter>
          </SocketProvider>
        </SubscriptionProvider>
      </CurrencyProvider>
    </AuthProvider>
  </ThemeProvider>
);
}

export default App;
