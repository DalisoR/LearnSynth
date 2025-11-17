import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import analyticsService, {
  DashboardData,
  LearningMetrics,
  DailyActivity,
  SubjectProgress,
  WeeklyProgress,
  QuizPerformance,
  KnowledgeGap,
  StudyGoal,
} from '../services/api/analytics';
import ProductivityInsights from '../components/ProductivityInsights';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'performance' | 'productivity'>('overview');

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getDashboardData(user.id);
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error || 'No data available'}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { metrics, activity, subjects, weekly, performance, gaps, goals, recommendations } = dashboardData;

  // Chart colors
  const colors = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
  };

  // Activity Chart Data (Last 30 Days)
  const activityChartData = {
    labels: activity.slice(-14).map(a => format(parseISO(a.date), 'MMM dd')),
    datasets: [
      {
        label: 'Study Time (min)',
        data: activity.slice(-14).map(a => a.studyTime),
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}33`,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Quizzes Taken',
        data: activity.slice(-14).map(a => a.quizzesTaken),
        borderColor: colors.secondary,
        backgroundColor: `${colors.secondary}33`,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Subject Progress Chart Data
  const subjectChartData = {
    labels: subjects.map(s => s.subjectName),
    datasets: [
      {
        label: 'Progress (%)',
        data: subjects.map(s => s.progress),
        backgroundColor: [
          colors.primary,
          colors.secondary,
          colors.success,
          colors.warning,
          colors.info,
          colors.danger,
        ],
        borderWidth: 0,
      },
    ],
  };

  // Weekly Progress Chart Data
  const weeklyChartData = {
    labels: weekly.slice(-8).map(w => format(parseISO(w.week), 'MMM dd')),
    datasets: [
      {
        label: 'Study Time (hours)',
        data: weekly.slice(-8).map(w => Math.round(w.totalStudyTime / 60)),
        backgroundColor: colors.success,
      },
    ],
  };

  // Quiz Performance Chart Data
  const quizPerformanceData = {
    labels: performance.slice(-10).map(p => format(parseISO(p.date), 'MMM dd')),
    datasets: [
      {
        label: 'Quiz Score (%)',
        data: performance.slice(-10).map(p => p.score),
        borderColor: colors.primary,
        backgroundColor: colors.primary,
        type: 'line' as const,
      },
    ],
  };

  // Knowledge Gaps Radar Chart
  const knowledgeGapsData = {
    labels: gaps.map(g => g.topic),
    datasets: [
      {
        label: 'Difficulty Level',
        data: gaps.map(g => g.difficulty),
        backgroundColor: `${colors.danger}33`,
        borderColor: colors.danger,
        pointBackgroundColor: colors.danger,
      },
    ],
  };

  // Goals Progress Doughnut Chart
  const activeGoals = goals.filter(g => !g.completed);
  const goalsChartData = {
    labels: activeGoals.map(g => g.title),
    datasets: [
      {
        data: activeGoals.map(g => analyticsService.calculatePercentage(g.current, g.target)),
        backgroundColor: [colors.primary, colors.secondary, colors.success, colors.warning],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Track your learning progress and insights</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'subjects'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Subject Progress
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'performance'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Performance
        </button>
        <button
          onClick={() => setActiveTab('productivity')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'productivity'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Productivity
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Study Time"
          value={analyticsService.formatStudyTime(metrics.totalStudyTime)}
          icon="⏱️"
          color={colors.primary}
        />
        <MetricCard
          title="Lessons Completed"
          value={metrics.lessonsCompleted.toString()}
          icon="📚"
          color={colors.success}
        />
        <MetricCard
          title="Average Quiz Score"
          value={`${Math.round(metrics.averageQuizScore)}%`}
          icon="🎯"
          color={metrics.averageQuizScore >= 80 ? colors.success : colors.warning}
        />
        <MetricCard
          title="Current Streak"
          value={`${metrics.streak} days`}
          icon="🔥"
          color={colors.danger}
        />
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Activity Chart */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Study Activity (Last 14 Days)</h2>
            <div className="h-80">
              <Line
                data={activityChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Weekly Progress */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Weekly Study Time</h2>
              <div className="h-64">
                <Bar
                  data={weeklyChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Goals Progress */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Goals Progress</h2>
              {activeGoals.length > 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <Doughnut
                    data={goalsChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom' as const,
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <p className="text-gray-500 text-center py-12">No active goals</p>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-blue-900 mb-4">Recommendations</h2>
              <ul className="space-y-2">
                {recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-blue-800">
                    <span className="text-blue-600 mt-1">💡</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Subject Progress Tab */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Progress by Subject</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subject List */}
            <div>
              {subjects.map(subject => (
                <div key={subject.subjectId} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900">{subject.subjectName}</h3>
                    <span className="text-sm text-gray-600">
                      {subject.lessonsCompleted}/{subject.totalLessons} lessons
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${subject.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Progress: {subject.progress}%</span>
                    <span>Avg Score: {Math.round(subject.averageScore)}%</span>
                    <span>Time: {analyticsService.formatStudyTime(subject.timeSpent)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Subject Chart */}
            <div className="h-96">
              <Bar
                data={subjectChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: function(value) {
                          return value + '%';
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <>
          {/* Quiz Performance */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quiz Performance Trend</h2>
            <div className="h-80">
              <Line
                data={quizPerformanceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: function(value) {
                          return value + '%';
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Knowledge Gaps */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Knowledge Gaps Analysis</h2>
            {gaps.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-96">
                  <Radar
                    data={knowledgeGapsData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        r: {
                          beginAtZero: true,
                          max: 100,
                        },
                      },
                    }}
                  />
                </div>
                <div className="space-y-3">
                  {gaps.map((gap, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${
                        gap.recommendedReview
                          ? 'border-red-200 bg-red-50'
                          : 'border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{gap.topic}</h3>
                          <p className="text-sm text-gray-600">{gap.subject}</p>
                        </div>
                        {gap.recommendedReview && (
                          <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">
                            Review
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            gap.recommendedReview ? 'bg-red-600' : 'bg-yellow-600'
                          }`}
                          style={{ width: `${gap.difficulty}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">Difficulty: {gap.difficulty}%</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-12">No knowledge gaps identified</p>
            )}
          </div>
        </>
      )}

      {/* Productivity Tab */}
      {activeTab === 'productivity' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <ProductivityInsights />
        </div>
      )}
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-4xl opacity-20">{icon}</div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
