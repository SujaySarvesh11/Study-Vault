# Views

A **view** is a saved `SELECT` that you can query like a table. It stores the query, not the data (unless it's an indexed view).

## Why use views?

- **Simplicity**: hide complicated joins behind a simple name.
- **Consistency**: everyone calculates "grade" the same way.
- **Security**: give users access to the view, not the underlying tables, or hide columns like salary.

## Creating a view

```sql
USE SchoolDB;
GO

CREATE OR ALTER VIEW dbo.vStudentResults
AS
SELECT e.EnrollmentId,
       s.StudentId,
       s.FirstName + N' ' + s.LastName AS StudentName,
       s.City,
       c.Code       AS CourseCode,
       c.Title      AS CourseTitle,
       t.FullName   AS Teacher,
       e.Marks,
       CASE
         WHEN e.Marks IS NULL THEN N'Pending'
         WHEN e.Marks >= 90 THEN N'A'
         WHEN e.Marks >= 75 THEN N'B'
         WHEN e.Marks >= 60 THEN N'C'
         WHEN e.Marks >= 40 THEN N'D'
         ELSE N'F'
       END AS Grade
FROM dbo.Enrollments AS e
JOIN dbo.Students AS s ON s.StudentId = e.StudentId
JOIN dbo.Courses  AS c ON c.CourseId  = e.CourseId
LEFT JOIN dbo.Teachers AS t ON t.TeacherId = c.TeacherId;
GO
```

- `CREATE OR ALTER` creates the view, or replaces it if it exists.
- `CREATE VIEW` must be the only statement in its batch, hence the `GO` lines.
- A view can't have `ORDER BY` (except with `TOP`); sort when you query it.

## Using it

```sql
SELECT StudentName, CourseCode, Marks, Grade
FROM dbo.vStudentResults
WHERE City = N'Chennai'
ORDER BY StudentName, CourseCode;

SELECT Grade, COUNT(*) AS Students
FROM dbo.vStudentResults
GROUP BY Grade
ORDER BY Grade;
```

## A view for security

Teachers' salaries are private. Give a reporting user this view instead of the table:

```sql
CREATE OR ALTER VIEW dbo.vTeacherDirectory
AS
SELECT TeacherId, FullName, Email, Department
FROM dbo.Teachers;
GO
```

(See *Security and Permissions* for granting access to it.)

## Updating through a view

Simple views over one table can be updated: the change goes to the base table:

```sql
UPDATE dbo.vTeacherDirectory SET Email = N'lakshmi.i@school.edu' WHERE TeacherId = 4;
```

`WITH CHECK OPTION` stops updates that would make the row disappear from the view:

```sql
CREATE OR ALTER VIEW dbo.vChennaiStudents
AS
SELECT StudentId, FirstName, LastName, City FROM dbo.Students WHERE City = N'Chennai'
WITH CHECK OPTION;
GO

UPDATE dbo.vChennaiStudents SET City = N'Delhi' WHERE StudentId = 1;  -- ❌ fails the CHECK OPTION
```

## Seeing and removing views

```sql
SELECT name, create_date FROM sys.views;
EXEC sp_helptext 'dbo.vStudentResults';      -- shows the view's SQL

DROP VIEW IF EXISTS dbo.vChennaiStudents;
```

## Indexed views (brief)

Adding a unique clustered index to a view (created `WITH SCHEMABINDING`) makes SQL Server **store** its results and keep them updated. This is great for expensive aggregates that are read often, but it has many restrictions and slows down writes. Use it only when you've measured a need.

## Key points

- A view is a named, reusable `SELECT`. Query it like a table.
- Use views to hide complexity and sensitive columns.
- `CREATE OR ALTER VIEW` in its own batch; no `ORDER BY` inside.
- `WITH CHECK OPTION` keeps updates within the view's filter.

## Practice

1. Create `vCourseSummary`: code, title, teacher, number enrolled, average marks.
2. Use `vStudentResults` to find every student with at least one `F`.
3. Create `vUngraded` listing enrollments that still need marks, with student and course names.
