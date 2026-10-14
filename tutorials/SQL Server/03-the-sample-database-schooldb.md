# The Sample Database: SchoolDB

All the following lessons use this small school database. Run the whole script below once (in SSMS: paste it and press **F5**; with sqlcmd: save it as `schooldb.sql` and run `sqlcmd -S localhost -E -C -i schooldb.sql`). Running it again resets the data.

## The tables

```
Teachers ──< Courses ──< Enrollments >── Students
 (1 teacher teaches many courses)   (a student has many enrollments)
```

| Table | What it holds |
|---|---|
| `Students` | one row per student |
| `Teachers` | one row per teacher |
| `Courses` | one row per course; `TeacherId` says who teaches it (may be empty) |
| `Enrollments` | one row per student-in-a-course, with their `Marks` (empty until graded) |

`Enrollments` is a **junction table**: it connects many students to many courses.

## The script

```sql
IF DB_ID('SchoolDB') IS NULL CREATE DATABASE SchoolDB;
GO
USE SchoolDB;
GO

DROP TABLE IF EXISTS dbo.Enrollments, dbo.Courses, dbo.Students, dbo.Teachers;

CREATE TABLE dbo.Teachers (
    TeacherId  INT IDENTITY(1,1) CONSTRAINT PK_Teachers PRIMARY KEY,
    FullName   NVARCHAR(100) NOT NULL,
    Email      NVARCHAR(200) NOT NULL CONSTRAINT UQ_Teachers_Email UNIQUE,
    Department NVARCHAR(50)  NOT NULL,
    HireDate   DATE          NOT NULL,
    Salary     DECIMAL(10,2) NOT NULL CONSTRAINT CK_Teachers_Salary CHECK (Salary > 0)
);

CREATE TABLE dbo.Students (
    StudentId   INT IDENTITY(1,1) CONSTRAINT PK_Students PRIMARY KEY,
    FirstName   NVARCHAR(50)  NOT NULL,
    LastName    NVARCHAR(50)  NOT NULL,
    Email       NVARCHAR(200) NULL CONSTRAINT UQ_Students_Email UNIQUE,
    DateOfBirth DATE          NOT NULL,
    City        NVARCHAR(50)  NOT NULL,
    EnrolledOn  DATE          NOT NULL CONSTRAINT DF_Students_EnrolledOn DEFAULT (CAST(GETDATE() AS DATE))
);

CREATE TABLE dbo.Courses (
    CourseId  INT IDENTITY(1,1) CONSTRAINT PK_Courses PRIMARY KEY,
    Code      VARCHAR(10)   NOT NULL CONSTRAINT UQ_Courses_Code UNIQUE,
    Title     NVARCHAR(100) NOT NULL,
    Credits   TINYINT       NOT NULL CONSTRAINT CK_Courses_Credits CHECK (Credits BETWEEN 1 AND 6),
    TeacherId INT           NULL CONSTRAINT FK_Courses_Teachers REFERENCES dbo.Teachers(TeacherId)
);

CREATE TABLE dbo.Enrollments (
    EnrollmentId INT IDENTITY(1,1) CONSTRAINT PK_Enrollments PRIMARY KEY,
    StudentId    INT NOT NULL CONSTRAINT FK_Enrollments_Students REFERENCES dbo.Students(StudentId),
    CourseId     INT NOT NULL CONSTRAINT FK_Enrollments_Courses REFERENCES dbo.Courses(CourseId),
    EnrolledOn   DATE NOT NULL,
    Marks        DECIMAL(5,2) NULL CONSTRAINT CK_Enrollments_Marks CHECK (Marks BETWEEN 0 AND 100),
    CONSTRAINT UQ_Enrollments_Student_Course UNIQUE (StudentId, CourseId)
);

INSERT INTO dbo.Teachers (FullName, Email, Department, HireDate, Salary) VALUES
 (N'Ramesh Kumar', N'ramesh.kumar@school.edu', N'Computer Science', '2015-06-01', 72000),
 (N'Priya Nair',   N'priya.nair@school.edu',   N'Mathematics',      '2018-07-15', 65000),
 (N'Arjun Mehta',  N'arjun.mehta@school.edu',  N'Physics',          '2012-01-10', 81000),
 (N'Lakshmi Iyer', N'lakshmi.iyer@school.edu', N'Computer Science', '2020-03-01', 60000);

INSERT INTO dbo.Courses (Code, Title, Credits, TeacherId) VALUES
 ('CS101', N'Introduction to Programming',       4, 1),
 ('CS201', N'Databases with SQL Server',         4, 4),
 ('CS202', N'Web Development with TypeScript',   3, 1),
 ('MA101', N'Calculus I',                        4, 2),
 ('PH101', N'Physics Fundamentals',              3, 3),
 ('MA201', N'Statistics',                        3, NULL);   -- no teacher assigned yet

INSERT INTO dbo.Students (FirstName, LastName, Email, DateOfBirth, City, EnrolledOn) VALUES
 (N'Asha',    N'Krishnan',     N'asha.k@mail.com',    '2005-03-14', N'Chennai',    '2023-07-01'),
 (N'Ravi',    N'Shankar',      N'ravi.s@mail.com',    '2004-11-02', N'Bengaluru',  '2023-07-01'),
 (N'Meena',   N'Raj',          N'meena.r@mail.com',   '2005-08-21', N'Chennai',    '2023-07-01'),
 (N'Karthik', N'Subramanian',  N'karthik.s@mail.com', '2003-01-30', N'Coimbatore', '2022-07-01'),
 (N'Divya',   N'Menon',        N'divya.m@mail.com',   '2004-05-09', N'Kochi',      '2022-07-01'),
 (N'Arun',    N'Prakash',      NULL,                  '2005-12-25', N'Madurai',    '2024-07-01'),
 (N'Sneha',   N'Reddy',        N'sneha.r@mail.com',   '2004-07-18', N'Hyderabad',  '2023-07-01'),
 (N'Vikram',  N'Singh',        N'vikram.s@mail.com',  '2003-09-05', N'Delhi',      '2022-07-01'),
 (N'Fatima',  N'Begum',        N'fatima.b@mail.com',  '2005-02-11', N'Chennai',    '2024-07-01'),
 (N'Joseph',  N'Thomas',       N'joseph.t@mail.com',  '2004-10-27', N'Bengaluru',  '2024-07-01'); -- not enrolled in any course

INSERT INTO dbo.Enrollments (StudentId, CourseId, EnrolledOn, Marks) VALUES
 (1, 1, '2025-07-15', 92), (1, 2, '2025-07-15', 88), (1, 4, '2025-07-15', 79),
 (2, 1, '2025-07-15', 67), (2, 3, '2025-07-15', 74),
 (3, 2, '2025-07-15', 95), (3, 3, '2025-07-15', 91), (3, 6, '2026-01-12', NULL),
 (4, 1, '2025-07-15', 55), (4, 4, '2025-07-15', 38), (4, 5, '2025-07-15', 61),
 (5, 2, '2025-07-15', 82), (5, 5, '2025-07-15', 73),
 (6, 1, '2026-01-12', NULL),
 (7, 3, '2025-07-15', 86), (7, 4, '2025-07-15', 90),
 (8, 5, '2025-07-15', 45), (8, 4, '2025-07-15', 58),
 (9, 2, '2026-01-12', NULL);

SELECT 'Teachers' AS TableName, COUNT(*) AS RowsLoaded FROM dbo.Teachers
UNION ALL SELECT 'Courses', COUNT(*) FROM dbo.Courses
UNION ALL SELECT 'Students', COUNT(*) FROM dbo.Students
UNION ALL SELECT 'Enrollments', COUNT(*) FROM dbo.Enrollments;
```

You should see 4 teachers, 6 courses, 10 students and 19 enrollments.

## Things to notice in the script

- **Named constraints** (`CONSTRAINT PK_Students ...`) give clear error messages and are easy to drop later.
- `REFERENCES` creates **foreign keys**: you can't enroll student 999 if they don't exist.
- `UNIQUE (StudentId, CourseId)`: a student can't enroll in the same course twice.
- `CHECK (Marks BETWEEN 0 AND 100)`: impossible marks are rejected.
- Some values are deliberately `NULL` (Arun has no email; three enrollments have no marks yet; Statistics has no teacher). That makes the `NULL` and `LEFT JOIN` lessons more interesting.

## Peek at the data

```sql
USE SchoolDB;
SELECT * FROM dbo.Students;
SELECT * FROM dbo.Courses;
SELECT * FROM dbo.Enrollments;
```

## Practice

1. Run the script. Check the row counts.
2. Try `INSERT INTO dbo.Enrollments (StudentId, CourseId, EnrolledOn) VALUES (999, 1, '2026-01-01');`. Read the error.
3. Try giving someone 120 marks. Which constraint stops you?
