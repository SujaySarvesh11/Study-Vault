# Aggregates, GROUP BY and HAVING

Aggregate functions turn many rows into one summary value. (Database: **SchoolDB**.)

## Aggregate functions

```sql
USE SchoolDB;

SELECT COUNT(*)       AS Enrollments,     -- all rows
       COUNT(Marks)   AS Graded,          -- rows where Marks is NOT NULL
       SUM(Marks)     AS TotalMarks,
       AVG(Marks)     AS AverageMarks,
       MIN(Marks)     AS Lowest,
       MAX(Marks)     AS Highest
FROM dbo.Enrollments;
```

> Aggregates **ignore NULLs** (except `COUNT(*)`). `AVG(Marks)` averages only the graded rows.

```sql
SELECT COUNT(DISTINCT City) AS Cities FROM dbo.Students;   -- count unique values
```

## GROUP BY: one summary per group

"How many students live in each city?"

```sql
SELECT City, COUNT(*) AS Students
FROM dbo.Students
GROUP BY City
ORDER BY Students DESC, City;
```

"Average marks per course":

```sql
SELECT CourseId,
       COUNT(*)                         AS Enrolled,
       COUNT(Marks)                     AS Graded,
       CAST(AVG(Marks) AS DECIMAL(5,2)) AS AvgMarks,
       MAX(Marks)                       AS Best
FROM dbo.Enrollments
GROUP BY CourseId;
```

### The GROUP BY rule

Every column in `SELECT` must either be **in the GROUP BY** or **inside an aggregate**:

```sql
SELECT City, FirstName, COUNT(*) FROM dbo.Students GROUP BY City;
-- ❌ Error: Column 'dbo.Students.FirstName' is invalid in the select list because it is not
--    contained in either an aggregate function or the GROUP BY clause.
```

That makes sense: one row per city can't show *one* first name for several students. (Use `STRING_AGG` to list them all.)

## Grouping by several columns

```sql
SELECT Department, YEAR(HireDate) AS HiredYear, COUNT(*) AS Teachers, AVG(Salary) AS AvgSalary
FROM dbo.Teachers
GROUP BY Department, YEAR(HireDate)
ORDER BY Department, HiredYear;
```

## HAVING: filter the groups

`WHERE` filters **rows before** grouping; `HAVING` filters **groups after**:

```sql
-- Cities with more than one student
SELECT City, COUNT(*) AS Students
FROM dbo.Students
GROUP BY City
HAVING COUNT(*) > 1;

-- Courses whose graded average is at least 75
SELECT CourseId, AVG(Marks) AS AvgMarks
FROM dbo.Enrollments
WHERE Marks IS NOT NULL            -- rows: only graded ones
GROUP BY CourseId
HAVING AVG(Marks) >= 75            -- groups: only good averages
ORDER BY AvgMarks DESC;
```

## Counting conditionally

`COUNT` + `CASE` (or `SUM` + `IIF`) counts different things in one pass:

```sql
SELECT CourseId,
       SUM(IIF(Marks >= 40, 1, 0))          AS Passed,
       SUM(IIF(Marks <  40, 1, 0))          AS Failed,
       SUM(IIF(Marks IS NULL, 1, 0))        AS Pending
FROM dbo.Enrollments
GROUP BY CourseId;
```

## Totals with ROLLUP

```sql
SELECT ISNULL(Department, N'== ALL ==') AS Department,
       COUNT(*) AS Teachers,
       SUM(Salary) AS Payroll
FROM dbo.Teachers
GROUP BY ROLLUP (Department);   -- adds a grand-total row (Department = NULL)
```

## Key points

- `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` summarise; they skip NULLs (except `COUNT(*)`).
- `GROUP BY` makes one row per group; non-aggregated columns must be grouped.
- `WHERE` filters rows, `HAVING` filters groups.
- `SUM(IIF(...))` counts several conditions at once; `ROLLUP` adds totals.

## Practice

1. Number of students enrolled per year (`YEAR(EnrolledOn)` in `Students`).
2. For each student (`StudentId`), the number of courses and their average marks.
3. Students (`StudentId`) taking 3 or more courses.
4. Total salary per department, plus a grand total.
