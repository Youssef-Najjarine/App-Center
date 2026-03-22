using Microsoft.Data.SqlClient;
using Oap.WebApp.DTOs.ApplicationHistory;
using Oap.WebApp.Interfaces;
using System.Data;

namespace Oap.WebApp.Services
{
    public class ApplicationHistoryService : IApplicationHistory
    {
        private readonly string _connectionString;

        public ApplicationHistoryService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        public async Task<List<SaleHistoryCardDto>> GetMySalesAsync(Guid sellerUserId, string? sort, string? query, string? period)
        {
            var dateFilter = period?.ToUpperInvariant() switch
            {
                "THIS WEEK" => "AND t.PurchasedAtUtc >= DATEADD(DAY, -7, SYSUTCDATETIME())",
                "THIS MONTH" => "AND t.PurchasedAtUtc >= DATEADD(MONTH, DATEDIFF(MONTH, 0, SYSUTCDATETIME()), 0)",
                "LAST MONTH" => "AND t.PurchasedAtUtc >= DATEADD(MONTH, DATEDIFF(MONTH, 0, SYSUTCDATETIME()) - 1, 0) AND t.PurchasedAtUtc < DATEADD(MONTH, DATEDIFF(MONTH, 0, SYSUTCDATETIME()), 0)",
                "LAST 6 MONTHS" => "AND t.PurchasedAtUtc >= DATEADD(MONTH, -6, SYSUTCDATETIME())",
                "THIS YEAR" => "AND t.PurchasedAtUtc >= DATEADD(YEAR, DATEDIFF(YEAR, 0, SYSUTCDATETIME()), 0)",
                _ => "",
            };

            var orderBy = sort?.ToUpperInvariant() switch
            {
                "A-Z" => "uav.Name ASC",
                "Z-A" => "uav.Name DESC",
                "RECENT SOLD" => "t.PurchasedAtUtc DESC",
                "POPULAR" => "t.Amount DESC, t.PurchasedAtUtc DESC",
                _ => "t.PurchasedAtUtc DESC",
            };

            var hasQuery = !string.IsNullOrWhiteSpace(query);

            var sql = $@"
SELECT
    t.Id AS TransactionId,
    t.UserApplicationId,
    t.UserApplicationVersionId,
    t.Amount, t.Status, t.PurchasedAtUtc,
    uav.Name, uav.Description, uav.RepositoryUrl,
    buyer.FirstName + ' ' + buyer.LastName AS BuyerName,
    buyer.EmailAddress AS BuyerEmail,
    pres.FileId AS DefaultPresentationFileId,
    pres.FileCategory AS DefaultPresentationFileCategory,
    pres.ContentType AS DefaultPresentationContentType,
    thumb.FileId AS DefaultPresentationThumbnailFileId
FROM dbo.ApplicationTransaction t
JOIN dbo.UserApplicationVersion uav ON uav.Id = t.UserApplicationVersionId
JOIN dbo.[User] buyer ON buyer.Id = t.BuyerUserId
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
WHERE t.SellerUserId = @SellerId
{dateFilter}
{(hasQuery ? "AND (uav.Name LIKE @Query OR uav.Description LIKE @Query OR buyer.FirstName + ' ' + buyer.LastName LIKE @Query OR buyer.EmailAddress LIKE @Query)" : "")}
ORDER BY {orderBy};";

            var results = new List<SaleHistoryCardDto>();
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@SellerId", SqlDbType.UniqueIdentifier).Value = sellerUserId;
            if (hasQuery) cmd.Parameters.Add("@Query", SqlDbType.NVarChar, 2100).Value = $"%{query}%";

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

                results.Add(new SaleHistoryCardDto
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
                    BuyerName = reader.IsDBNull(reader.GetOrdinal("BuyerName")) ? "" : reader.GetString(reader.GetOrdinal("BuyerName")),
                    BuyerEmail = reader.IsDBNull(reader.GetOrdinal("BuyerEmail")) ? "" : reader.GetString(reader.GetOrdinal("BuyerEmail")),
                    DefaultPresentationUrl = fileId == Guid.Empty ? "" : $"/api/store/file/{fileId}",
                    DefaultPresentationThumbnailUrl = thumbId == Guid.Empty ? "" : $"/api/store/file/{thumbId}",
                    DefaultPresentationFileCategory = fileCategory,
                    DefaultPresentationContentType = contentType,
                    IsVideo = fileCategory == 3,
                });
            }

            return results;
        }

        public async Task<SalesSummaryDto> GetSalesSummaryAsync(Guid sellerUserId, string? period)
        {
            var dateFilter = period?.ToUpperInvariant() switch
            {
                "THIS WEEK" => "AND t.PurchasedAtUtc >= DATEADD(DAY, -7, SYSUTCDATETIME())",
                "THIS MONTH" => "AND t.PurchasedAtUtc >= DATEADD(MONTH, DATEDIFF(MONTH, 0, SYSUTCDATETIME()), 0)",
                "LAST MONTH" => "AND t.PurchasedAtUtc >= DATEADD(MONTH, DATEDIFF(MONTH, 0, SYSUTCDATETIME()) - 1, 0) AND t.PurchasedAtUtc < DATEADD(MONTH, DATEDIFF(MONTH, 0, SYSUTCDATETIME()), 0)",
                "LAST 6 MONTHS" => "AND t.PurchasedAtUtc >= DATEADD(MONTH, -6, SYSUTCDATETIME())",
                "THIS YEAR" => "AND t.PurchasedAtUtc >= DATEADD(YEAR, DATEDIFF(YEAR, 0, SYSUTCDATETIME()), 0)",
                _ => "",
            };

            var sql = $@"
SELECT
    ISNULL(SUM(CASE WHEN t.Status IN (0, 3) THEN t.Amount ELSE 0 END), 0) AS TotalRevenue,
    COUNT(CASE WHEN t.Status IN (0, 3) THEN 1 END) AS ApplicationsSold,
    COUNT(CASE WHEN t.Status IN (2, 3) THEN 1 END) AS DisputedApplications
FROM dbo.ApplicationTransaction t
WHERE t.SellerUserId = @SellerId
{dateFilter};";

            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@SellerId", SqlDbType.UniqueIdentifier).Value = sellerUserId;

            await using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new SalesSummaryDto
                {
                    TotalRevenue = reader.GetDecimal(0),
                    ApplicationsSold = reader.GetInt32(1),
                    DisputedApplications = reader.GetInt32(2),
                };
            }

            return new SalesSummaryDto();
        }

        public async Task<(bool success, string? error)> GiveRefundAsync(Guid sellerUserId, Guid transactionId)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            const string sql = @"
UPDATE dbo.ApplicationTransaction
SET Status = 1, RefundedAtUtc = SYSUTCDATETIME()
WHERE Id = @TxId AND SellerUserId = @SellerId AND Status IN (0, 2, 3);";

            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@TxId", SqlDbType.UniqueIdentifier).Value = transactionId;
            cmd.Parameters.Add("@SellerId", SqlDbType.UniqueIdentifier).Value = sellerUserId;
            var rows = await cmd.ExecuteNonQueryAsync();

            return rows > 0
                ? (true, null)
                : (false, "Transaction not found or already refunded.");
        }
    }
}