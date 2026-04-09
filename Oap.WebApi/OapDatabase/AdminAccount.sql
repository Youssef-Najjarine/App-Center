CREATE TABLE dbo.AdminAccount
(
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    Username        NVARCHAR(255)    NOT NULL,
    PasswordHash    VARCHAR(512)     NOT NULL,
    DisplayName     NVARCHAR(200)    NOT NULL DEFAULT '',
    CreatedAtUtc    DATETIME2(0)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_AdminAccount PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_AdminAccount_Username UNIQUE (Username)
);
GO