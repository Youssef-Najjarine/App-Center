CREATE TABLE dbo.Blog
(
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    AdminAccountId  UNIQUEIDENTIFIER NOT NULL,
    Title           NVARCHAR(500)    NOT NULL,
    Tag             NVARCHAR(100)    NOT NULL DEFAULT '',
    Slug            NVARCHAR(500)    NOT NULL,
    IsPublished     BIT              NOT NULL DEFAULT 0,
    IsFeatured      BIT              NOT NULL DEFAULT 0,
    PublishedAtUtc   DATETIME2(0)    NULL,
    CreatedAtUtc    DATETIME2(0)     NOT NULL DEFAULT SYSUTCDATETIME(),
    ViewCount       INT              NOT NULL DEFAULT 0,

    CONSTRAINT PK_Blog PRIMARY KEY NONCLUSTERED (Id),
    CONSTRAINT FK_Blog_AdminAccount FOREIGN KEY (AdminAccountId) REFERENCES dbo.AdminAccount(Id),
    CONSTRAINT UQ_Blog_Slug UNIQUE (Slug)
);
GO

CREATE CLUSTERED INDEX IX_Blog_PublishedAtUtc
    ON dbo.Blog (PublishedAtUtc DESC);
GO

CREATE NONCLUSTERED INDEX IX_Blog_ViewCount
    ON dbo.Blog (ViewCount DESC)
    INCLUDE (Title, Tag, Slug, IsPublished);
GO

CREATE NONCLUSTERED INDEX IX_Blog_Tag
    ON dbo.Blog (Tag, PublishedAtUtc DESC)
    WHERE IsPublished = 1;
GO