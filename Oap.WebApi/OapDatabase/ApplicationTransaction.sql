CREATE TABLE dbo.ApplicationTransaction
(
    Id                          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    BuyerUserId                 UNIQUEIDENTIFIER NOT NULL,
    SellerUserId                UNIQUEIDENTIFIER NOT NULL,
    UserApplicationId           UNIQUEIDENTIFIER NOT NULL,
    UserApplicationVersionId    UNIQUEIDENTIFIER NOT NULL,
    Amount                      DECIMAL(18,2)    NOT NULL DEFAULT 0,
    Status                      TINYINT          NOT NULL DEFAULT 0,
    PurchasedAtUtc              DATETIME2(0)     NOT NULL DEFAULT SYSUTCDATETIME(),
    RefundedAtUtc               DATETIME2(0)     NULL,

    CONSTRAINT PK_ApplicationTransaction PRIMARY KEY NONCLUSTERED (Id),
    CONSTRAINT FK_AT_BuyerUser
        FOREIGN KEY (BuyerUserId) REFERENCES dbo.[User](Id),
    CONSTRAINT FK_AT_SellerUser
        FOREIGN KEY (SellerUserId) REFERENCES dbo.[User](Id),
    CONSTRAINT FK_AT_UserApplication
        FOREIGN KEY (UserApplicationId) REFERENCES dbo.UserApplication(Id)
);
GO

CREATE CLUSTERED INDEX IX_AT_PurchasedAtUtc
    ON dbo.ApplicationTransaction (PurchasedAtUtc DESC);
GO

CREATE NONCLUSTERED INDEX IX_AT_BuyerUserId
    ON dbo.ApplicationTransaction (BuyerUserId, PurchasedAtUtc DESC)
    INCLUDE (UserApplicationId, SellerUserId, Amount, Status);
GO

CREATE NONCLUSTERED INDEX IX_AT_SellerUserId
    ON dbo.ApplicationTransaction (SellerUserId, PurchasedAtUtc DESC)
    INCLUDE (UserApplicationId, BuyerUserId, Amount, Status);
GO

CREATE UNIQUE NONCLUSTERED INDEX UX_AT_BuyerApp
    ON dbo.ApplicationTransaction (BuyerUserId, UserApplicationId)
    WHERE Status = 0;
GO