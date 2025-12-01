import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ClimbEntry } from '../types';
import { gradeToValue } from '../utils';

interface StatsChartProps {
  climbs: ClimbEntry[];
}

const StatsChart: React.FC<StatsChartProps> = ({ climbs }) => {
  const data = useMemo(() => {
    // Sort by date
    const sorted = [...climbs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sorted.map(c => ({
      date: new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: gradeToValue(c.grade, c.type),
      grade: c.grade,
      name: c.name
    }));
  }, [climbs]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
        No climbing data yet
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGrade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} hide />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: number, name: string, props: any) => [props.payload.grade, 'Grade']}
            labelStyle={{ color: '#64748b' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#0ea5e9" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorGrade)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatsChart;