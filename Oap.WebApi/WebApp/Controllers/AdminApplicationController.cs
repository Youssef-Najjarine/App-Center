using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Oap.WebApp.Models;
using Oap.WebApp.Services;
using System.Data;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/admin/apps")]
    public class AdminAppController : ControllerBase
    {
        private readonly AdminCookieService _adminCookieService;
        private readonly string _connectionString;

        public AdminAppController(
            AdminCookieService adminCookieService,
            IConfiguration configuration)
        {
            _adminCookieService = adminCookieService;
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        private AdminTokenInfo? GetAuthedAdmin()
        {
            var token = Request.Cookies["admin_token"];
            if (string.IsNullOrWhiteSpace(token)) return null;
            try
            {
                var info = _adminCookieService.ValidateToken(token);
                if (info == null || info.ExpiresUtc <= DateTime.UtcNow) return null;
                return info;
            }
            catch { return null; }
        }

        [HttpGet("list")]
        public async Task<IActionResult> GetAllApps(
            [FromQuery] string? q,
            [FromQuery] string? sort,
            [FromQuery] string? status)
        {
            try
            {
                var admin = GetAuthedAdmin();
                if (admin == null) return Unauthorized(new { error = "Not authenticated." });

                await using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                var hasQuery = !string.IsNullOrWhiteSpace(q);

                var statusFilter = status?.ToUpperInvariant() switch
                {
                    "PUBLISHED" => "AND uav.IsDraft = 0",
                    "DRAFT" => "AND uav.IsDraft = 1",
                    _ => "",
                };

                var orderBy = sort?.ToUpperInvariant() switch
                {
                    "A-Z" => "uav.Name ASC",
                    "Z-A" => "uav.Name DESC",
                    "POPULAR" => "ISNULL(pop.Total, 0) DESC, uav.CreatedAt DESC",
                    "PRICE-HIGH" => "ISNULL(uav.Price, 0) DESC",
                    "PRICE-LOW" => "ISNULL(uav.Price, 0) ASC",
                    _ => "uav.CreatedAt DESC",
                };

                var sql = $@"
SELECT
    ua.Id AS AppId,
    uav.Id AS VersionId,
    uav.Name,
    uav.Description,
    ISNULL(uav.Price, 0) AS Price,
    uav.IsDraft,
    uav.CreatedAt,
    u.Id AS OwnerId,
    u.FirstName + ' ' + u.LastName AS OwnerName,
    u.EmailAddress AS OwnerEmail,
    pres.FileId AS PresentationFileId,
    pres.FileCategory AS PresentationFileCategory,
    pres.ContentType AS PresentationContentType,
    thumb.FileId AS ThumbnailFileId,
    ISNULL(pop.Total, 0) AS Popularity,
    ISNULL(txCount.Total, 0) AS TotalSales
FROM dbo.UserApplication ua
JOIN dbo.[User] u ON u.Id = ua.OwnerUserId
CROSS APPLY (
    SELECT TOP 1 * FROM dbo.UserApplicationVersion v
    WHERE v.UserApplicationId = ua.Id
    ORDER BY v.VersionIndex DESC
) uav
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
OUTER APPLY (
    SELECT COUNT(*) AS Total
    FROM dbo.ApplicationAnalyticsEvent ae
    WHERE ae.UserApplicationId = ua.Id
) pop
OUTER APPLY (
    SELECT COUNT(*) AS Total
    FROM dbo.ApplicationTransaction t
    WHERE t.UserApplicationId = ua.Id AND t.Status IN (0, 3)
) txCount
WHERE 1=1
{statusFilter}
{(hasQuery ? "AND (uav.Name LIKE @Query OR uav.Description LIKE @Query OR u.FirstName + ' ' + u.LastName LIKE @Query OR u.EmailAddress LIKE @Query)" : "")}
ORDER BY {orderBy};";

                var items = new List<object>();
                await using var cmd = new SqlCommand(sql, conn);
                if (hasQuery) cmd.Parameters.Add("@Query", SqlDbType.NVarChar, 2100).Value = $"%{q!.Trim()}%";

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
                    var isVideo = fileCategory == 3;

                    var imageUrl = isVideo && thumbId != Guid.Empty
                        ? $"/api/store/file/{thumbId}"
                        : fileId != Guid.Empty ? $"/api/store/file/{fileId}" : "";

                    items.Add(new
                    {
                        appId = reader.GetGuid(reader.GetOrdinal("AppId")),
                        versionId = reader.GetGuid(reader.GetOrdinal("VersionId")),
                        name = reader.GetString(reader.GetOrdinal("Name")),
                        description = reader.IsDBNull(reader.GetOrdinal("Description")) ? "" : reader.GetString(reader.GetOrdinal("Description")),
                        price = reader.GetDecimal(reader.GetOrdinal("Price")),
                        isDraft = reader.GetBoolean(reader.GetOrdinal("IsDraft")),
                        createdAt = reader.GetDateTimeOffset(reader.GetOrdinal("CreatedAt")),
                        ownerId = reader.GetGuid(reader.GetOrdinal("OwnerId")),
                        ownerName = reader.IsDBNull(reader.GetOrdinal("OwnerName")) ? "" : reader.GetString(reader.GetOrdinal("OwnerName")),
                        ownerEmail = reader.IsDBNull(reader.GetOrdinal("OwnerEmail")) ? "" : reader.GetString(reader.GetOrdinal("OwnerEmail")),
                        imageUrl,
                        isVideo,
                        popularity = reader.GetInt32(reader.GetOrdinal("Popularity")),
                        totalSales = reader.GetInt32(reader.GetOrdinal("TotalSales")),
                    });
                }

                return Ok(new { success = true, apps = items });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading apps." });
            }
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetAggregateStats()
        {
            try
            {
                var admin = GetAuthedAdmin();
                if (admin == null) return Unauthorized(new { error = "Not authenticated." });

                await using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                const string sql = @"
SELECT
    (SELECT COUNT(*) FROM dbo.UserApplication) AS TotalApps,
    (SELECT COUNT(*) FROM dbo.UserApplicationVersion WHERE IsDraft = 0) AS PublishedVersions,
    (SELECT COUNT(*) FROM dbo.UserApplicationVersion WHERE IsDraft = 1) AS DraftVersions,
    (SELECT COUNT(*) FROM dbo.[User]) AS TotalUsers,
    (SELECT COUNT(*) FROM dbo.ApplicationTransaction WHERE Status IN (0, 3)) AS TotalSales,
    (SELECT ISNULL(SUM(Amount), 0) FROM dbo.ApplicationTransaction WHERE Status IN (0, 3)) AS TotalRevenue,
    (SELECT COUNT(*) FROM dbo.ApplicationTransaction WHERE Status = 1) AS TotalRefunds,
    (SELECT COUNT(*) FROM dbo.ApplicationTransaction WHERE Status IN (2, 3)) AS TotalDisputes,
    (SELECT COUNT(*) FROM dbo.ApplicationAnalyticsEvent) AS TotalImpressions;";

                await using var cmd = new SqlCommand(sql, conn);
                await using var reader = await cmd.ExecuteReaderAsync();

                if (await reader.ReadAsync())
                {
                    return Ok(new
                    {
                        success = true,
                        stats = new
                        {
                            totalApps = reader.GetInt32(0),
                            publishedVersions = reader.GetInt32(1),
                            draftVersions = reader.GetInt32(2),
                            totalUsers = reader.GetInt32(3),
                            totalSales = reader.GetInt32(4),
                            totalRevenue = reader.GetDecimal(5),
                            totalRefunds = reader.GetInt32(6),
                            totalDisputes = reader.GetInt32(7),
                            totalImpressions = reader.GetInt32(8),
                        }
                    });
                }

                return Ok(new { success = true, stats = new { } });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading stats." });
            }
        }

        [HttpGet("top-apps")]
        public async Task<IActionResult> GetTopApps(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 15)
        {
            try
            {
                var admin = GetAuthedAdmin();
                if (admin == null) return Unauthorized(new { error = "Not authenticated." });

                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 100) pageSize = 15;

                await using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                const string countSql = @"
SELECT
    (SELECT COUNT(*) FROM dbo.UserApplication) +
    (SELECT COUNT(DISTINCT UserApplicationId) FROM dbo.ApplicationTransaction
     WHERE UserApplicationId NOT IN (SELECT Id FROM dbo.UserApplication))
AS TotalCount;";

                int totalCount = 0;
                await using (var cmd = new SqlCommand(countSql, conn))
                {
                    totalCount = (int)(await cmd.ExecuteScalarAsync() ?? 0);
                }

                var offset = (page - 1) * pageSize;

                const string sql = @"
;WITH AllApps AS (
    SELECT
        ua.Id AS AppId,
        uav.Name AS AppName,
        u.FirstName + ' ' + u.LastName AS OwnerName,
        ISNULL(pop.Total, 0) AS Impressions,
        ISNULL(txCount.Total, 0) AS Sales,
        ISNULL(txSum.Total, 0) AS Revenue,
        CAST(0 AS BIT) AS IsDeleted
    FROM dbo.UserApplication ua
    JOIN dbo.[User] u ON u.Id = ua.OwnerUserId
    CROSS APPLY (
        SELECT TOP 1 * FROM dbo.UserApplicationVersion v
        WHERE v.UserApplicationId = ua.Id
        ORDER BY v.VersionIndex DESC
    ) uav
    OUTER APPLY (
        SELECT COUNT(*) AS Total FROM dbo.ApplicationAnalyticsEvent ae
        WHERE ae.UserApplicationId = ua.Id
    ) pop
    OUTER APPLY (
        SELECT COUNT(*) AS Total FROM dbo.ApplicationTransaction t
        WHERE t.UserApplicationId = ua.Id AND t.Status IN (0, 3)
    ) txCount
    OUTER APPLY (
        SELECT ISNULL(SUM(Amount), 0) AS Total FROM dbo.ApplicationTransaction t
        WHERE t.UserApplicationId = ua.Id AND t.Status IN (0, 3)
    ) txSum

    UNION ALL

    SELECT
        t.UserApplicationId AS AppId,
        MAX(t.AppName) AS AppName,
        MAX(t.SellerName) AS OwnerName,
        0 AS Impressions,
        COUNT(*) AS Sales,
        ISNULL(SUM(t.Amount), 0) AS Revenue,
        CAST(1 AS BIT) AS IsDeleted
    FROM dbo.ApplicationTransaction t
    WHERE t.Status IN (0, 3)
      AND t.UserApplicationId NOT IN (SELECT Id FROM dbo.UserApplication)
    GROUP BY t.UserApplicationId
)
SELECT AppId, AppName, OwnerName, Impressions, Sales, Revenue, IsDeleted
FROM AllApps
ORDER BY Revenue DESC, Sales DESC, Impressions DESC
OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;";

                var items = new List<object>();
                await using (var cmd = new SqlCommand(sql, conn))
                {
                    cmd.Parameters.Add("@Offset", SqlDbType.Int).Value = offset;
                    cmd.Parameters.Add("@PageSize", SqlDbType.Int).Value = pageSize;

                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        items.Add(new
                        {
                            appId = reader.GetGuid(0),
                            name = reader.IsDBNull(1) ? "(Unknown)" : reader.GetString(1),
                            ownerName = reader.IsDBNull(2) ? "" : reader.GetString(2),
                            impressions = reader.GetInt32(3),
                            sales = reader.GetInt32(4),
                            revenue = reader.GetDecimal(5),
                            isDeleted = reader.GetBoolean(6),
                        });
                    }
                }

                return Ok(new
                {
                    success = true,
                    apps = items,
                    totalCount,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading top apps." });
            }
        }

        [HttpDelete("{appId:guid}")]
        public async Task<IActionResult> DeleteApp([FromRoute] Guid appId)
        {
            try
            {
                var admin = GetAuthedAdmin();
                if (admin == null) return Unauthorized(new { error = "Not authenticated." });

                await using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();
                await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();

                try
                {
                    var fileIds = new List<Guid>();
                    const string getFiles = @"
SELECT uavf.FileId FROM dbo.UserApplicationVersionFile uavf
JOIN dbo.UserApplicationVersion uav ON uav.Id = uavf.UserApplicationVersionId
WHERE uav.UserApplicationId = @AppId;";
                    await using (var cmd = new SqlCommand(getFiles, conn, tx))
                    {
                        cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = appId;
                        await using var reader = await cmd.ExecuteReaderAsync();
                        while (await reader.ReadAsync()) fileIds.Add(reader.GetGuid(0));
                    }

                    const string deleteVersionFiles = @"
DELETE uavf FROM dbo.UserApplicationVersionFile uavf
JOIN dbo.UserApplicationVersion uav ON uav.Id = uavf.UserApplicationVersionId
WHERE uav.UserApplicationId = @AppId;";
                    await using (var cmd = new SqlCommand(deleteVersionFiles, conn, tx))
                    {
                        cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = appId;
                        await cmd.ExecuteNonQueryAsync();
                    }

                    const string deleteVersions = "DELETE FROM dbo.UserApplicationVersion WHERE UserApplicationId = @AppId;";
                    await using (var cmd = new SqlCommand(deleteVersions, conn, tx))
                    {
                        cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = appId;
                        await cmd.ExecuteNonQueryAsync();
                    }

                    const string deleteAnalytics = "DELETE FROM dbo.ApplicationAnalyticsEvent WHERE UserApplicationId = @AppId;";
                    await using (var cmd = new SqlCommand(deleteAnalytics, conn, tx))
                    {
                        cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = appId;
                        await cmd.ExecuteNonQueryAsync();
                    }

                    const string deleteApp = "DELETE FROM dbo.UserApplication WHERE Id = @AppId;";
                    await using (var cmd = new SqlCommand(deleteApp, conn, tx))
                    {
                        cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = appId;
                        var rows = await cmd.ExecuteNonQueryAsync();
                        if (rows == 0) { await tx.RollbackAsync(); return NotFound(new { success = false, error = "App not found." }); }
                    }

                    foreach (var fId in fileIds)
                    {
                        const string deleteOrphan = @"
DELETE FROM dbo.[File] WHERE Id = @FileId
AND NOT EXISTS (SELECT 1 FROM dbo.UserApplicationVersionFile WHERE FileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.UserProfileFile WHERE FileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.ApplicationTransaction WHERE ZipFileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.ApplicationTransaction WHERE PresentationFileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.ApplicationTransaction WHERE ThumbnailFileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.ApplicationTransaction WHERE PresentationFilesJson LIKE '%' + CONVERT(NVARCHAR(36), @FileId) + '%')
AND NOT EXISTS (SELECT 1 FROM dbo.BlogFile WHERE FileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.BlogSection WHERE ImageFileId = @FileId);";
                        await using var cmd = new SqlCommand(deleteOrphan, conn, tx);
                        cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fId;
                        await cmd.ExecuteNonQueryAsync();
                    }

                    await tx.CommitAsync();
                    return Ok(new { success = true });
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error deleting app." });
            }
        }
    }
}