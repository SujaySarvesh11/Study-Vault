# Window Functions

Window functions calculate across a set of related rows **without collapsing them** like `GROUP BY` does. Each row keeps its detail and gains a calculated value. (Database: **SchoolDB**.)

## The OVER clause

```sql
USE SchoolDB;

SELECT StudentId, CourseId, Marks,
       AVG(Marks) OVER ()                     AS OverallAvg,   -- across all rows
       AVG(Marks) OVER (PARTITION BY CourseId) AS CourseAvg     -- across rows of the same course
FROM dbo.Enrollments
WHERE Marks IS NOT NULL
ORDER BY CourseId, Marks DESC;
```

- `OVER ()`: the "window" is every row.
- `PARTITION BY CourseId`: a separate window per course (like GROUP BY, but rows stay).

## Ranking

```sql
SELECT c.Code, s.FirstName, e.Marks,
       ROW_NUMBER() OVER (PARTITION BY e.CourseId ORDER BY e.Marks DESC) AS RowNum,
       RANK()       OVER (PARTITION BY e.CourseId ORDER BY e.Marks DESC) AS Rnk,
       DENSE_RANK() OVER (PARTITION BY e.CourseId ORDER BY e.Marks DESC) AS DenseRnk,
       NTILE(2)     OVER (PARTITION BY e.CourseId ORDER BY e.Marks DESC) AS Half
FROM dbo.Enrollments AS e
JOIN dbo.Students AS s ON s.StudentId = e.StudentId
JOIN dbo.Courses  AS c ON c.CourseId  = e.CourseId
WHERE e.Marks IS NOT NULL
ORDER BY c.Code, RowNum;
```

For marks 90, 85, 85, 70:

| Function | Result |
|---|---|
| `ROW_NUMBER` | 1, 2, 3, 4 (always unique) |
| `RANK` | 1, 2, 2, 4 (ties share, then a gap) |
| `DENSE_RANK` | 1, 2, 2, 3 (ties share, no gap) |

### Top N per group

A classic: "the top scorer in each course". Window functions can't go in `WHERE`, so use a CTE:

```sql
WITH Ranked AS (
    SELECT e.CourseId, e.StudentId, e.Marks,
           RANK() OVER (PARTITION BY e.CourseId ORDER BY e.Marks DESC) AS Rnk
    FROM dbo.Enrollments AS e
    WHERE e.Marks IS NOT NULL
)
SELECT c.Code, s.FirstName, r.Marks
FROM Ranked AS r
JOIN dbo.Courses  AS c ON c.CourseId  = r.CourseId
JOIN dbo.Students AS s ON s.StudentId = r.StudentId
WHERE r.Rnk = 1
ORDER BY c.Code;
```

### Removing duplicates

```sql
-- Keep only the first row of each duplicate group (example pattern)
WITH Numbered AS (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY Email ORDER BY StudentId) AS rn
    FROM dbo.Students
    WHERE Email IS NOT NULL
)
SELECT * FROM Numbered WHERE rn > 1;   -- these would be the duplicates to delete
```

## Running totals and moving averages

```sql
SELECT EnrolledOn, StudentId,
       COUNT(*) OVER (ORDER BY EnrolledOn, StudentId
                      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS RunningCount
FROM dbo.Students
ORDER BY EnrolledOn, StudentId;

SELECT StudentId, CourseId, Marks,
       AVG(Marks) OVER (PARTITION BY StudentId ORDER BY CourseId
                        ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) AS MovingAvg2
FROM dbo.Enrollments
WHERE Marks IS NOT NULL;
```

The **frame** (`ROWS BETWEEN ...`) chooses which rows around the current one are included.

## Looking at other rows: LAG and LEAD

```sql
SELECT FullName, HireDate,
       LAG(HireDate)  OVER (ORDER BY HireDate) AS PreviousHire,
       LEAD(HireDate) OVER (ORDER BY HireDate) AS NextHire,
       DATEDIFF(DAY, LAG(HireDate) OVER (ORDER BY HireDate), HireDate) AS DaysSincePrevious
FROM dbo.Teachers
ORDER BY HireDate;
```

## FIRST_VALUE and LAST_VALUE

```sql
SELECT e.CourseId, e.StudentId, e.Marks,
       FIRST_VALUE(e.Marks) OVER (PARTITION BY e.CourseId ORDER BY e.Marks DESC) AS BestInCourse,
       e.Marks - FIRST_VALUE(e.Marks) OVER (PARTITION BY e.CourseId ORDER BY e.Marks DESC) AS BehindBest
FROM dbo.Enrollments AS e
WHERE e.Marks IS NOT NULL;
```

`LAST_VALUE` needs a full frame (`ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`); otherwise it just returns the current row.

## Percent of total

```sql
SELECT Department, FullName, Salary,
       CAST(100.0 * Salary / SUM(Salary) OVER (PARTITION BY Department) AS DECIMAL(5,1)) AS PctOfDept
FROM dbo.Teachers
ORDER BY Department, Salary DESC;
```

## Key points

- `function OVER (PARTITION BY ... ORDER BY ...)` computes across related rows and keeps every row.
- `ROW_NUMBER`, `RANK`, `DENSE_RANK` rank rows; filter them via a CTE for "top N per group".
- `SUM/AVG/COUNT OVER (ORDER BY ...)` give running totals; frames control the window.
- `LAG`/`LEAD` compare with previous/next rows.

## Practice

1. Rank students by their average marks across all courses (`DENSE_RANK`).
2. For each student, show each course's marks and the difference from their own average.
3. Show the 2 top-scoring students per course.
4. For teachers ordered by hire date, show the running total of salaries.
