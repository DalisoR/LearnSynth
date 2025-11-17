import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import productivityService, {
  ProductivityDashboardData,
  LearningHeatmapData,
  ProductivityInsight,
  WeeklyPattern,
  StudyStreak,
  EfficiencyMetrics,
} from '../services/api/productivity';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';

const ProductivityInsights: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<ProductivityDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'heatmap' | 'patterns' | 'insights'>('heatmap');

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const dashboardData = await productivityService.getDashboardData(user.id);
      setData(dashboardData);
    } catch (err) {
      console.error('Failed to load productivity data:', err);
      setError('Failed to load productivity insights');
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

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600">{error || 'No data available'}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { heatmap, insights, weekly, streak, efficiency } = data;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Productivity Insights</h1>
        <p className="text-gray-600">Analyze your learning patterns and optimize your study time</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveView('heatmap')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeView === 'heatmap'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Heatmap
        </button>
        <button
          onClick={() => setActiveView('patterns')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeView === 'patterns'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Study Patterns
        </button>
        <button
          onClick={() => setActiveView('insights')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeView === 'insights'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Insights
        </button>
      </div>

      {/* Heatmap View */}
      {activeView === 'heatmap' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Learning Activity Heatmap</h2>
          <p className="text-gray-600 mb-6">
            Darker colors indicate more study activity. Each square represents one hour.
          </p>
          <LearningHeatmap heatmapData={heatmap} />
        </div>
      )}

      {/* Patterns View */}
      {activeView === 'patterns' && (
        <div className="space-y-6">
          {/* Streak Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Study Streaks</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-600 mb-2">{streak.current}</div>
                <div className="text-gray-600">Current Streak</div>
                <div className="text-sm text-gray-500">days</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">{streak.longest}</div>
                <div className="text-gray-600">Longest Streak</div>
                <div className="text-sm text-gray-500">days</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {Math.round(efficiency.consistencyScore)}
                </div>
                <div className="text-gray-600">Consistency Score</div>
                <div className="text-sm text-gray-500">/ 100</div>
              </div>
            </div>
            <StreakHistory history={streak.history} />
          </div>

          {/* Weekly Pattern */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Weekly Study Patterns</h2>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {weekly.map((day) => (
                <WeeklyPatternCard key={day.dayOfWeek} pattern={day} />
              ))}
            </div>
          </div>

          {/* Efficiency Metrics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Efficiency Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Focus Score"
                value={efficiency.focusScore}
                icon="🧠"
                color="blue"
                max={100}
              />
              <MetricCard
                title="Productivity Score"
                value={efficiency.productivityScore}
                icon="⚡"
                color="green"
                max={100}
              />
              <MetricCard
                title="Avg Session Duration"
                value={productivityService.formatDuration(efficiency.averageSessionDuration)}
                icon="⏱️"
                color="purple"
              />
            </div>
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Most Productive</h3>
              <p className="text-gray-700">
                <span className="font-medium">Day:</span> {efficiency.mostProductiveDay}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Time:</span> {productivityService.formatHour(efficiency.mostProductiveHour)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Insights View */}
      {activeView === 'insights' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">AI-Powered Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Learning Heatmap Component
interface LearningHeatmapProps {
  heatmapData: LearningHeatmapData[];
}

const LearningHeatmap: React.FC<LearningHeatmapProps> = ({ heatmapData }) => {
  // Group data by week
  const weeks: Map<string, LearningHeatmapData[]> = new Map();

  heatmapData.forEach((data) => {
    const date = parseISO(data.date);
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');

    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, []);
    }
    weeks.get(weekKey)!.push(data);
  });

  const weekEntries = Array.from(weeks.entries()).slice(-12); // Last 12 weeks

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hourLabels = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex">
          {/* Hour labels */}
          <div className="flex-shrink-0 mr-2">
            <div className="h-6"></div> {/* Empty corner */}
            {hourLabels.map((hour) => (
              <div
                key={hour}
                className="h-8 text-xs text-gray-600 flex items-center"
                style={{ minWidth: '40px' }}
              >
                {hour % 4 === 0 ? productivityService.formatHour(hour) : ''}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex gap-1">
            {weekEntries.map(([weekKey, weekData]) => (
              <div key={weekKey} className="flex flex-col">
                <div className="h-6 flex justify-center mb-1">
                  <span className="text-xs text-gray-600">{format(parseISO(weekKey), 'MMM dd')}</span>
                </div>
                <div className="flex flex-col gap-px">
                  {dayNames.map((dayName) => {
                    // Find data for this day and hour
                    const dayData = weekData.filter(
                      (d) => format(parseISO(d.date), 'EEE') === dayName
                    );

                    return (
                      <div
                        key={dayName}
                        className="w-8 h-8 flex items-center justify-center border border-gray-200 relative group cursor-pointer"
                        title={`${dayName} - ${productivityService.getIntensityLevel(
                          dayData.reduce((sum, d) => sum + d.intensity, 0) / (dayData.length || 1)
                        )}`}
                      >
                        {/* This would be rendered in a grid layout */}
                        <div className="absolute inset-0 bg-gray-100"></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-4">
          <span className="text-sm text-gray-600">Less</span>
          <div className="flex gap-1">
            {[0, 20, 40, 60, 80, 100].map((intensity) => (
              <div
                key={intensity}
                className="w-6 h-6 rounded-sm"
                style={{ backgroundColor: productivityService.getHeatmapColor(intensity) }}
                title={`${intensity}% intensity`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">More</span>
        </div>
      </div>
    </div>
  );
};

// Streak History Component
interface StreakHistoryProps {
  history: StudyStreak['history'];
}

const StreakHistory: React.FC<StreakHistoryProps> = ({ history }) => {
  const recentHistory = history.slice(-30); // Last 30 days

  return (
    <div className="mt-6">
      <h3 className="font-semibold text-gray-900 mb-3">Last 30 Days</h3>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {recentHistory.map((day) => (
          <div
            key={day.date}
            className="w-6 h-6 flex-shrink-0 rounded-sm border border-gray-200 flex items-center justify-center"
            style={{
              backgroundColor: day.studied
                ? day.streakActive
                  ? '#10b981'
                  : '#6ee7b7'
                : '#f3f4f6',
            }}
            title={`${format(parseISO(day.date), 'MMM dd')}: ${day.studied ? 'Studied' : 'No activity'}`}
          >
            {day.studied && <div className="w-2 h-2 rounded-full bg-white"></div>}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-green-500"></div>
          <span>Studied</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-gray-200"></div>
          <span>No activity</span>
        </div>
      </div>
    </div>
  );
};

// Weekly Pattern Card
interface WeeklyPatternCardProps {
  pattern: WeeklyPattern;
}

const WeeklyPatternCard: React.FC<WeeklyPatternCardProps> = ({ pattern }) => {
  const dayName = productivityService.getDayName(pattern.dayOfWeek);

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-gray-900 mb-2">{dayName}</h3>
      <div className="text-sm text-gray-600 space-y-1">
        <div>
          <span className="text-gray-500">Avg Time:</span>{' '}
          {productivityService.formatDuration(pattern.averageStudyTime)}
        </div>
        <div>
          <span className="text-gray-500">Sessions:</span> {Math.round(pattern.averageSessions)}
        </div>
        <div>
          <span className="text-gray-500">Score:</span>{' '}
          <span
            className={`font-medium ${
              pattern.productivityScore >= 70
                ? 'text-green-600'
                : pattern.productivityScore >= 40
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {Math.round(pattern.productivityScore)}/100
          </span>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${pattern.productivityScore}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Card
interface MetricCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  max?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, max }) => {
  const percentage = typeof value === 'number' && max ? (value / max) * 100 : 0;
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    yellow: 'text-yellow-600 bg-yellow-100',
    red: 'text-red-600 bg-red-100',
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses].split(' ')[0]} mb-2`}>
        {value}
      </div>
      {max && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`${colorClasses[color as keyof typeof colorClasses].split(' ')[0]} h-2 rounded-full transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Insight Card
interface InsightCardProps {
  insight: ProductivityInsight;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const colorClasses = productivityService.getInsightColor(insight.type);

  return (
    <div className={`p-4 rounded-lg border-2 ${colorClasses.bg} ${colorClasses.border}`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{insight.icon}</span>
        <div className="flex-1">
          <h3 className={`font-semibold mb-1 ${colorClasses.text}`}>{insight.title}</h3>
          <p className={`text-sm ${colorClasses.text}`}>{insight.description}</p>
          {insight.value && (
            <div className={`mt-2 text-lg font-bold ${colorClasses.text}`}>{insight.value}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductivityInsights;
