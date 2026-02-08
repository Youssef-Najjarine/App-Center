create table [dbo].[File] (
    [Id] uniqueidentifier not null
        constraint [Pk-File] primary key clustered
        constraint [Df-File-Id] default newid(),

    [ContentType] varchar(50) not null,

    [FileContents] varbinary(max) not null,

    [CreatedAt] datetimeoffset not null
        constraint [Df-File-CreatedAt] default sysdatetimeoffset()
);