import { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Timer,
  BookOpen,
  Plus,
  BarChart3,
  Settings,
  X,
  Play,
  Pause,
  Square,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  studyPlansAPI,
  studySessionsAPI,
  studyGoalsAPI,
  pomodoroAPI,
  studyAnalyticsAPI,
  studyRecommendationsAPI,
  studyPreferencesAPI,
} from '@/services/api';
import {
  StudyPlan,
  StudySession,
  StudyGoal,
  PomodoroSession,
  StudyAnalytics,
  StudyRecommendation,
  StudyPreferences,
} from '@/types/api';

type TabValue = 'dashboard' | 'plans' | 'sessions' | 'goals' | 'pomodoro' | 'analytics';

export default function StudyPlanner() {
  const [activeTab, setActiveTab] = useState<TabValue>('dashboard');

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Study Planner</h1>
        <p className="text-gray-600">
          Plan, track, and optimize your learning journey
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="pomodoro">Pomodoro</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Dashboard />
        </TabsContent>

        <TabsContent value="plans">
          <StudyPlansManager />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsManager />
        </TabsContent>

        <TabsContent value="goals">
          <GoalsManager />
        </TabsContent>

        <TabsContent value="pomodoro">
          <PomodoroTimer />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [upcomingSessions, setUpcomingSessions] = useState<StudySession[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [sessions, streakData, recs, weekly] = await Promise.all([
        studySessionsAPI.getUpcoming(7),
        studyAnalyticsAPI.getStreak(30),
        studyRecommendationsAPI.getAll(),
        studyAnalyticsAPI.getWeeklySummary(),
      ]);

      setUpcomingSessions(Array.isArray(sessions) ? sessions : []);
      setStreak(streakData?.streak || 0);
      setRecommendations(
        Array.isArray(recs)
          ? recs.filter((r: StudyRecommendation) => !r.dismissed)
          : []
      );
      setWeeklySummary(weekly);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Study Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-blue-600 mb-2">{streak}</div>
          <p className="text-gray-600">consecutive days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-600 mb-2">
            {weeklySummary?.total_hours || 0}h
          </div>
          <p className="text-gray-600">
            {weeklySummary?.sessions_completed || 0} sessions completed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-purple-600 mb-2">
            {upcomingSessions.length}
          </div>
          <p className="text-gray-600">sessions scheduled</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Today's Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {!Array.isArray(upcomingSessions) || upcomingSessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No upcoming sessions scheduled
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingSessions.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-sm text-gray-600">
                      {session.scheduled_start ? new Date(session.scheduled_start).toLocaleTimeString() : 'N/A'} -{' '}
                      {session.scheduled_end ? new Date(session.scheduled_end).toLocaleTimeString() : 'N/A'}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {recommendations.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(Array.isArray(recommendations) ? recommendations : []).slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-start justify-between p-3 bg-blue-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{rec.title}</p>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      studyRecommendationsAPI.dismiss(rec.id).then(loadDashboardData);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StudyPlansManager() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    total_hours_estimated: 0,
    start_date: '',
    target_completion_date: '',
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await studyPlansAPI.getAll();
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load study plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      await studyPlansAPI.create(newPlan);
      setShowCreateDialog(false);
      setNewPlan({
        name: '',
        description: '',
        total_hours_estimated: 0,
        start_date: '',
        target_completion_date: '',
      });
      loadPlans();
    } catch (error) {
      console.error('Failed to create plan:', error);
      alert('Failed to create plan');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      await studyPlansAPI.delete(planId);
      loadPlans();
    } catch (error) {
      console.error('Failed to delete plan:', error);
      alert('Failed to delete plan');
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Study Plans</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(Array.isArray(plans) ? plans : []).map((plan) => {
          const progressPercent =
            plan.total_hours_estimated > 0
              ? (plan.total_hours_completed / plan.total_hours_estimated) * 100
              : 0;

          return (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      plan.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {plan.description && (
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                )}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>
                      {plan.total_hours_completed}h / {plan.total_hours_estimated || '?'}h
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeletePlan(plan.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Study Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newPlan.description}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="hours">Estimated Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  value={newPlan.total_hours_estimated}
                  onChange={(e) =>
                    setNewPlan({
                      ...newPlan,
                      total_hours_estimated: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="start">Start Date</Label>
                <Input
                  id="start"
                  type="date"
                  value={newPlan.start_date}
                  onChange={(e) =>
                    setNewPlan({ ...newPlan, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="end">Target Date</Label>
                <Input
                  id="end"
                  type="date"
                  value={newPlan.target_completion_date}
                  onChange={(e) =>
                    setNewPlan({
                      ...newPlan,
                      target_completion_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreatePlan} className="flex-1">
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SessionsManager() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    scheduled_start: '',
    scheduled_end: '',
    session_type: 'study',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await studySessionsAPI.getAll();
      setSessions(data || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      await studySessionsAPI.create(newSession);
      setShowCreateDialog(false);
      setNewSession({
        title: '',
        description: '',
        scheduled_start: '',
        scheduled_end: '',
        session_type: 'study',
        priority: 'medium',
      });
      loadSessions();
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session');
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      await studySessionsAPI.start(sessionId);
      loadSessions();
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleCompleteSession = async (sessionId: string) => {
    try {
      await studySessionsAPI.complete(sessionId, {
        completion_notes: 'Session completed',
        rating: 5,
      });
      loadSessions();
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Study Sessions</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Session
        </Button>
      </div>

      <div className="space-y-4">
        {(Array.isArray(sessions) ? sessions : []).map((session) => (
          <Card key={session.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{session.title}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        session.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : session.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {session.status}
                    </span>
                    <span className="text-xs text-gray-500">{session.session_type}</span>
                  </div>
                  {session.description && (
                    <p className="text-sm text-gray-600 mb-2">{session.description}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {session.scheduled_start ? new Date(session.scheduled_start).toLocaleString() : 'N/A'} -{' '}
                    {session.scheduled_end ? new Date(session.scheduled_end).toLocaleTimeString() : 'N/A'}
                  </p>
                  {session.rating && (
                    <p className="text-sm text-gray-600">Rating: {session.rating}/5</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {session.status === 'scheduled' && (
                    <Button size="sm" onClick={() => handleStartSession(session.id)}>
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  {session.status === 'in_progress' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCompleteSession(session.id)}
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          studySessionsAPI
                            .delete(session.id)
                            .then(loadSessions)
                        }
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Schedule Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newSession.title}
                  onChange={(e) =>
                    setNewSession({ ...newSession, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={newSession.description}
                  onChange={(e) =>
                    setNewSession({ ...newSession, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newSession.session_type}
                  onValueChange={(value) =>
                    setNewSession({
                      ...newSession,
                      session_type: value as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="study">Study</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="exam_prep">Exam Prep</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={newSession.scheduled_start}
                  onChange={(e) =>
                    setNewSession({
                      ...newSession,
                      scheduled_start: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="end">End</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  value={newSession.scheduled_end}
                  onChange={(e) =>
                    setNewSession({
                      ...newSession,
                      scheduled_end: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateSession} className="flex-1">
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function GoalsManager() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    goal_type: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'custom',
    target_value: 0,
    unit: 'hours',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await studyGoalsAPI.getAll();
      setGoals(data || []);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    try {
      await studyGoalsAPI.create(newGoal);
      setShowCreateDialog(false);
      setNewGoal({
        title: '',
        description: '',
        goal_type: 'weekly',
        target_value: 0,
        unit: 'hours',
        start_date: '',
        end_date: '',
      });
      loadGoals();
    } catch (error) {
      console.error('Failed to create goal:', error);
      alert('Failed to create goal');
    }
  };

  const handleUpdateProgress = async (goalId: string, currentValue: number) => {
    try {
      await studyGoalsAPI.updateProgress(goalId, currentValue);
      loadGoals();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Study Goals</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Goal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(Array.isArray(goals) ? goals : []).map((goal) => {
          const progressPercent =
            goal.target_value > 0
              ? (goal.current_value / goal.target_value) * 100
              : 0;

          return (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{goal.title}</CardTitle>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      goal.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {goal.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {goal.description && (
                  <p className="text-sm text-gray-600 mb-4">{goal.description}</p>
                )}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>
                      {goal.current_value} / {goal.target_value} {goal.unit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleUpdateProgress(
                        goal.id,
                        Math.min(goal.current_value + 1, goal.target_value)
                      )
                    }
                  >
                    +1 {goal.unit}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleUpdateProgress(
                        goal.id,
                        Math.max(goal.current_value - 1, 0)
                      )
                    }
                  >
                    -1 {goal.unit}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newGoal.title}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={newGoal.description}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newGoal.goal_type}
                  onValueChange={(value) =>
                    setNewGoal({
                      ...newGoal,
                      goal_type: value as any,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target">Target Value</Label>
                <Input
                  id="target"
                  type="number"
                  value={newGoal.target_value}
                  onChange={(e) =>
                    setNewGoal({
                      ...newGoal,
                      target_value: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={newGoal.unit}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, unit: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleCreateGoal} className="flex-1">
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function PomodoroTimer() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [sessionType, setSessionType] = useState<'work' | 'short_break' | 'long_break'>('work');

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft]);

  const loadSessions = async () => {
    try {
      const data = await pomodoroAPI.getAll();
      setSessions(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch (error) {
      console.error('Failed to load pomodoro sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimerComplete = async () => {
    setIsActive(false);
    await pomodoroAPI.complete(sessions[0]?.id || '');
    loadSessions();

    if (sessionType === 'work') {
      setSessionType('short_break');
      setTimeLeft(5 * 60);
    } else {
      setSessionType('work');
      setTimeLeft(25 * 60);
    }
  };

  const handleStart = async () => {
    if (!isActive && sessions.length === 0) {
      try {
        const newSession = await pomodoroAPI.start({
          session_type: sessionType,
          duration_planned: sessionType === 'work' ? 25 : 5,
        });
        setSessions([newSession, ...sessions]);
      } catch (error) {
        console.error('Failed to start pomodoro:', error);
      }
    }
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(sessionType === 'work' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="flex items-center justify-center p-8">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="text-center p-8">
        <CardHeader>
          <CardTitle>Pomodoro Timer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-8">
            <div className="text-8xl font-mono font-bold mb-4">{formatTime(timeLeft)}</div>
            <p className="text-lg text-gray-600 mb-6">{sessionType.replace('_', ' ')}</p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={handleStart}>
                {isActive ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start
                  </>
                )}
              </Button>
              <Button size="lg" variant="outline" onClick={handleReset}>
                <Square className="w-5 h-5 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Session History</h3>
            {!Array.isArray(sessions) || sessions.length === 0 ? (
              <p className="text-gray-500">No sessions yet</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <span>{session.session_type}</span>
                    <span className="text-sm text-gray-600">
                      {session.duration_actual || session.duration_planned}m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<number>(0);
  const [weeklySummary, setWeeklySummary] = useState<any>(null);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [streakData, weekly, monthly, insightsData] = await Promise.all([
        studyAnalyticsAPI.getStreak(30),
        studyAnalyticsAPI.getWeeklySummary(),
        studyAnalyticsAPI.getMonthlySummary(),
        studyAnalyticsAPI.getInsights(),
      ]);

      setStreak(streakData?.streak || 0);
      setWeeklySummary(weekly);
      setMonthlySummary(monthly);
      setInsights(insightsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{streak}</div>
            <p className="text-xs text-gray-600">days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {weeklySummary?.total_hours || 0}h
            </div>
            <p className="text-xs text-gray-600">
              {weeklySummary?.sessions_completed || 0} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {monthlySummary?.total_hours || 0}h
            </div>
            <p className="text-xs text-gray-600">
              {monthlySummary?.sessions_completed || 0} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {weeklySummary?.avg_rating?.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-gray-600">out of 5</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent>
          {!Array.isArray(insights) || insights.length === 0 ? (
            <p className="text-gray-500">No insights available yet</p>
          ) : (
            <div className="space-y-3">
              {insights.map((insight: any, index: number) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium">{insight.title}</p>
                  <p className="text-sm text-gray-600">{insight.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
