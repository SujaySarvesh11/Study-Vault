# Backup and Restore

Disks fail, people run `DELETE` without `WHERE`, laptops get stolen. Backups are your undo button, **if you have them and have tested restoring them**.

## Recovery models

| Model | What you can restore to | Log backups |
|---|---|---|
| `SIMPLE` | the last full/differential backup | not possible |
| `FULL` | any point in time | required (or the log grows forever) |
| `BULK_LOGGED` | like FULL, with faster bulk loads | required |

```sql
SELECT name, recovery_model_desc FROM sys.databases;
ALTER DATABASE SchoolDB SET RECOVERY SIMPLE;   -- fine for learning databases
```

## Backup types

| Type | Contains | Size/speed |
|---|---|---|
| **Full** | the whole database | largest |
| **Differential** | changes since the last full | grows during the week |
| **Transaction log** | changes since the last log backup | small, frequent (FULL model only) |

A common schedule: full weekly, differential daily, log every 15 minutes.

## Taking a backup

```sql
BACKUP DATABASE SchoolDB
TO DISK = N'C:\SQLBackups\SchoolDB_full.bak'
WITH INIT,            -- overwrite the file
     COMPRESSION,     -- smaller file
     CHECKSUM,        -- detect corruption
     STATS = 10;      -- show progress every 10%
```

> Create the folder first. The **SQL Server service account** (not you) writes the file, so it needs permission to that folder. If you get "Access is denied", use SQL Server's default backup folder:

```sql
SELECT SERVERPROPERTY('InstanceDefaultBackupPath') AS DefaultBackupFolder;
```

Differential and log backups:

```sql
BACKUP DATABASE SchoolDB TO DISK = N'C:\SQLBackups\SchoolDB_diff.bak' WITH DIFFERENTIAL, INIT, COMPRESSION;
BACKUP LOG SchoolDB TO DISK = N'C:\SQLBackups\SchoolDB_log.trn' WITH INIT;   -- ❌ error 4208 while the database uses SIMPLE: log backups need the FULL model
```

In SSMS: right-click the database → **Tasks → Back Up...**

## Checking a backup

```sql
RESTORE VERIFYONLY FROM DISK = N'C:\SQLBackups\SchoolDB_full.bak' WITH CHECKSUM;
RESTORE HEADERONLY FROM DISK = N'C:\SQLBackups\SchoolDB_full.bak';     -- what's inside
RESTORE FILELISTONLY FROM DISK = N'C:\SQLBackups\SchoolDB_full.bak';   -- data/log file names
```

A backup you've never restored is a hope, not a backup.

## Restoring

Restore over the existing database (everyone is disconnected):

```sql
USE master;
ALTER DATABASE SchoolDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE SchoolDB FROM DISK = N'C:\SQLBackups\SchoolDB_full.bak' WITH REPLACE, RECOVERY;
ALTER DATABASE SchoolDB SET MULTI_USER;
```

Restore as a **copy** with a new name (safe way to practise or to recover a few rows):

```sql
RESTORE DATABASE SchoolDB_Copy
FROM DISK = N'C:\SQLBackups\SchoolDB_full.bak'
WITH MOVE N'SchoolDB'     TO N'C:\SQLBackups\SchoolDB_Copy.mdf',   -- logical names from FILELISTONLY
     MOVE N'SchoolDB_log' TO N'C:\SQLBackups\SchoolDB_Copy_log.ldf',
     RECOVERY;
```

Full + differential + log backups are restored as a **chain**: each with `NORECOVERY` except the last, which uses `RECOVERY` to bring the database online. A complete walk-through:

```sql
USE master;
ALTER DATABASE SchoolDB SET RECOVERY FULL;          -- log backups need the FULL model

BACKUP DATABASE SchoolDB TO DISK = N'C:\SQLBackups\SchoolDB_full.bak' WITH INIT, COMPRESSION;
-- ...a day of work...
BACKUP DATABASE SchoolDB TO DISK = N'C:\SQLBackups\SchoolDB_diff.bak' WITH DIFFERENTIAL, INIT, COMPRESSION;
-- ...more work...
BACKUP LOG SchoolDB TO DISK = N'C:\SQLBackups\SchoolDB_log.trn' WITH INIT;

-- Disaster! Restore the chain:
ALTER DATABASE SchoolDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE SchoolDB FROM DISK = N'C:\SQLBackups\SchoolDB_full.bak' WITH NORECOVERY, REPLACE;
RESTORE DATABASE SchoolDB FROM DISK = N'C:\SQLBackups\SchoolDB_diff.bak' WITH NORECOVERY;
RESTORE LOG SchoolDB FROM DISK = N'C:\SQLBackups\SchoolDB_log.trn' WITH RECOVERY;
ALTER DATABASE SchoolDB SET MULTI_USER;
ALTER DATABASE SchoolDB SET RECOVERY SIMPLE;        -- back to SIMPLE for a learning database
```

To stop at a moment in time (just before someone ran a bad `DELETE`), add `STOPAT` to the log restore: `WITH STOPAT = '2026-10-14T10:29:00', RECOVERY`.

## Backup history

```sql
SELECT TOP (10) database_name, type, backup_start_date, backup_finish_date,
       CAST(backup_size / 1048576.0 AS DECIMAL(10,1)) AS SizeMB
FROM msdb.dbo.backupset
ORDER BY backup_start_date DESC;
-- type: D = full, I = differential, L = log
```

## Automating

- **SQL Server Agent** jobs (Developer/Standard/Enterprise) can run backups on a schedule. In SSMS use **Maintenance Plans**.
- **Express** has no Agent: use Windows Task Scheduler running `sqlcmd -S localhost -E -C -Q "BACKUP DATABASE ..."`.

## The 3-2-1 rule

Keep **3** copies of your data, on **2** different kinds of storage, with **1** off-site (another building or the cloud). A backup on the same disk as the database doesn't survive that disk failing.

## Other ways to copy a database

- **Export as a `.bacpac`** (schema + data) with SSMS: *Tasks → Export Data-tier Application*, useful for moving to Azure SQL.
- **Generate Scripts** (*Tasks → Generate Scripts*) for a SQL script of the schema and optionally data.

## Key points

- Choose a recovery model: SIMPLE for learning, FULL for point-in-time recovery.
- Use full + differential (+ log) backups with `COMPRESSION` and `CHECKSUM`.
- **Test restores** regularly, ideally to a copy with `MOVE`.
- Automate backups and keep a copy off the machine.

## Practice

1. Back up SchoolDB to the default backup folder, then run `RESTORE VERIFYONLY`.
2. Delete all rows from `Enrollments`, then restore the backup as `SchoolDB_Copy` and copy the rows back with `INSERT ... SELECT` (remember `SET IDENTITY_INSERT`).
3. Look at your backup history in `msdb`.
