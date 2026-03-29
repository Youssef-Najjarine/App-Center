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

    AppName                     NVARCHAR(500)    NOT NULL DEFAULT '',
    AppDescription              NVARCHAR(MAX)    NULL,
    AppRepositoryUrl            NVARCHAR(2100)   NULL,
    SellerName                  NVARCHAR(200)    NOT NULL DEFAULT '',
    SellerEmail                 NVARCHAR(255)    NOT NULL DEFAULT '',
    BuyerName                   NVARCHAR(200)    NOT NULL DEFAULT '',
    BuyerEmail                  NVARCHAR(255)    NOT NULL DEFAULT '',
    ZipFileId                   UNIQUEIDENTIFIER NULL,
    PresentationFileId          UNIQUEIDENTIFIER NULL,
    PresentationFileCategory    INT              NULL,
    PresentationContentType     NVARCHAR(100)    NULL,
    ThumbnailFileId             UNIQUEIDENTIFIER NULL,
    PresentationFilesJson       NVARCHAR(MAX)    NULL,

    CONSTRAINT PK_ApplicationTransaction PRIMARY KEY NONCLUSTERED (Id)
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