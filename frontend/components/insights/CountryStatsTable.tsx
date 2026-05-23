'use client';

import { CountryStat } from '@/types';
import { formatConvertedSalary, CurrencyCode } from '@/lib/currencies';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  stats: CountryStat[];
  selectedCountry: string;
  currency: CurrencyCode;
}

export function CountryStatsTable({ stats, selectedCountry, currency }: Props) {
  const rows = selectedCountry
    ? stats.filter((s) => s.country === selectedCountry)
    : stats;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Country</TableHead>
            <TableHead>Min Salary</TableHead>
            <TableHead>Avg Salary</TableHead>
            <TableHead>Max Salary</TableHead>
            <TableHead className="text-right">Headcount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.country}>
              <TableCell className="font-medium">{s.country}</TableCell>
              <TableCell>{formatConvertedSalary(s.min_salary, currency)}</TableCell>
              <TableCell>{formatConvertedSalary(s.avg_salary, currency)}</TableCell>
              <TableCell>{formatConvertedSalary(s.max_salary, currency)}</TableCell>
              <TableCell className="text-right">{s.headcount.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
