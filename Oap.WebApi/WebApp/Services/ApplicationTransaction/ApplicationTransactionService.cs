using Microsoft.Data.SqlClient;
using Oap.WebApp.DTOs.ApplicationTransaction;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;
using System.Data;

namespace Oap.WebApp.Services
{
    public class ApplicationTransactionService : IApplicationTransaction
    {
        private readonly string _connectionString;

        public ApplicationTransactionService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        /// <summary>
        /// Creates a purchase transaction. Records the listed price but skips payment (mock).
        /// Prevents: buying own app, duplicate active purchase.
        /// </summary>
        public async Task<PurchaseResult> PurchaseAsync(Guid buyerUserId, Guid userApplicationId)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            // Get app info: owner, price, latest published version
            Guid sellerUserId;
            Guid versionId;
            decimal price;

            const string appSql = @"
SELECT ua.OwnerUserId, uav.Id AS VersionId, ISNULL(uav.Price, 0) AS Price
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
            }

            // Prevent buying own app
            if (buyerUserId == sellerUserId)
                return new PurchaseResult { Success = false, Error = "You cannot purchase your own application." };

            // Check for existing active purchase
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

            // Insert transaction (mock — no real payment)
            var transactionId = Guid.NewGuid();
            const string insertSql = @"
INSERT INTO dbo.ApplicationTransaction
    (Id, BuyerUserId, SellerUserId, UserApplicationId, UserApplicationVersionId, Amount, Status, PurchasedAtUtc)
VALUES
    (@Id, @BuyerId, @SellerId, @AppId, @VersionId, @Amount, 0, SYSUTCDATETIME());";

            await using (var cmd = new SqlCommand(insertSql, conn))
            {
                cmd.Parameters.Add("@Id", SqlDbType.UniqueIdentifier).Value = transactionId;
                cmd.Parameters.Add("@BuyerId", SqlDbType.UniqueIdentifier).Value = buyerUserId;
                cmd.Parameters.Add("@SellerId", SqlDbType.UniqueIdentifier).Value = sellerUserId;
                cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
                cmd.Parameters.Add("@Amount", SqlDbType.Decimal).Value = price;
                await cmd.ExecuteNonQueryAsync();
            }

