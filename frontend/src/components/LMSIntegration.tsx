import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Settings, BookOpen, Users } from 'lucide-react';
import { LMSProvider } from '@/types/lms';
import { useLMS } from '@/hooks/useLMS';
import { toast } from 'sonner';

export const LMSIntegration: React.FC = () => {
  const {
    status,
    courses,
    loading,
    error,
    connect,
    disconnect,
    fetchCourses,
    refreshStatus,
  } = useLMS();

  const [formData, setFormData] = useState({
    provider: '',
    baseUrl: '',
    apiKey: '',
    clientId: '',
    clientSecret: '',
  });

  const [showForm, setShowForm] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.provider || !formData.baseUrl || !formData.apiKey) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await connect({
        provider: formData.provider as LMSProvider,
        baseUrl: formData.baseUrl,
        apiKey: formData.apiKey,
        clientId: formData.clientId || undefined,
        clientSecret: formData.clientSecret || undefined,
      });

      toast.success('Successfully connected to LMS!');
      setShowForm(false);
      setFormData({
        provider: '',
        baseUrl: '',
        apiKey: '',
        clientId: '',
        clientSecret: '',
      });

      // Fetch courses after connection
      await fetchCourses();
    } catch (err) {
      toast.error('Failed to connect to LMS');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success('Disconnected from LMS');
      setCourses([]);
    } catch (err) {
      toast.error('Failed to disconnect');
    }
  };

  const providerOptions = [
    { value: LMSProvider.CANVAS, label: 'Canvas', icon: '📚' },
    { value: LMSProvider.BLACKBOARD, label: 'Blackboard', icon: '🎓' },
    { value: LMSProvider.MOODLE, label: 'Moodle', icon: '📖' },
    { value: LMSProvider.GOOGLE_CLASSROOM, label: 'Google Classroom', icon: '🏫' },
    { value: LMSProvider.SCHOOLOGY, label: 'Schoology', icon: '📝' },
  ];

  if (loading && status.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading LMS Data...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              LMS Integration
            </div>
            {status.connected && (
              <Badge variant="success" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected to {status.provider}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Connect your Learning Management System to sync courses, assignments, and grades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status.connected ? (
            <>
              {!showForm ? (
                <Button onClick={() => setShowForm(true)}>
                  Connect to LMS
                </Button>
              ) : (
                <form onSubmit={handleConnect} className="space-y-4">
                  <div>
                    <Label htmlFor="provider">LMS Provider *</Label>
                    <Select
                      value={formData.provider}
                      onValueChange={(value) =>
                        setFormData({ ...formData, provider: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select LMS provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providerOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span>{option.icon}</span>
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="baseUrl">Base URL *</Label>
                    <Input
                      id="baseUrl"
                      type="url"
                      placeholder="https://your-lms-instance.com"
                      value={formData.baseUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, baseUrl: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="apiKey">API Key / Access Token *</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your API key"
                      value={formData.apiKey}
                      onChange={(e) =>
                        setFormData({ ...formData, apiKey: e.target.value })
                      }
                      required
                    />
                  </div>

                  {(formData.provider === LMSProvider.BLACKBOARD ||
                    formData.provider === LMSProvider.GOOGLE_CLASSROOM) && (
                    <>
                      <div>
                        <Label htmlFor="clientId">Client ID</Label>
                        <Input
                          id="clientId"
                          placeholder="Optional for some LMS"
                          value={formData.clientId}
                          onChange={(e) =>
                            setFormData({ ...formData, clientId: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="clientSecret">Client Secret</Label>
                        <Input
                          id="clientSecret"
                          type="password"
                          placeholder="Optional for some LMS"
                          value={formData.clientSecret}
                          onChange={(e) =>
                            setFormData({ ...formData, clientSecret: e.target.value })
                          }
                        />
                      </div>
                    </>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Connect
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">
                      Connected to {status.provider}
                    </p>
                    <p className="text-sm text-green-700">
                      Your courses and assignments are synced
                    </p>
                  </div>
                </div>
                <Button variant="destructive" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Courses</p>
                        <p className="text-2xl font-bold">{courses.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Active Enrollments</p>
                        <p className="text-2xl font-bold">
                          {courses.filter((c) => c.status === 'active').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <Button
                      onClick={fetchCourses}
                      variant="outline"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Refresh Courses
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {courses.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Your Courses</h3>
                  <div className="space-y-2">
                    {courses.map((course) => (
                      <Card key={course.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{course.name}</p>
                              <p className="text-sm text-gray-600">
                                {course.courseCode}
                              </p>
                              {course.description && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {course.description}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={
                                course.status === 'active'
                                  ? 'success'
                                  : course.status === 'completed'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {course.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LMSIntegration;
