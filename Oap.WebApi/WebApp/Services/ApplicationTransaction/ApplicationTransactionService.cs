using Microsoft.Data.SqlClient;
using Oap.WebApp.DTOs.ApplicationTransaction;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;
using System.Data;
using System.Text.Json;

namespace Oap.WebApp.Services
{
    public class ApplicationTransactionService : IApplicationTransaction
    {
        private readonly string _connectionString;

        public ApplicationTransactionService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        public async Task<PurchaseResult> PurchaseAsync(Guid buyerUserId, Guid userApplicationId)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            Guid sellerUserId;
            Guid versionId;
            decimal price;
            string appName;
            string? appDescription;
            string? appRepositoryUrl;

            const string appSql = @"
SELECT ua.OwnerUserId, uav.Id AS VersionId, ISNULL(uav.Price, 0) AS Price,
       uav.Name, uav.Description, uav.RepositoryUrl
FROM dbo.UserApplication ua
JOIN dbo.UserApplicationVersion uav ON uav.UserApplicationId = ua.Id
WHERE ua.Id = @AppId AND uav.IsDraft = 0
ORDER BY uav.VersionIndex DESC
OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY;";

            await using (var cmd = new SqlCommand(appSql, conn))
            {
                cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                    return new PurchaseResult { Success = false, Error = "Application not found." };
                sellerUserId = reader.GetGuid(0);
                versionId = reader.GetGuid(1);
                price = reader.GetDecimal(2);
                appName = reader.GetString(3);
                appDescription = reader.IsDBNull(4) ? null : reader.GetString(4);
                appRepositoryUrl = reader.IsDBNull(5) ? null : reader.GetString(5);
            }

            if (buyerUserId == sellerUserId)
                return new PurchaseResult { Success = false, Error = "You cannot purchase your own application." };

            const string dupSql = @"
SELECT TOP 1 1 FROM dbo.ApplicationTransaction
WHERE BuyerUserId = @BuyerId AND UserApplicationId = @AppId AND Status = 0;";

            await using (var cmd = new SqlCommand(dupSql, conn))
            {
                cmd.Parameters.Add("@BuyerId", SqlDbType.UniqueIdentifier).Value = buyerUserId;
                cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                if (await cmd.ExecuteScalarAsync() != null)
                    return new PurchaseResult { Success = false, Error = "You have already purchased this application." };
            }

            string sellerName = "";
            string sellerEmail = "";
            const string sellerSql = "SELECT FirstName + ' ' + LastName, EmailAddress FROM dbo.[User] WHERE Id = @SellerId;";
            await using (var cmd = new SqlCommand(sellerSql, conn))
            {
                cmd.Parameters.Add("@SellerId", SqlDbType.UniqueIdentifier).Value = sellerUserId;
                await using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    sellerName = reader.IsDBNull(0) ? "" : reader.GetString(0);
                    sellerEmail = reader.IsDBNull(1) ? "" : reader.GetString(1);
                }
            }

            string buyerName = "";
            string buyerEmail = "";
            const string buyerSql = "SELECT FirstName + ' ' + LastName, EmailAddress FROM dbo.[User] WHERE Id = @BuyerId;";
            await using (var cmd = new SqlCommand(buyerSql, conn))
            {
                cmd.Parameters.Add("@BuyerId", SqlDbType.UniqueIdentifier).Value = buyerUserId;
                await using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    buyerName = reader.IsDBNull(0) ? "" : reader.GetString(0);
                    buyerEmail = reader.IsDBNull(1) ? "" : reader.GetString(1);
                }
            }

            Guid? zipFileId = null;
            const string zipSql = @"
SELECT TOP 1 uavf.FileId FROM dbo.UserApplicationVersionFile uavf
WHERE uavf.UserApplicationVersionId = @VersionId AND uavf.FileCategory = 1
ORDER BY uavf.OrderIndex;";
            await using (var cmd = new SqlCommand(zipSql, conn))
            {
                cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
                var obj = await cmd.ExecuteScalarAsync();
                if (obj != null && obj != DBNull.Value) zipFileId = (Guid)obj;
            }

            var allFiles = new List<object>();
            Guid? presentationFileId = null;
            int? presentationFileCategory = null;
            string? presentationContentType = null;
            Guid? thumbnailFileId = null;

            const string allFilesSql = @"
