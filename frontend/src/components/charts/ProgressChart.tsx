import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ProgressData {
  date: string;
  studyTime: number;
  averageScore: number;
  quizzesTaken: number;
}

interface ProgressChartProps {
  data: ProgressData[];
  className?: string;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ data, className }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            style={{ fontSize: '12px' }}
          />
          <YAxis yAxisId="left" style={{ fontSize: '12px' }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'studyTime') {
                return [formatStudyTime(Number(value)), 'Study Time'];
              }
              if (name === 'averageScore') {
                return [Number(value).toFixed(1) + '%', 'Avg Score'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="studyTime"
            stroke="#8884d8"
            strokeWidth={2}
            name="Study Time"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="averageScore"
            stroke="#82ca9d"
            strokeWidth={2}
            name="Average Score"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressChart;
