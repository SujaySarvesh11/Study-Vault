# Subqueries and CTEs

A **subquery** is a query inside another query. A **CTE** (Common Table Expression) is a named subquery that makes complex queries readable. (Database: **SchoolDB**.)

## Scalar subquery: one value

"Enrollments with marks above the overall average":

```sql
USE SchoolDB;

SELECT StudentId, CourseId, Marks
FROM dbo.Enrollments
WHERE Marks > (SELECT AVG(Marks) FROM dbo.Enrollments);
```

As a column:

```sql
SELECT StudentId, CourseId, Marks,
       Marks - (SELECT AVG(Marks) FROM dbo.Enrollments) AS AboveAverageBy
FROM dbo.Enrollments
WHERE Marks IS NOT NULL;
```

## Subquery with IN

"Students enrolled in any Computer Science course":

```sql
SELECT FirstName, LastName
FROM dbo.Students
WHERE StudentId IN (
    SELECT e.StudentId
    FROM dbo.Enrollments AS e
    JOIN dbo.Courses AS c ON c.CourseId = e.CourseId
    WHERE c.Code LIKE 'CS%'
);
```

> **Careful with `NOT IN`:** if the subquery returns any `NULL`, `NOT IN` returns **no rows at all**. Use `NOT EXISTS` instead.

## Correlated subqueries and EXISTS

A **correlated** subquery refers to the outer row, so it runs "for each row":

```sql
-- Each student's best mark
SELECT s.FirstName,
       (SELECT MAX(e.Marks) FROM dbo.Enrollments AS e WHERE e.StudentId = s.StudentId) AS BestMark
FROM dbo.Students AS s;

-- Students with NO enrollments
SELECT s.FirstName
FROM dbo.Students AS s
WHERE NOT EXISTS (SELECT 1 FROM dbo.Enrollments AS e WHERE e.StudentId = s.StudentId);
```

`EXISTS` stops at the first match, so it's efficient. `SELECT 1` is a convention: the selected columns don't matter.

## Derived tables: a subquery in FROM

```sql
SELECT City, AVG(StudentAvg) AS CityAverage
FROM (
    SELECT s.City, e.StudentId, AVG(e.Marks) AS StudentAvg
    FROM dbo.Enrollments AS e
    JOIN dbo.Students AS s ON s.StudentId = e.StudentId
    GROUP BY s.City, e.StudentId
) AS perStudent                     -- a derived table must have an alias
GROUP BY City;
```

## CTEs: WITH ... AS

The same query, easier to read top to bottom:

```sql
WITH PerStudent AS (
    SELECT s.City, e.StudentId, AVG(e.Marks) AS StudentAvg
    FROM dbo.Enrollments AS e
    JOIN dbo.Students AS s ON s.StudentId = e.StudentId
    GROUP BY s.City, e.StudentId
)
SELECT City, AVG(StudentAvg) AS CityAverage
FROM PerStudent
GROUP BY City;
```

> The statement **before** `WITH` must end with `;`. Many people write `;WITH` to be safe.

### Several CTEs

```sql
WITH Graded AS (
    SELECT * FROM dbo.Enrollments WHERE Marks IS NOT NULL
),
CourseAvg AS (
    SELECT CourseId, AVG(Marks) AS AvgMarks FROM Graded GROUP BY CourseId
)
SELECT c.Code, c.Title, ca.AvgMarks
FROM CourseAvg AS ca
JOIN dbo.Courses AS c ON c.CourseId = ca.CourseId
ORDER BY ca.AvgMarks DESC;
```

### "Above their course's average"

```sql
WITH CourseAvg AS (
    SELECT CourseId, AVG(Marks) AS AvgMarks
    FROM dbo.Enrollments
    GROUP BY CourseId
)
SELECT s.FirstName, c.Code, e.Marks, CAST(ca.AvgMarks AS DECIMAL(5,2)) AS CourseAverage
FROM dbo.Enrollments AS e
JOIN CourseAvg     AS ca ON ca.CourseId = e.CourseId
JOIN dbo.Students  AS s  ON s.StudentId = e.StudentId
JOIN dbo.Courses   AS c  ON c.CourseId  = e.CourseId
WHERE e.Marks > ca.AvgMarks
ORDER BY c.Code, e.Marks DESC;
```

## Recursive CTEs

A CTE can refer to itself, which is useful for sequences and hierarchies:

```sql
-- Numbers 1 to 10
WITH Numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM Numbers WHERE n < 10
)
SELECT n FROM Numbers;

-- Every date in January 2026
WITH Days AS (
    SELECT CAST('2026-01-01' AS DATE) AS d
    UNION ALL
    SELECT DATEADD(DAY, 1, d) FROM Days WHERE d < '2026-01-31'
)
SELECT d, DATENAME(WEEKDAY, d) AS DayName FROM Days;
```

Recursion stops at 100 levels by default; add `OPTION (MAXRECURSION 1000)` for more.

## Combining results: UNION, INTERSECT, EXCEPT

```sql
-- Everyone's email (students and teachers); UNION removes duplicates, UNION ALL keeps them
SELECT Email, N'Student' AS Role FROM dbo.Students WHERE Email IS NOT NULL
UNION ALL
SELECT Email, N'Teacher' FROM dbo.Teachers;

-- Students in BOTH CS101 and MA101
SELECT StudentId FROM dbo.Enrollments WHERE CourseId = 1
INTERSECT
SELECT StudentId FROM dbo.Enrollments WHERE CourseId = 4;

-- Students in CS101 but NOT MA101
SELECT StudentId FROM dbo.Enrollments WHERE CourseId = 1
EXCEPT
SELECT StudentId FROM dbo.Enrollments WHERE CourseId = 4;
```

Each query must return the same number of columns with compatible types.

## Key points

- Subqueries can return one value, a list (for `IN`) or a table (in `FROM`).
- Prefer `NOT EXISTS` over `NOT IN` when NULLs are possible.
- CTEs (`WITH name AS (...)`) name steps so complex queries read top to bottom.
- Recursive CTEs generate sequences and walk hierarchies.

## Practice

1. Students whose average marks are higher than the class average.
2. Using a CTE, the top-scoring student in each course.
3. Courses that no student from Chennai takes.
4. Generate the first 12 months of 2026 with a recursive CTE.
