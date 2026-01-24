create table [dbo].[UserApplication] (
	[Id] uniqueidentifier not null 
		constraint [Pk-UserApplication] primary key clustered
		constraint [Df-UserApplication-Id] default newid(),
	[OwnerUserId] uniqueidentifier not null
		constraint [Fk-UserApplication-User] 
		foreign key references [dbo].[User] ([Id]),
)
