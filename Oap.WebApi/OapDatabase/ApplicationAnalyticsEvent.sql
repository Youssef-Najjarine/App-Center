CREATE TABLE dbo.ApplicationAnalyticsEvent
(
    Id                   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    UserApplicationId    UNIQUEIDENTIFIER NOT NULL,
    ViewerUserId         UNIQUEIDENTIFIER NULL,
    EventType            TINYINT          NOT NULL,
    OccurredAtUtc        DATETIME2(0)     NOT NULL DEFAULT SYSUTCDATETIME(),
 
    CONSTRAINT PK_ApplicationAnalyticsEvent PRIMARY KEY NONCLUSTERED (Id),
    CONSTRAINT FK_AAE_UserApplication
        FOREIGN KEY (UserApplicationId) REFERENCES dbo.UserApplication(Id)
);