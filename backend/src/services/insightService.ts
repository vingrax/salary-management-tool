import pool from '../db/client';
import { CountryStat, JobTitleStat, OrgSummary, TenureStat } from '../types';

export async function getOrgSummary(): Promise<OrgSummary> {
  const result = await pool.query(`
    SELECT
      COUNT(*)::integer           AS total_employees,
      COALESCE(ROUND(AVG(salary))::numeric, 0)  AS avg_salary,
      COALESCE(MIN(salary)::numeric, 0)          AS min_salary,
      COALESCE(MAX(salary)::numeric, 0)          AS max_salary,
      COUNT(DISTINCT country)::integer           AS country_count
    FROM employees
  `);
  const r = result.rows[0];
  return {
    total_employees: Number(r.total_employees),
    avg_salary: Number(r.avg_salary),
    min_salary: Number(r.min_salary),
    max_salary: Number(r.max_salary),
    country_count: Number(r.country_count),
  };
}

export async function getCountryStats(): Promise<CountryStat[]> {
  const result = await pool.query(`
    SELECT
      country,
      MIN(salary)::numeric        AS min_salary,
      MAX(salary)::numeric        AS max_salary,
      ROUND(AVG(salary))::numeric AS avg_salary,
      COUNT(*)::integer           AS headcount
    FROM employees
    GROUP BY country
    ORDER BY country ASC
  `);
  return result.rows.map((r) => ({
    country: r.country,
    min_salary: Number(r.min_salary),
    max_salary: Number(r.max_salary),
    avg_salary: Number(r.avg_salary),
    headcount: Number(r.headcount),
  }));
}

export async function getJobTitleStats(): Promise<JobTitleStat[]> {
  const result = await pool.query(`
    SELECT
      job_title,
      country,
      ROUND(AVG(salary))::numeric AS avg_salary,
      COUNT(*)::integer           AS headcount
    FROM employees
    GROUP BY job_title, country
    ORDER BY country ASC, avg_salary DESC
  `);
  return result.rows.map((r) => ({
    job_title: r.job_title,
    country: r.country,
    avg_salary: Number(r.avg_salary),
    headcount: Number(r.headcount),
  }));
}

export async function getTenureStats(): Promise<TenureStat[]> {
  const result = await pool.query(`
    WITH banded AS (
      SELECT
        salary,
        CASE
          WHEN EXTRACT(YEAR FROM AGE(NOW(), hired_at)) < 1 THEN '0-1yr'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), hired_at)) < 3 THEN '1-3yr'
          WHEN EXTRACT(YEAR FROM AGE(NOW(), hired_at)) < 5 THEN '3-5yr'
          ELSE '5yr+'
        END AS tenure_band
      FROM employees
    )
    SELECT
      tenure_band,
      ROUND(AVG(salary))::numeric AS avg_salary,
      COUNT(*)::integer           AS headcount
    FROM banded
    GROUP BY tenure_band
    ORDER BY
      CASE tenure_band
        WHEN '0-1yr' THEN 1
        WHEN '1-3yr' THEN 2
        WHEN '3-5yr' THEN 3
        ELSE 4
      END
  `);
  return result.rows.map((r) => ({
    tenure_band: r.tenure_band,
    avg_salary: Number(r.avg_salary),
    headcount: Number(r.headcount),
  }));
}