SELECT uavf.FileId, uavf.FileCategory, uavf.OrderIndex, f.ContentType
FROM dbo.UserApplicationVersionFile uavf
JOIN dbo.[File] f ON f.Id = uavf.FileId
WHERE uavf.UserApplicationVersionId = @VersionId AND uavf.FileCategory IN (2, 3, 4)
ORDER BY uavf.FileCategory ASC, uavf.OrderIndex ASC;";

            await using (var cmd = new SqlCommand(allFilesSql, conn))
            {
                cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
                await using var reader = await cmd.ExecuteReaderAsync();
                bool firstPresSet = false;
                while (await reader.ReadAsync())
                {
                    var fId = reader.GetGuid(0);
                    var fCat = reader.GetInt32(1);
                    var fOrder = reader.GetInt32(2);
                    var fCType = reader.GetString(3);

                    allFiles.Add(new
                    {
                        fileId = fId.ToString(),
                        fileCategory = fCat,
                        contentType = fCType,
                        orderIndex = fOrder,
                        url = $"/api/transaction/file/{fId}"
                    });

                    if (fCat == 4)
                    {
                        thumbnailFileId = fId;
                    }
                    else if (!firstPresSet && (fCat == 2 || fCat == 3))
                    {
                        presentationFileId = fId;
                        presentationFileCategory = fCat;
                        presentationContentType = fCType;
                        firstPresSet = true;
                    }
                }
            }

            string? presentationFilesJson = allFiles.Count > 0 ? JsonSerializer.Serialize(allFiles) : null;

            var transactionId = Guid.NewGuid();
            const string insertSql = @"
INSERT INTO dbo.ApplicationTransaction
    (Id, BuyerUserId, SellerUserId, UserApplicationId, UserApplicationVersionId,
     Amount, Status, PurchasedAtUtc,
     AppName, AppDescription, AppRepositoryUrl,
     SellerName, SellerEmail, BuyerName, BuyerEmail,
     ZipFileId, PresentationFileId, PresentationFileCategory, PresentationContentType, ThumbnailFileId,
     PresentationFilesJson)