            return new PurchaseResult { Success = true, TransactionId = transactionId };
        }

        /// <summary>
        /// Returns all purchases for the buyer, sorted by the given option.
        /// Includes seller name/email and app presentation info.
        /// </summary>
        public async Task<List<PurchasedAppCardDto>> GetMyPurchasesAsync(Guid buyerUserId, string? sort)
        {
            var orderBy = sort?.ToUpperInvariant() switch
            {
                "A-Z" => "uav.Name ASC",
                "Z-A" => "uav.Name DESC",
                "POPULAR" => "t.Amount DESC, t.PurchasedAtUtc DESC",
                _ => "t.PurchasedAtUtc DESC", // Latest
            };

            var sql = $@"
SELECT
    t.Id AS TransactionId,
    t.UserApplicationId,
    t.UserApplicationVersionId,
    t.Amount, t.Status, t.PurchasedAtUtc,
    uav.Name, uav.Description, uav.RepositoryUrl,
    seller.FirstName + ' ' + seller.LastName AS SellerName,
    seller.EmailAddress AS SellerEmail,
    pres.FileId AS DefaultPresentationFileId,
    pres.FileCategory AS DefaultPresentationFileCategory,
    pres.ContentType AS DefaultPresentationContentType,
    thumb.FileId AS DefaultPresentationThumbnailFileId
FROM dbo.ApplicationTransaction t
JOIN dbo.UserApplicationVersion uav ON uav.Id = t.UserApplicationVersionId
JOIN dbo.[User] seller ON seller.Id = t.SellerUserId
OUTER APPLY (
    SELECT TOP 1 uavf.FileId, uavf.FileCategory, f.ContentType
    FROM dbo.UserApplicationVersionFile uavf
    JOIN dbo.[File] f ON f.Id = uavf.FileId
    WHERE uavf.UserApplicationVersionId = uav.Id AND uavf.FileCategory IN (2, 3)
    ORDER BY uavf.OrderIndex ASC
) pres
OUTER APPLY (
    SELECT TOP 1 uavf.FileId
    FROM dbo.UserApplicationVersionFile uavf
    WHERE uavf.UserApplicationVersionId = uav.Id AND uavf.FileCategory = 4
) thumb
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
                var fileId = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationFileId"))
                    ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DefaultPresentationFileId"));
                var fileCategory = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationFileCategory"))
                    ? 0 : reader.GetInt32(reader.GetOrdinal("DefaultPresentationFileCategory"));
                var contentType = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationContentType"))
                    ? "" : reader.GetString(reader.GetOrdinal("DefaultPresentationContentType"));
                var thumbId = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationThumbnailFileId"))
                    ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DefaultPresentationThumbnailFileId"));

                results.Add(new PurchasedAppCardDto
                {
                    TransactionId = reader.GetGuid(reader.GetOrdinal("TransactionId")),
                    UserApplicationId = reader.GetGuid(reader.GetOrdinal("UserApplicationId")),
                    UserApplicationVersionId = reader.GetGuid(reader.GetOrdinal("UserApplicationVersionId")),
                    Amount = reader.GetDecimal(reader.GetOrdinal("Amount")),
                    Status = reader.GetByte(reader.GetOrdinal("Status")),
                    PurchasedAt = new DateTimeOffset(reader.GetDateTime(reader.GetOrdinal("PurchasedAtUtc")), TimeSpan.Zero),
                    Name = reader.GetString(reader.GetOrdinal("Name")),
                    Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
                    RepositoryUrl = reader.IsDBNull(reader.GetOrdinal("RepositoryUrl")) ? null : reader.GetString(reader.GetOrdinal("RepositoryUrl")),
                    SellerName = reader.IsDBNull(reader.GetOrdinal("SellerName")) ? "" : reader.GetString(reader.GetOrdinal("SellerName")),
                    SellerEmail = reader.IsDBNull(reader.GetOrdinal("SellerEmail")) ? "" : reader.GetString(reader.GetOrdinal("SellerEmail")),
                    DefaultPresentationUrl = fileId == Guid.Empty ? "" : $"/api/store/file/{fileId}",
                    DefaultPresentationThumbnailUrl = thumbId == Guid.Empty ? "" : $"/api/store/file/{thumbId}",
                    DefaultPresentationFileCategory = fileCategory,
                    DefaultPresentationContentType = contentType,
                    IsVideo = fileCategory == 3,
                });
            }

            return results;
        }

        public async Task<CheckPurchaseResult> CheckPurchaseStatusAsync(Guid userId, Guid userApplicationId)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            // Check if user owns the app
            const string ownSql = "SELECT TOP 1 1 FROM dbo.UserApplication WHERE Id = @AppId AND OwnerUserId = @UserId;";
            await using (var cmd = new SqlCommand(ownSql, conn))
            {
                cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                if (await cmd.ExecuteScalarAsync() != null)
                    return new CheckPurchaseResult { IsOwnApp = true, AlreadyPurchased = false };
            }

            // Check if already purchased
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

        /// <summary>
        /// Report an issue with a purchase. Sets Status = 3 (Reported).
        /// </summary>
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

        /// <summary>
        /// Streams the ZIP file for a purchased app after verifying the buyer owns the purchase.
        /// </summary>
        public async Task<(Stream? fileStream, string? fileName, string? error)> GetPurchasedZipAsync(Guid buyerUserId, Guid appId)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            // Verify active purchase exists
            const string verifySql = @"
SELECT TOP 1 t.UserApplicationVersionId, uav.Name
FROM dbo.ApplicationTransaction t
JOIN dbo.UserApplicationVersion uav ON uav.Id = t.UserApplicationVersionId
WHERE t.BuyerUserId = @BuyerId AND t.UserApplicationId = @AppId AND t.Status IN (0, 3);";

            Guid versionId;
            string appName;

            await using (var cmd = new SqlCommand(verifySql, conn))
            {
                cmd.Parameters.Add("@BuyerId", SqlDbType.UniqueIdentifier).Value = buyerUserId;
                cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = appId;
                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                    return (null, null, "Purchase not found or has been refunded.");
                versionId = reader.GetGuid(0);
                appName = reader.IsDBNull(1) ? "application" : reader.GetString(1);
            }

            // Find the ZIP file
            const string zipSql = @"
SELECT TOP 1 f.Id, f.FileContents
FROM dbo.UserApplicationVersionFile uavf
JOIN dbo.[File] f ON f.Id = uavf.FileId
WHERE uavf.UserApplicationVersionId = @VersionId AND uavf.FileCategory = 1
ORDER BY uavf.OrderIndex;";

            await using var zipCmd = new SqlCommand(zipSql, conn);
            zipCmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
            await using var zipReader = await zipCmd.ExecuteReaderAsync(System.Data.CommandBehavior.SequentialAccess);

            if (!await zipReader.ReadAsync())
                return (null, null, "ZIP file not found for this application.");

            var stream = zipReader.GetStream(1);
            var memStream = new MemoryStream();
            await stream.CopyToAsync(memStream);
            memStream.Position = 0;

            var safeName = string.IsNullOrWhiteSpace(appName) ? "application" : appName.Trim();
            // Replace spaces and special chars with hyphens, truncate to 25 chars
            safeName = System.Text.RegularExpressions.Regex.Replace(safeName, @"[^\w\-.]", "-");
            safeName = System.Text.RegularExpressions.Regex.Replace(safeName, @"-{2,}", "-").Trim('-');
            if (safeName.Length > 25) safeName = safeName[..25].TrimEnd('-');
            return (memStream, $"{safeName}.zip", null);
        }
    }
}