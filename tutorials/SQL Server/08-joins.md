# Joins

Data is split across tables to avoid repetition. **Joins** put it back together. (Database: **SchoolDB**.)

## INNER JOIN: only matching rows

"Show each course with its teacher's name":

```sql
USE SchoolDB;

SELECT c.Code, c.Title, t.FullName AS Teacher
FROM dbo.Courses AS c
INNER JOIN dbo.Teachers AS t
    ON t.TeacherId = c.TeacherId
ORDER BY c.Code;
```

- `c` and `t` are **table aliases**: short names that make queries readable.
- `ON` says how rows match: the course's `TeacherId` equals the teacher's `TeacherId`.
- Statistics (MA201) is **missing**: it has no teacher, so it has no match. `INNER JOIN` keeps only rows that match on both sides.

`JOIN` alone means `INNER JOIN`.

## Joining three or more tables

"Every student's marks, with names and course titles":

```sql
SELECT s.FirstName, s.LastName, c.Code, c.Title, e.Marks
FROM dbo.Enrollments AS e
JOIN dbo.Students AS s ON s.StudentId = e.StudentId
JOIN dbo.Courses  AS c ON c.CourseId  = e.CourseId
ORDER BY s.LastName, c.Code;
```

## LEFT JOIN: keep everything from the left table

"All courses, with the teacher if there is one":

```sql
SELECT c.Code, c.Title, ISNULL(t.FullName, N'(no teacher)') AS Teacher
FROM dbo.Courses AS c
LEFT JOIN dbo.Teachers AS t ON t.TeacherId = c.TeacherId
ORDER BY c.Code;
```

Now Statistics appears, with `NULL` for teacher columns.

### Finding rows with no match

"Students who aren't enrolled in anything":

```sql
SELECT s.StudentId, s.FirstName, s.LastName
FROM dbo.Students AS s
LEFT JOIN dbo.Enrollments AS e ON e.StudentId = s.StudentId
WHERE e.EnrollmentId IS NULL;      -- Joseph
```

### A common LEFT JOIN mistake

Filtering the right table in `WHERE` turns the LEFT JOIN back into an INNER JOIN:

```sql
-- ❌ Courses with a CS teacher, but courses without a teacher vanish:
SELECT c.Code, t.FullName
FROM dbo.Courses AS c
LEFT JOIN dbo.Teachers AS t ON t.TeacherId = c.TeacherId
WHERE t.Department = N'Computer Science';

-- ✅ All courses; teacher shown only if they're in CS:
SELECT c.Code, t.FullName
FROM dbo.Courses AS c
LEFT JOIN dbo.Teachers AS t ON t.TeacherId = c.TeacherId AND t.Department = N'Computer Science';
```

## RIGHT JOIN and FULL OUTER JOIN

- `RIGHT JOIN` keeps everything from the **right** table. You can always rewrite it as a `LEFT JOIN` by swapping the tables, which most people find easier to read.
- `FULL OUTER JOIN` keeps unmatched rows from **both** sides:

```sql
SELECT t.FullName, c.Code
FROM dbo.Teachers AS t
FULL OUTER JOIN dbo.Courses AS c ON c.TeacherId = t.TeacherId;
```

## CROSS JOIN: every combination

```sql
-- Every student paired with every course (10 × 6 = 60 rows)
SELECT s.FirstName, c.Code
FROM dbo.Students AS s
CROSS JOIN dbo.Courses AS c;
```

Useful for generating schedules or "all possible pairs".

## SELF JOIN: a table joined to itself

"Pairs of students from the same city":

```sql
SELECT a.FirstName AS Student1, b.FirstName AS Student2, a.City
FROM dbo.Students AS a
JOIN dbo.Students AS b
  ON a.City = b.City AND a.StudentId < b.StudentId   -- "<" avoids duplicates and self-pairs
ORDER BY a.City;
```

## Joins with grouping

"Average marks per teacher":

```sql
SELECT t.FullName, COUNT(e.EnrollmentId) AS Enrollments, AVG(e.Marks) AS AvgMarks
FROM dbo.Teachers AS t
JOIN dbo.Courses AS c     ON c.TeacherId = t.TeacherId
JOIN dbo.Enrollments AS e ON e.CourseId  = c.CourseId
GROUP BY t.TeacherId, t.FullName
ORDER BY AvgMarks DESC;
```

"Number of students in every course, including empty ones":

```sql
SELECT c.Code, COUNT(e.EnrollmentId) AS Students   -- COUNT(column) counts 0 for no match; COUNT(*) would say 1
FROM dbo.Courses AS c
LEFT JOIN dbo.Enrollments AS e ON e.CourseId = c.CourseId
GROUP BY c.Code
ORDER BY c.Code;
```

## Join types at a glance

| Join | Returns |
|---|---|
| `INNER JOIN` | only rows that match on both sides |
| `LEFT JOIN` | all left rows + matching right rows (NULLs if none) |
| `RIGHT JOIN` | all right rows + matching left rows |
| `FULL OUTER JOIN` | all rows from both sides |
| `CROSS JOIN` | every combination |

## Key points

- Join on the key columns (`ON a.Id = b.AId`) and always use table aliases.
- `INNER` drops unmatched rows; `LEFT` keeps all rows from the first table.
- `LEFT JOIN ... WHERE right.Id IS NULL` finds rows with no match.
- Put conditions on the right table of a LEFT JOIN in `ON`, not `WHERE`.

## Practice

1. List every enrollment: student full name, course title, teacher name and marks.
2. Courses with no students enrolled. (Hint: LEFT JOIN + IS NULL. Is there one?)
3. For each city, the average marks of students from that city.
4. Teachers and how many courses each teaches, including teachers with none.
