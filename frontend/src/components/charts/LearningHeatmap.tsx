import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HeatmapData {
  day: number;
  hour: number;
  count: number;
}

interface LearningHeatmapProps {
  data: HeatmapData[];
  className?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const LearningHeatmap: React.FC<LearningHeatmapProps> = ({ data, className }) => {
  const getIntensity = (count: number, maxCount: number) => {
    if (count === 0) return 0;
    return Math.min(100, (count / maxCount) * 100);
  };

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Learning Activity Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1">
          <div className="w-12" />
          {HOURS.map(hour => (
            <div key={hour} className="text-xs text-center text-gray-500 font-medium">
              {hour % 6 === 0 ? hour : ''}
            </div>
          ))}

          {DAYS.map((day, dayIndex) => (
            <React.Fragment key={day}>
              <div className="text-xs text-right pr-2 text-gray-600 font-medium flex items-center">
                {day}
              </div>
              {HOURS.map(hour => {
                const cellData = data.find(d => d.day === dayIndex && d.hour === hour);
                const count = cellData?.count || 0;
                const intensity = getIntensity(count, maxCount);

                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className="aspect-square rounded-sm relative group"
                    style={{
                      backgroundColor: `rgba(59, 130, 246, ${intensity / 100})`,
                    }}
                  >
                    {count > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-medium text-white drop-shadow-sm">
                          {count}
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {DAYS[dayIndex]} {hour}:00 - {count} sessions
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
          <span>Less</span>
          <div className="flex items-center gap-1">
            {[0, 25, 50, 75, 100].map(intensity => (
              <div
                key={intensity}
                className="w-4 h-4 rounded-sm"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${intensity / 100})`,
                }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningHeatmap;
