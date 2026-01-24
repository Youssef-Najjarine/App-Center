CREATE TABLE [dbo].[UserVerification] (
    [Id] uniqueidentifier not null
        constraint [PK_UserVerification] primary key clustered
        constraint [DF_UserVerification_Id] default newid(),
    [UserId] uniqueidentifier not null
        constraint [Uk-UserVerification-UserId] unique
        constraint [FK-UserVerification-User] foreign key references [dbo].[User] ([Id]),
    [VerificationCode] nvarchar(64) not null,
    [ExpirationTime] datetime not null
);