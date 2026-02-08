create table [dbo].[TechnologyTag] (
    [Id] uniqueidentifier not null
        constraint [Pk-TechnologyTag] primary key clustered
        constraint [Df-TechnologyTag-Id] default newid(),

    [Name] nvarchar(100) not null
        constraint [Uk-TechnologyTag-Name] unique
);