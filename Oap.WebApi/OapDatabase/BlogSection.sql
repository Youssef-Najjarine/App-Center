CREATE TABLE dbo.BlogSection
(
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    BlogId          UNIQUEIDENTIFIER NOT NULL,
    SectionIndex    INT              NOT NULL,
    SectionType     TINYINT          NOT NULL,
    TextContent     NVARCHAR(MAX)    NULL,
    ImageFileId     UNIQUEIDENTIFIER NULL,

    CONSTRAINT PK_BlogSection PRIMARY KEY NONCLUSTERED (Id),
    CONSTRAINT FK_BlogSection_Blog FOREIGN KEY (BlogId) REFERENCES dbo.Blog(Id) ON DELETE CASCADE,
    CONSTRAINT FK_BlogSection_File FOREIGN KEY (ImageFileId) REFERENCES dbo.[File](Id)
);
GO

CREATE CLUSTERED INDEX IX_BlogSection_BlogId_SectionIndex
    ON dbo.BlogSection (BlogId, SectionIndex ASC);
GO