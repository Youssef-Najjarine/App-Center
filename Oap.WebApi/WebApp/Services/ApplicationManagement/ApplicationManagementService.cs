using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;
using Oap.WebApp.DTOs.ApplicationAnalytics;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;
using System.Data;

namespace Oap.WebApp.Services
{
    public class ApplicationManagementService : IApplicationManagement
    {
        private readonly string _connectionString;
        private readonly IMemoryCache _cache;
        private readonly IApplicationAnalytics _analytics;
        private const string TechCachePrefix = "ua_tech_v_";

        public ApplicationManagementService(IConfiguration configuration, IMemoryCache cache, IApplicationAnalytics analytics)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
            _cache = cache;
            _analytics = analytics;
        }

        public async Task<List<ApplicationManagementCardDto>> GetManagementCardsAsync(Guid ownerUserId)
        {
            var cards = new List<ApplicationManagementCardDto>();

            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            const string sql = @"
SELECT
    ua.Id                       AS UserApplicationId,
    uav.Id                      AS UserApplicationVersionId,
    uav.Name, uav.Price, uav.Description, uav.RepositoryUrl, uav.CreatedAt,
    pres.FileId                 AS DefaultPresentationFileId,
    pres.FileCategory           AS DefaultPresentationFileCategory,
    pres.ContentType            AS DefaultPresentationContentType,
    thumb.FileId                AS DefaultPresentationThumbnailFileId
FROM dbo.UserApplication ua WITH (NOLOCK)
CROSS APPLY (
    SELECT TOP 1 * FROM dbo.UserApplicationVersion v WITH (NOLOCK)
    WHERE v.UserApplicationId = ua.Id AND v.IsDraft = 0
    ORDER BY v.VersionIndex DESC
) uav
OUTER APPLY (
    SELECT TOP 1 uavf.FileId, uavf.FileCategory, f.ContentType
    FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
    JOIN dbo.[File] f WITH (NOLOCK) ON f.Id = uavf.FileId
    WHERE uavf.UserApplicationVersionId = uav.Id AND uavf.FileCategory IN (2, 3)
    ORDER BY uavf.OrderIndex ASC
) pres
OUTER APPLY (
    SELECT TOP 1 uavf.FileId FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
    WHERE uavf.UserApplicationVersionId = uav.Id AND uavf.FileCategory = 4
) thumb
WHERE ua.OwnerUserId = @OwnerId
ORDER BY uav.CreatedAt DESC;";

            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@OwnerId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
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

                cards.Add(new ApplicationManagementCardDto
                {
                    UserApplicationId = reader.GetGuid(reader.GetOrdinal("UserApplicationId")),
                    UserApplicationVersionId = reader.GetGuid(reader.GetOrdinal("UserApplicationVersionId")),
                    Name = reader.GetString(reader.GetOrdinal("Name")),
                    Price = reader.IsDBNull(reader.GetOrdinal("Price")) ? null : reader.GetDecimal(reader.GetOrdinal("Price")),
                    Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
                    RepositoryUrl = reader.IsDBNull(reader.GetOrdinal("RepositoryUrl")) ? null : reader.GetString(reader.GetOrdinal("RepositoryUrl")),
                    CreatedAt = reader.GetDateTimeOffset(reader.GetOrdinal("CreatedAt")),
                    DefaultPresentationUrl = fileId == Guid.Empty ? "" : $"/api/user-application/get-user-application-file/{fileId}",
                    DefaultPresentationThumbnailUrl = thumbId == Guid.Empty ? "" : $"/api/user-application/get-user-application-file/{thumbId}",
                    DefaultPresentationFileCategory = fileCategory,
                    DefaultPresentationContentType = contentType,
                    IsVideo = fileCategory == 3,
                    Technologies = new List<string>(),
                });
            }

            if (cards.Count > 0)
            {
                var totals = await _analytics.GetBulkTotalsAsync(ownerUserId);
                foreach (var card in cards)
                {
                    if (totals.TryGetValue(card.UserApplicationId, out var t))
                    {
                        card.TotalImpressions = t.impressions;
                        card.TotalClicks = t.clicks;
                    }
                }
            }

            return cards;
        }
    }
}