VALUES
    (@Id, @BuyerId, @SellerId, @AppId, @VersionId,
     @Amount, 0, SYSUTCDATETIME(),
     @AppName, @AppDescription, @AppRepositoryUrl,
     @SellerName, @SellerEmail, @BuyerName, @BuyerEmail,
     @ZipFileId, @PresentationFileId, @PresentationFileCategory, @PresentationContentType, @ThumbnailFileId,
     @PresentationFilesJson);";

            await using (var cmd = new SqlCommand(insertSql, conn))
            {
                cmd.Parameters.Add("@Id", SqlDbType.UniqueIdentifier).Value = transactionId;
                cmd.Parameters.Add("@BuyerId", SqlDbType.UniqueIdentifier).Value = buyerUserId;
                cmd.Parameters.Add("@SellerId", SqlDbType.UniqueIdentifier).Value = sellerUserId;
                cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
                cmd.Parameters.Add("@Amount", SqlDbType.Decimal).Value = price;
                cmd.Parameters.Add("@AppName", SqlDbType.NVarChar, 500).Value = appName;
                cmd.Parameters.Add("@AppDescription", SqlDbType.NVarChar, -1).Value = (object?)appDescription ?? DBNull.Value;
                cmd.Parameters.Add("@AppRepositoryUrl", SqlDbType.NVarChar, 2100).Value = (object?)appRepositoryUrl ?? DBNull.Value;
                cmd.Parameters.Add("@SellerName", SqlDbType.NVarChar, 200).Value = sellerName;
                cmd.Parameters.Add("@SellerEmail", SqlDbType.NVarChar, 255).Value = sellerEmail;
                cmd.Parameters.Add("@BuyerName", SqlDbType.NVarChar, 200).Value = buyerName;
                cmd.Parameters.Add("@BuyerEmail", SqlDbType.NVarChar, 255).Value = buyerEmail;
                cmd.Parameters.Add("@ZipFileId", SqlDbType.UniqueIdentifier).Value = (object?)zipFileId ?? DBNull.Value;
                cmd.Parameters.Add("@PresentationFileId", SqlDbType.UniqueIdentifier).Value = (object?)presentationFileId ?? DBNull.Value;
                cmd.Parameters.Add("@PresentationFileCategory", SqlDbType.Int).Value = (object?)presentationFileCategory ?? DBNull.Value;
                cmd.Parameters.Add("@PresentationContentType", SqlDbType.NVarChar, 100).Value = (object?)presentationContentType ?? DBNull.Value;
                cmd.Parameters.Add("@ThumbnailFileId", SqlDbType.UniqueIdentifier).Value = (object?)thumbnailFileId ?? DBNull.Value;
                cmd.Parameters.Add("@PresentationFilesJson", SqlDbType.NVarChar, -1).Value = (object?)presentationFilesJson ?? DBNull.Value;
                await cmd.ExecuteNonQueryAsync();
            }

            return new PurchaseResult { Success = true, TransactionId = transactionId };
        }

        public async Task<List<PurchasedAppCardDto>> GetMyPurchasesAsync(Guid buyerUserId, string? sort)
        {
            var orderBy = sort?.ToUpperInvariant() switch
            {
                "A-Z" => "t.AppName ASC",
                "Z-A" => "t.AppName DESC",
                "POPULAR" => "t.Amount DESC, t.PurchasedAtUtc DESC",
                _ => "t.PurchasedAtUtc DESC",
            };

            var sql = $@"
SELECT
    t.Id AS TransactionId,
    t.UserApplicationId,
    t.UserApplicationVersionId,
    t.Amount, t.Status, t.PurchasedAtUtc,
    t.AppName, t.AppDescription, t.AppRepositoryUrl,
    t.SellerName, t.SellerEmail,
    t.PresentationFileId,
    t.PresentationFileCategory,
    t.PresentationContentType,
    t.ThumbnailFileId,
    t.PresentationFilesJson
FROM dbo.ApplicationTransaction t
WHERE t.BuyerUserId = @BuyerId
ORDER BY {orderBy};";

            var results = new List<PurchasedAppCardDto>();
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@BuyerId", SqlDbType.UniqueIdentifier).Value = buyerUserId;

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var fileId = reader.IsDBNull(reader.GetOrdinal("PresentationFileId"))
                    ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("PresentationFileId"));
                var fileCategory = reader.IsDBNull(reader.GetOrdinal("PresentationFileCategory"))
                    ? 0 : reader.GetInt32(reader.GetOrdinal("PresentationFileCategory"));
                var contentType = reader.IsDBNull(reader.GetOrdinal("PresentationContentType"))
                    ? "" : reader.GetString(reader.GetOrdinal("PresentationContentType"));
                var thumbId = reader.IsDBNull(reader.GetOrdinal("ThumbnailFileId"))
                    ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("ThumbnailFileId"));

                results.Add(new PurchasedAppCardDto
                {
                    TransactionId = reader.GetGuid(reader.GetOrdinal("TransactionId")),
                    UserApplicationId = reader.GetGuid(reader.GetOrdinal("UserApplicationId")),
                    UserApplicationVersionId = reader.GetGuid(reader.GetOrdinal("UserApplicationVersionId")),
                    Amount = reader.GetDecimal(reader.GetOrdinal("Amount")),
                    Status = reader.GetByte(reader.GetOrdinal("Status")),
                    PurchasedAt = new DateTimeOffset(reader.GetDateTime(reader.GetOrdinal("PurchasedAtUtc")), TimeSpan.Zero),
                    Name = reader.GetString(reader.GetOrdinal("AppName")),
                    Description = reader.IsDBNull(reader.GetOrdinal("AppDescription")) ? null : reader.GetString(reader.GetOrdinal("AppDescription")),
                    RepositoryUrl = reader.IsDBNull(reader.GetOrdinal("AppRepositoryUrl")) ? null : reader.GetString(reader.GetOrdinal("AppRepositoryUrl")),
                    SellerName = reader.GetString(reader.GetOrdinal("SellerName")),
                    SellerEmail = reader.GetString(reader.GetOrdinal("SellerEmail")),
                    DefaultPresentationUrl = fileId == Guid.Empty ? "" : $"/api/transaction/file/{fileId}",
                    DefaultPresentationThumbnailUrl = thumbId == Guid.Empty ? "" : $"/api/transaction/file/{thumbId}",
                    DefaultPresentationFileCategory = fileCategory,
                    DefaultPresentationContentType = contentType,
                    IsVideo = fileCategory == 3,
                    PresentationFilesJson = reader.IsDBNull(reader.GetOrdinal("PresentationFilesJson")) ? null : reader.GetString(reader.GetOrdinal("PresentationFilesJson")),
                });
            }

            return results;
        }

        public async Task<CheckPurchaseResult> CheckPurchaseStatusAsync(Guid userId, Guid userApplicationId)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            const string ownSql = "SELECT TOP 1 1 FROM dbo.UserApplication WHERE Id = @AppId AND OwnerUserId = @UserId;";
            await using (var cmd = new SqlCommand(ownSql, conn))
            {
                cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                if (await cmd.ExecuteScalarAsync() != null)
                    return new CheckPurchaseResult { IsOwnApp = true, AlreadyPurchased = false };
            }

            const string purchSql = @"
