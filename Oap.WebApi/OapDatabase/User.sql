create table [dbo].[User] (
	[Id] uniqueidentifier not null 
		constraint [Pk-User] primary key clustered
		constraint [Df-User-Id] default newid(),
	[Username] nvarchar(255) not null
		constraint [Uk-User-Username] unique,
	[PasswordHash] varchar(512) not null,
    [EmailAddress] nvarchar(255) not null
        constraint [Uk-User-EmailAddress] unique,
	[IsVerified] bit not null
		constraint [Df-User-IsVerified] default 0,
	[FirstName] nvarchar(100) not null,
	[LastName] nvarchar(100) not null,
	[BioText] nvarchar(max) null
)