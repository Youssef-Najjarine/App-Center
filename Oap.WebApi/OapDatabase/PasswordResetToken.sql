CREATE TABLE [dbo].[PasswordResetToken] (
    [Id] UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT [PK_PasswordResetToken] PRIMARY KEY CLUSTERED
        CONSTRAINT [DF_PasswordResetToken_Id] DEFAULT NEWID(),

    [UserId] UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT [FK_PasswordResetToken_User]
        FOREIGN KEY REFERENCES [dbo].[User] ([Id]),

    [TokenHash] VARCHAR(128) NOT NULL,
    [ExpirationTime] DATETIME NOT NULL,
    [Used] BIT NOT NULL CONSTRAINT [DF_PasswordResetToken_Used] DEFAULT 0,
    [CreatedAt] DATETIME NOT NULL CONSTRAINT [DF_PasswordResetToken_CreatedAt] DEFAULT GETDATE()
);
