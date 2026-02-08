create table [dbo].[UserApplicationVersionFile] (
    [Id] uniqueidentifier not null
        constraint [Pk-UserApplicationVersionFile] primary key clustered
        constraint [Df-UserApplicationVersionFile-Id] default newid(),

    [UserApplicationVersionId] uniqueidentifier not null
        constraint [Fk-UserApplicationVersionFile-UserApplicationVersion]
        foreign key references [dbo].[UserApplicationVersion] ([Id])
        on delete cascade,

    [FileId] uniqueidentifier not null
        constraint [Fk-UserApplicationVersionFile-File]
        foreign key references [dbo].[File] ([Id])
        on delete cascade,

    [FileCategory] int not null,
    [OrderIndex] int not null,
    [CreatedAt] datetimeoffset not null
        constraint [Df-UserApplicationVersionFile-CreatedAt] default sysdatetimeoffset()
);