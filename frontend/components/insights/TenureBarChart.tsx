'use client';

import { TenureStat } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatConvertedSalary, CurrencyCode } from '@/lib/currencies';

interface Props {
  stats: TenureStat[];
  currency: CurrencyCode;
}

export function TenureBarChart({ stats, currency }: Props) {
  const data = stats.map((s) => ({
    tenure_band: s.tenure_band,
    avg_salary: s.avg_salary,
    headcount: s.headcount,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="tenure_band" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={(v) => formatConvertedSalary(typeof v === 'number' ? v : 0, currency)}
            tick={{ fontSize: 11 }}
            width={70}
          />
          <Tooltip
            formatter={(v, name) => [
              name === 'avg_salary'
                ? formatConvertedSalary(typeof v === 'number' ? v : 0, currency)
                : (v as number).toLocaleString(),
              name === 'avg_salary' ? 'Avg Salary' : 'Headcount',
            ]}
          />
          <Bar dataKey="avg_salary" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
