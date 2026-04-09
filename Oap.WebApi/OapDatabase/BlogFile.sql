CREATE TABLE dbo.BlogFile
(
    BlogId          UNIQUEIDENTIFIER NOT NULL,
    FileId          UNIQUEIDENTIFIER NOT NULL,
    FileCategory    INT              NOT NULL,
    OrderIndex      INT              NOT NULL DEFAULT 0,

    CONSTRAINT PK_BlogFile PRIMARY KEY (BlogId, FileId),
    CONSTRAINT FK_BlogFile_Blog FOREIGN KEY (BlogId) REFERENCES dbo.Blog(Id) ON DELETE CASCADE,
    CONSTRAINT FK_BlogFile_File FOREIGN KEY (FileId) REFERENCES dbo.[File](Id)
);
GO