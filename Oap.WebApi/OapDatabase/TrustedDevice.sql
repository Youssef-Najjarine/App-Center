CREATE TABLE [dbo].[TrustedDevice] (
    [Id] uniqueidentifier not null
        constraint [PK_TrustedDevice] primary key clustered
        constraint [DF_TrustedDevice_Id] default newid(),

    [UserId] uniqueidentifier not null
        constraint [FK_TrustedDevice_User]
        foreign key references [dbo].[User] ([Id]),

    [DeviceId] nvarchar(64) not null,
    [LastVerifiedUtc] datetime not null,

    constraint [UK_TrustedDevice_User_Device] unique (UserId, DeviceId)
);
