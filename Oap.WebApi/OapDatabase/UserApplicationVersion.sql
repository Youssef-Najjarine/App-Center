create table [dbo].[UserApplicationVersion] (
    [Id] uniqueidentifier not null
        constraint [Pk-UserApplicationVersion] primary key clustered
        constraint [Df-UserApplicationVersion-Id] default newid(),

    [UserApplicationId] uniqueidentifier not null
        constraint [Fk-UserApplicationVersion-UserApplication]
        foreign key references [dbo].[UserApplication] ([Id])
        on delete cascade,

    [VersionIndex] int not null,

    [IsDraft] bit not null
        constraint [Df-UserApplicationVersion-IsDraft] default 1,

    [Name] nvarchar(255) not null,

    [Price] decimal(10,2) null,

    [Description] nvarchar(max) null,

    [RepositoryUrl] varchar(2048) null,

    [CreatedAt] datetimeoffset not null
        constraint [Df-UserApplicationVersion-CreatedAt] default sysdatetimeoffset(),

    constraint [Uk-UserApplicationVersion-VersionIndex]
        unique ([UserApplicationId], [VersionIndex])
);