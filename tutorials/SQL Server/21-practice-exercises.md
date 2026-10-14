# Practice Exercises with Solutions

All exercises use **SchoolDB**. Reset it first by running the script from *The Sample Database*, so your results match. Try each one before opening the solution.

## Exercise 1: Basic SELECT

List students from Chennai or Bengaluru, showing full name and city, sorted by city then last name.

<details><summary>Solution</summary>

```sql
SELECT FirstName + N' ' + LastName AS FullName, City
FROM dbo.Students
WHERE City IN (N'Chennai', N'Bengaluru')
ORDER BY City, LastName;
```
</details>

## Exercise 2: NULL handling

Show every enrollment's ID and marks, but show `'Not graded'` for missing marks.

<details><summary>Solution</summary>

```sql
SELECT EnrollmentId,
       COALESCE(CAST(Marks AS NVARCHAR(10)), N'Not graded') AS Marks
FROM dbo.Enrollments;
```
(`COALESCE` needs both values to be the same kind, hence the `CAST` to text.)
</details>

## Exercise 3: Aggregates

How many students were born in each year? Show only years with 2 or more students.

<details><summary>Solution</summary>

```sql
SELECT YEAR(DateOfBirth) AS BirthYear, COUNT(*) AS Students
FROM dbo.Students
GROUP BY YEAR(DateOfBirth)
HAVING COUNT(*) >= 2
ORDER BY BirthYear;
```
</details>

## Exercise 4: Joins

For every course (including those without a teacher), show the code, title, teacher name and number of students enrolled.

<details><summary>Solution</summary>

```sql
SELECT c.Code, c.Title,
       ISNULL(t.FullName, N'(none)') AS Teacher,
       COUNT(e.EnrollmentId)         AS Students
FROM dbo.Courses AS c
LEFT JOIN dbo.Teachers    AS t ON t.TeacherId = c.TeacherId
LEFT JOIN dbo.Enrollments AS e ON e.CourseId  = c.CourseId
GROUP BY c.Code, c.Title, t.FullName
ORDER BY c.Code;
```
</details>

## Exercise 5: Subquery

Students who have **never** scored below 75 in any graded course (and have at least one graded course).

<details><summary>Solution</summary>

```sql
SELECT s.FirstName, s.LastName
FROM dbo.Students AS s
WHERE EXISTS (SELECT 1 FROM dbo.Enrollments AS e WHERE e.StudentId = s.StudentId AND e.Marks IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM dbo.Enrollments AS e WHERE e.StudentId = s.StudentId AND e.Marks < 75);
```
</details>

## Exercise 6: CTE + window function

For each student, show their average marks and their rank in the class (highest average = 1). Ignore ungraded enrollments.

<details><summary>Solution</summary>

```sql
WITH StudentAvg AS (
    SELECT StudentId, AVG(Marks) AS AvgMarks
    FROM dbo.Enrollments
    WHERE Marks IS NOT NULL
    GROUP BY StudentId
)
SELECT s.FirstName, s.LastName,
       CAST(sa.AvgMarks AS DECIMAL(5,2)) AS AvgMarks,
       DENSE_RANK() OVER (ORDER BY sa.AvgMarks DESC) AS ClassRank
FROM StudentAvg AS sa
JOIN dbo.Students AS s ON s.StudentId = sa.StudentId
ORDER BY ClassRank;
```
</details>

## Exercise 7: Top per group

The highest-paid teacher in each department.

<details><summary>Solution</summary>

```sql
WITH Ranked AS (
    SELECT Department, FullName, Salary,
           ROW_NUMBER() OVER (PARTITION BY Department ORDER BY Salary DESC) AS rn
    FROM dbo.Teachers
)
SELECT Department, FullName, Salary
FROM Ranked
WHERE rn = 1;
```
</details>

## Exercise 8: Modify data safely

Inside a transaction, give every student in course **PH101** 3 extra marks (never above 100). Show old and new marks with `OUTPUT`, then roll back.

<details><summary>Solution</summary>

```sql
BEGIN TRANSACTION;

UPDATE e
SET e.Marks = IIF(e.Marks + 3 > 100, 100, e.Marks + 3)
OUTPUT inserted.EnrollmentId, deleted.Marks AS OldMarks, inserted.Marks AS NewMarks
FROM dbo.Enrollments AS e
JOIN dbo.Courses AS c ON c.CourseId = e.CourseId
WHERE c.Code = 'PH101' AND e.Marks IS NOT NULL;

ROLLBACK TRANSACTION;
```
</details>

## Exercise 9: View

Create a view `dbo.vReportCard` with student name, course code, marks and pass/fail, then use it to list failing results.

<details><summary>Solution</summary>

```sql
CREATE OR ALTER VIEW dbo.vReportCard
AS
SELECT s.FirstName + N' ' + s.LastName AS Student,
       c.Code AS Course,
       e.Marks,
       CASE WHEN e.Marks IS NULL THEN N'Pending'
            WHEN e.Marks >= 40 THEN N'Pass'
            ELSE N'Fail' END AS Result
FROM dbo.Enrollments AS e
JOIN dbo.Students AS s ON s.StudentId = e.StudentId
JOIN dbo.Courses  AS c ON c.CourseId  = e.CourseId;
GO

SELECT * FROM dbo.vReportCard WHERE Result = N'Fail';
```
</details>

## Exercise 10: Stored procedure with error handling

Write `dbo.SetMarks @EnrollmentId INT, @Marks DECIMAL(5,2)` that rejects marks outside 0–100 and unknown enrollment IDs with clear errors.

<details><summary>Solution</summary>

```sql
CREATE OR ALTER PROCEDURE dbo.SetMarks
    @EnrollmentId INT,
    @Marks        DECIMAL(5,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Marks IS NULL OR @Marks < 0 OR @Marks > 100
        THROW 50100, 'Marks must be between 0 and 100.', 1;

    UPDATE dbo.Enrollments SET Marks = @Marks WHERE EnrollmentId = @EnrollmentId;

    IF @@ROWCOUNT = 0
        THROW 50101, 'No enrollment with that ID.', 1;
END;
GO

EXEC dbo.SetMarks @EnrollmentId = 8, @Marks = 72;    -- ✅
EXEC dbo.SetMarks @EnrollmentId = 8, @Marks = 120;   -- ❌ 50100
```
</details>

## Mini project: Library database

Design and build it yourself, using everything from the course:

1. Tables: `Authors`, `Books`, `BookAuthors` (many-to-many), `Members`, `Loans` (with `LoanedOn`, `DueOn`, `ReturnedOn`).
2. Constraints: a book's ISBN is unique; `DueOn > LoanedOn`; a copy can't be loaned twice at once.
3. Views: `vOverdueLoans` (not returned, past due) with member and book names.
4. Procedures: `LendBook` and `ReturnBook` with validation, transactions and `THROW`.
5. Indexes for the queries you run most.
6. A TypeScript API over it, following *Using SQL Server from TypeScript*.
