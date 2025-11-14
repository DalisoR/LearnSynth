import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
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
import Settings from '@/pages/Settings';
import LearningDashboard from '@/pages/LearningDashboard';
import ChapterReader from '@/pages/ChapterReader';
import Quiz from '@/pages/Quiz';
import ProgressAnalytics from '@/pages/ProgressAnalytics';
import LessonWorkspace from '@/pages/LessonWorkspace';

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
        <BrowserRouter>
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
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
              <Route path="chat" element={<ChatView />} />
              <Route path="study" element={<StudyPlanner />} />
              <Route path="groups" element={<Groups />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
