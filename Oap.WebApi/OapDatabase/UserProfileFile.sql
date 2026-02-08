CREATE TABLE [dbo].[UserProfileFile] (
    [Id] uniqueidentifier NOT NULL
        CONSTRAINT [Pk-UserProfileFile] PRIMARY KEY CLUSTERED
        CONSTRAINT [Df-UserProfileFile-Id] DEFAULT newid(),

    [UserId] uniqueidentifier NOT NULL,

    [FileId] uniqueidentifier NOT NULL,

    CONSTRAINT [Fk-UserProfileFile-User]
        FOREIGN KEY ([UserId]) REFERENCES [dbo].[User] ([Id]) 
        ON DELETE CASCADE,

    CONSTRAINT [Fk-UserProfileFile-File]
        FOREIGN KEY ([FileId]) REFERENCES [dbo].[File] ([Id]) 
        ON DELETE CASCADE,

    CONSTRAINT [UQ_UserProfileFile_UserId] UNIQUE ([UserId])
);