SELECT TOP 1 1 FROM dbo.ApplicationTransaction
WHERE BuyerUserId = @UserId AND UserApplicationId = @AppId AND Status = 0;";
            await using (var cmd = new SqlCommand(purchSql, conn))
            {
                cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                var result = await cmd.ExecuteScalarAsync();
                return new CheckPurchaseResult { IsOwnApp = false, AlreadyPurchased = result != null };
            }
        }

        public async Task<(bool success, string? error)> RequestRefundAsync(Guid buyerUserId, Guid transactionId)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            const string sql = @"
UPDATE dbo.ApplicationTransaction
SET Status = 2
WHERE Id = @TxId AND BuyerUserId = @BuyerId AND Status = 0;";

            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@TxId", SqlDbType.UniqueIdentifier).Value = transactionId;
            cmd.Parameters.Add("@BuyerId", SqlDbType.UniqueIdentifier).Value = buyerUserId;
            var rows = await cmd.ExecuteNonQueryAsync();

            return rows > 0
                ? (true, null)
                : (false, "Transaction not found or already refunded.");
        }

        public async Task<(bool success, string? error)> ReportIssueAsync(Guid buyerUserId, Guid transactionId)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            const string sql = @"
UPDATE dbo.ApplicationTransaction
SET Status = 3
WHERE Id = @TxId AND BuyerUserId = @BuyerId AND Status IN (0, 2);";

            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@TxId", SqlDbType.UniqueIdentifier).Value = transactionId;
            cmd.Parameters.Add("@BuyerId", SqlDbType.UniqueIdentifier).Value = buyerUserId;
            var rows = await cmd.ExecuteNonQueryAsync();

            return rows > 0
                ? (true, null)
                : (false, "Transaction not found or already resolved.");
        }

        public async Task<(Stream? fileStream, string? fileName, string? error)> GetPurchasedZipAsync(Guid buyerUserId, Guid appId)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            const string verifySql = @"
SELECT TOP 1 t.ZipFileId, t.AppName
FROM dbo.ApplicationTransaction t
WHERE t.BuyerUserId = @BuyerId AND t.UserApplicationId = @AppId AND t.Status IN (0, 3);";

            Guid? zipFileId;
            string appName;

            await using (var cmd = new SqlCommand(verifySql, conn))
            {
                cmd.Parameters.Add("@BuyerId", SqlDbType.UniqueIdentifier).Value = buyerUserId;
                cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = appId;
                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                    return (null, null, "Purchase not found or has been refunded.");
                zipFileId = reader.IsDBNull(0) ? null : reader.GetGuid(0);
                appName = reader.IsDBNull(1) ? "application" : reader.GetString(1);
            }

            if (zipFileId == null)
                return (null, null, "ZIP file not found for this application.");

            const string zipSql = "SELECT FileContents FROM dbo.[File] WHERE Id = @FileId;";
            await using var zipCmd = new SqlCommand(zipSql, conn);
            zipCmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = zipFileId.Value;
            await using var zipReader = await zipCmd.ExecuteReaderAsync(CommandBehavior.SequentialAccess);

            if (!await zipReader.ReadAsync())
                return (null, null, "ZIP file not found for this application.");

            var stream = zipReader.GetStream(0);
            var memStream = new MemoryStream();
            await stream.CopyToAsync(memStream);
            memStream.Position = 0;

            var safeName = string.IsNullOrWhiteSpace(appName) ? "application" : appName.Trim();
            safeName = System.Text.RegularExpressions.Regex.Replace(safeName, @"[^\w\-.]", "-");
            safeName = System.Text.RegularExpressions.Regex.Replace(safeName, @"-{2,}", "-").Trim('-');
            if (safeName.Length > 25) safeName = safeName[..25].TrimEnd('-');
            return (memStream, $"{safeName}.zip", null);
        }
    }
}