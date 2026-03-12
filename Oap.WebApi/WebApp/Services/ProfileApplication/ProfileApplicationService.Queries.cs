using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;
using Oap.WebApp.DTOs.UserApplication;
using Oap.WebApp.Models;
using System.Data;

namespace Oap.WebApp.Services
{
    public partial class ProfileApplicationService
    {
        public async Task<UserApplicationCardDto?> GetCreatedCardAsync(
            Guid ownerUserId, Guid userApplicationId, Guid userApplicationVersionId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string sql = @"
SELECT
    ua.Id                                               AS UserApplicationId,
    uav.Id                                              AS UserApplicationVersionId,
    uav.VersionIndex,
    uav.IsDraft,
    uav.Name,
    uav.Price,
    uav.Description,
    uav.RepositoryUrl,
    uav.CreatedAt,
    pres.FileId                                         AS DefaultPresentationFileId,
    pres.FileCategory                                   AS DefaultPresentationFileCategory,
    pres.ContentType                                    AS DefaultPresentationContentType,
    thumb.FileId                                        AS DefaultPresentationThumbnailFileId
FROM dbo.UserApplication ua WITH (NOLOCK)
JOIN dbo.UserApplicationVersion uav WITH (NOLOCK) ON uav.UserApplicationId = ua.Id
OUTER APPLY (
    SELECT TOP 1 uavf.FileId, uavf.FileCategory, f.ContentType
    FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
    JOIN dbo.[File] f WITH (NOLOCK) ON f.Id = uavf.FileId
    WHERE uavf.UserApplicationVersionId = uav.Id
      AND uavf.FileCategory IN (2, 3)
    ORDER BY uavf.OrderIndex ASC
) pres
OUTER APPLY (
    SELECT TOP 1 uavf.FileId
    FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
    WHERE uavf.UserApplicationVersionId = uav.Id
      AND uavf.FileCategory = 4
) thumb
WHERE ua.OwnerUserId = @OwnerUserId
  AND ua.Id = @UserApplicationId
  AND uav.Id = @UserApplicationVersionId;";

            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
            cmd.Parameters.Add("@UserApplicationId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
            cmd.Parameters.Add("@UserApplicationVersionId", SqlDbType.UniqueIdentifier).Value = userApplicationVersionId;

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            var fileId = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationFileId"))
                ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DefaultPresentationFileId"));
            var fileCategory = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationFileCategory"))
                ? 0 : reader.GetInt32(reader.GetOrdinal("DefaultPresentationFileCategory"));
            var contentType = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationContentType"))
                ? "" : reader.GetString(reader.GetOrdinal("DefaultPresentationContentType"));
            var thumbId = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationThumbnailFileId"))
                ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DefaultPresentationThumbnailFileId"));

            var technologies = new List<string>();
            if (_cache.TryGetValue(TechCachePrefix + userApplicationVersionId, out List<string>? cached) && cached != null)
                technologies = cached;

            return new UserApplicationCardDto
            {
                UserApplicationId = reader.GetGuid(reader.GetOrdinal("UserApplicationId")),
                UserApplicationVersionId = userApplicationVersionId,
                VersionIndex = reader.GetInt32(reader.GetOrdinal("VersionIndex")),
                IsDraft = reader.GetBoolean(reader.GetOrdinal("IsDraft")),
                Name = reader.GetString(reader.GetOrdinal("Name")),
                Price = reader.IsDBNull(reader.GetOrdinal("Price")) ? null : reader.GetDecimal(reader.GetOrdinal("Price")),
                Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
                RepositoryUrl = reader.IsDBNull(reader.GetOrdinal("RepositoryUrl")) ? null : reader.GetString(reader.GetOrdinal("RepositoryUrl")),
                CreatedAt = reader.GetDateTimeOffset(reader.GetOrdinal("CreatedAt")),
                DefaultPresentationFileId = fileId,
                DefaultPresentationFileCategory = fileCategory,
                DefaultPresentationContentType = contentType,
                DefaultPresentationUrl = fileId == Guid.Empty ? "" : $"/api/user-application/get-user-application-file/{fileId}",
                DefaultPresentationThumbnailUrl = thumbId == Guid.Empty ? "" : $"/api/user-application/get-user-application-file/{thumbId}",
                IsVideo = fileCategory == (int)UserApplicationFileCategory.Video,
                Technologies = technologies,
            };
        }

        public async Task<List<UserApplicationCardDto>> GetAllUserApplicationCardsAsync(Guid ownerUserId)
        {
            var results = new List<UserApplicationCardDto>();
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string sql = @"
SELECT
    ua.Id                                               AS UserApplicationId,
    uav.Id                                              AS UserApplicationVersionId,
    uav.VersionIndex, uav.IsDraft, uav.Name, uav.Price,
    uav.Description, uav.RepositoryUrl, uav.CreatedAt,
    pres.FileId AS DefaultPresentationFileId,
    pres.FileCategory AS DefaultPresentationFileCategory,
    pres.ContentType AS DefaultPresentationContentType,
    thumb.FileId AS DefaultPresentationThumbnailFileId
FROM dbo.UserApplication ua WITH (NOLOCK)
CROSS APPLY (
    SELECT TOP 1 * FROM dbo.UserApplicationVersion v WITH (NOLOCK)
    WHERE v.UserApplicationId = ua.Id ORDER BY v.VersionIndex DESC
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
WHERE ua.OwnerUserId = @OwnerUserId
ORDER BY uav.CreatedAt DESC;";

            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                results.Add(ReadCardFromReader(reader));

            return results;
        }

        public async Task<List<UserApplicationDetailsDto>> GetAllUserApplicationDetailsAsync(Guid ownerUserId)
        {
            var results = new List<UserApplicationDetailsDto>();
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string sql = @"
SELECT ua.Id AS UserApplicationId, uav.Id AS UserApplicationVersionId,
       uav.VersionIndex, uav.IsDraft, uav.Name, uav.Price,
       uav.Description, uav.RepositoryUrl, uav.CreatedAt
FROM dbo.UserApplication ua WITH (NOLOCK)
CROSS APPLY (
    SELECT TOP 1 * FROM dbo.UserApplicationVersion v WITH (NOLOCK)
    WHERE v.UserApplicationId = ua.Id ORDER BY v.VersionIndex DESC
) uav
WHERE ua.OwnerUserId = @OwnerUserId
ORDER BY uav.CreatedAt DESC;";

            await using (var cmd = new SqlCommand(sql, connection))
            {
                cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    results.Add(new UserApplicationDetailsDto
                    {
                        UserApplicationId = reader.GetGuid(reader.GetOrdinal("UserApplicationId")),
                        UserApplicationVersionId = reader.GetGuid(reader.GetOrdinal("UserApplicationVersionId")),
                        VersionIndex = reader.GetInt32(reader.GetOrdinal("VersionIndex")),
                        IsDraft = reader.GetBoolean(reader.GetOrdinal("IsDraft")),
                        Name = reader.GetString(reader.GetOrdinal("Name")),
                        Price = reader.IsDBNull(reader.GetOrdinal("Price")) ? null : reader.GetDecimal(reader.GetOrdinal("Price")),
                        Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
                        RepositoryUrl = reader.IsDBNull(reader.GetOrdinal("RepositoryUrl")) ? null : reader.GetString(reader.GetOrdinal("RepositoryUrl")),
                        CreatedAt = reader.GetDateTimeOffset(reader.GetOrdinal("CreatedAt")),
                        Technologies = new List<string>()
                    });
                }
            }

            foreach (var item in results)
            {
                item.Files = await GetFilesForVersionAsync(connection, item.UserApplicationVersionId);
                item.DefaultPresentationFileId = ResolveDefaultPresentationFileId(item.Files);
                item.Technologies = await GetTechnologiesForVersionCachedAsync(connection, item.UserApplicationVersionId);
                await PopulateZipFileInfoAsync(connection, item);
            }

            return results;
        }

        public async Task<UserApplicationDetailsDto?> GetUserApplicationDetailsAsync(Guid ownerUserId, Guid userApplicationId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string sql = @"
SELECT TOP 1 ua.Id AS UserApplicationId, uav.Id AS UserApplicationVersionId,
       uav.VersionIndex, uav.IsDraft, uav.Name, uav.Price,
       uav.Description, uav.RepositoryUrl, uav.CreatedAt
FROM dbo.UserApplication ua WITH (NOLOCK)
JOIN dbo.UserApplicationVersion uav WITH (NOLOCK) ON uav.UserApplicationId = ua.Id
WHERE ua.OwnerUserId = @OwnerUserId AND ua.Id = @UserApplicationId
ORDER BY uav.VersionIndex DESC;";

            UserApplicationDetailsDto? dto = null;
            await using (var cmd = new SqlCommand(sql, connection))
            {
                cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
                cmd.Parameters.Add("@UserApplicationId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync()) return null;
                dto = new UserApplicationDetailsDto
                {
                    UserApplicationId = reader.GetGuid(reader.GetOrdinal("UserApplicationId")),
                    UserApplicationVersionId = reader.GetGuid(reader.GetOrdinal("UserApplicationVersionId")),
                    VersionIndex = reader.GetInt32(reader.GetOrdinal("VersionIndex")),
                    IsDraft = reader.GetBoolean(reader.GetOrdinal("IsDraft")),
                    Name = reader.GetString(reader.GetOrdinal("Name")),
                    Price = reader.IsDBNull(reader.GetOrdinal("Price")) ? null : reader.GetDecimal(reader.GetOrdinal("Price")),
                    Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
                    RepositoryUrl = reader.IsDBNull(reader.GetOrdinal("RepositoryUrl")) ? null : reader.GetString(reader.GetOrdinal("RepositoryUrl")),
                    CreatedAt = reader.GetDateTimeOffset(reader.GetOrdinal("CreatedAt")),
                    Technologies = new List<string>()
                };
            }

            dto!.Files = await GetFilesForVersionAsync(connection, dto.UserApplicationVersionId);
            dto.DefaultPresentationFileId = ResolveDefaultPresentationFileId(dto.Files);
            dto.Technologies = await GetTechnologiesForVersionCachedAsync(connection, dto.UserApplicationVersionId);
            await PopulateZipFileInfoAsync(connection, dto);
            return dto;
        }

        public async Task<List<string>> GetTechnologiesForVersionAsync(Guid ownerUserId, Guid userApplicationVersionId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string ownsSql = @"
SELECT TOP 1 1 FROM dbo.UserApplicationVersion uav
JOIN dbo.UserApplication ua ON ua.Id = uav.UserApplicationId
WHERE uav.Id = @VersionId AND ua.OwnerUserId = @OwnerUserId;";

            await using (var ownsCmd = new SqlCommand(ownsSql, connection))
            {
                ownsCmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = userApplicationVersionId;
                ownsCmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
                if (await ownsCmd.ExecuteScalarAsync() == null) return new List<string>();
            }

            return await GetTechnologiesForVersionCachedAsync(connection, userApplicationVersionId);
        }

        public async Task<Dictionary<string, List<string>>> GetBulkTechnologiesAsync(Guid ownerUserId, List<Guid> versionIds)
        {
            var result = new Dictionary<string, List<string>>();
            if (versionIds == null || versionIds.Count == 0) return result;

            var ownedVersionIds = await GetOwnedVersionIdsAsync(ownerUserId, versionIds);
            if (ownedVersionIds.Count == 0) return result;

            var uncached = new List<Guid>();
            foreach (var vid in ownedVersionIds)
            {
                if (_cache.TryGetValue(TechCachePrefix + vid, out List<string>? hit) && hit != null)
                    result[vid.ToString()] = hit;
                else
                    uncached.Add(vid);
            }

            if (uncached.Count == 0) return result;

            var semaphore = new SemaphoreSlim(6, 6);
            var tasks = uncached.Select(async vid =>
            {
                await semaphore.WaitAsync();
                try
                {
                    await using var conn = new SqlConnection(_connectionString);
                    await conn.OpenAsync();
                    var techs = await GetTechsFromZipFastAsync(conn, vid);
                    _cache.Set(TechCachePrefix + vid, techs, new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(6) });
                    return (vid, techs);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Bulk tech load failed for version {vid}: {ex.Message}");
                    return (vid, new List<string>());
                }
                finally { semaphore.Release(); }
            });

            foreach (var (vid, techs) in await Task.WhenAll(tasks))
                result[vid.ToString()] = techs;

            return result;
        }

        public async Task<List<UserApplicationCardDto>> SearchUserApplicationCardsAsync(
            Guid ownerUserId, string? query, string? sort)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var orderBy = sort?.ToUpperInvariant() switch
            {
                "A-Z" => "uav.Name ASC",
                "Z-A" => "uav.Name DESC",
                _ => "uav.CreatedAt DESC",
            };
            var hasQuery = !string.IsNullOrWhiteSpace(query);

            var sql = $@"
SELECT ua.Id AS UserApplicationId, uav.Id AS UserApplicationVersionId,
    uav.VersionIndex, uav.IsDraft, uav.Name, uav.Price,
    uav.Description, uav.RepositoryUrl, uav.CreatedAt,
    pres.FileId AS DefaultPresentationFileId,
    pres.FileCategory AS DefaultPresentationFileCategory,
    pres.ContentType AS DefaultPresentationContentType,
    thumb.FileId AS DefaultPresentationThumbnailFileId
FROM dbo.UserApplication ua WITH (NOLOCK)
CROSS APPLY (
    SELECT TOP 1 * FROM dbo.UserApplicationVersion v WITH (NOLOCK)
    WHERE v.UserApplicationId = ua.Id ORDER BY v.VersionIndex DESC
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
WHERE ua.OwnerUserId = @OwnerUserId
{(hasQuery ? "AND (uav.Name LIKE @Query OR uav.Description LIKE @Query OR uav.RepositoryUrl LIKE @Query)" : "")}
ORDER BY {orderBy};";

            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
            if (hasQuery) cmd.Parameters.Add("@Query", SqlDbType.NVarChar, 2100).Value = $"%{query}%";

            var dbMatches = new List<UserApplicationCardDto>();
            var allVersionIds = new List<Guid>();

            await using (var reader = await cmd.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync())
                {
                    var card = ReadCardFromReader(reader);
                    dbMatches.Add(card);
                    allVersionIds.Add(card.UserApplicationVersionId);
                }
            }

            if (allVersionIds.Count > 0)
            {
                var techMap = await GetBulkTechnologiesAsync(ownerUserId, allVersionIds);
                foreach (var card in dbMatches)
                    if (techMap.TryGetValue(card.UserApplicationVersionId.ToString(), out var techs))
                        card.Technologies = techs;
            }

            if (hasQuery)
            {
                var q = query!.ToLowerInvariant();
                var matchedIds = new HashSet<Guid>(dbMatches.Select(c => c.UserApplicationId));

                var allCards = await GetAllUserApplicationCardsAsync(ownerUserId);
                var candidates = allCards.Where(c => !matchedIds.Contains(c.UserApplicationId)).ToList();

                if (candidates.Count > 0)
                {
                    var candidateVersionIds = candidates.Select(c => c.UserApplicationVersionId).ToList();
                    var candidateTechMap = await GetBulkTechnologiesAsync(ownerUserId, candidateVersionIds);

                    foreach (var card in candidates)
                    {
                        if (candidateTechMap.TryGetValue(card.UserApplicationVersionId.ToString(), out var techs))
                            card.Technologies = techs;
                        if (card.Technologies.Any(t => t.ToLowerInvariant().Contains(q)))
                            dbMatches.Add(card);
                    }

                    dbMatches = sort?.ToUpperInvariant() switch
                    {
                        "A-Z" => dbMatches.OrderBy(c => c.Name ?? "").ToList(),
                        "Z-A" => dbMatches.OrderByDescending(c => c.Name ?? "").ToList(),
                        _ => dbMatches.OrderByDescending(c => c.CreatedAt).ToList(),
                    };
                }
            }

            return dbMatches;
        }

        private async Task<List<Guid>> GetOwnedVersionIdsAsync(Guid ownerUserId, List<Guid> versionIds)
        {
            if (versionIds.Count == 0) return new List<Guid>();
            var paramNames = versionIds.Select((_, i) => $"@v{i}").ToList();
            var inClause = string.Join(", ", paramNames);
            var sql = $@"
SELECT uav.Id FROM dbo.UserApplicationVersion uav
JOIN dbo.UserApplication ua ON ua.Id = uav.UserApplicationId
WHERE ua.OwnerUserId = @OwnerUserId AND uav.Id IN ({inClause});";
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
            for (int i = 0; i < versionIds.Count; i++)
                cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
            var owned = new List<Guid>();
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync()) owned.Add(reader.GetGuid(0));
            return owned;
        }

        private async Task<Dictionary<Guid, Guid>> GetZipFileIdsForVersionsAsync(List<Guid> versionIds)
        {
            var result = new Dictionary<Guid, Guid>();
            if (versionIds.Count == 0) return result;
            var paramNames = versionIds.Select((_, i) => $"@v{i}").ToList();
            var inClause = string.Join(", ", paramNames);
            var sql = $@"
SELECT uavf.UserApplicationVersionId, MIN(uavf.FileId) AS ZipFileId
FROM dbo.UserApplicationVersionFile uavf
WHERE uavf.UserApplicationVersionId IN ({inClause}) AND uavf.FileCategory = @ZipCategory
GROUP BY uavf.UserApplicationVersionId;";
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@ZipCategory", SqlDbType.Int).Value = (int)UserApplicationFileCategory.Zip;
            for (int i = 0; i < versionIds.Count; i++)
                cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync()) result[reader.GetGuid(0)] = reader.GetGuid(1);
            return result;
        }

        private async Task PopulateZipFileInfoAsync(SqlConnection connection, UserApplicationDetailsDto dto)
        {
            const string sql = @"
SELECT TOP 1 uavf.FileId FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
WHERE uavf.UserApplicationVersionId = @VersionId AND uavf.FileCategory = @ZipCat
ORDER BY uavf.OrderIndex;";
            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = dto.UserApplicationVersionId;
            cmd.Parameters.Add("@ZipCat", SqlDbType.Int).Value = (int)UserApplicationFileCategory.Zip;
            var obj = await cmd.ExecuteScalarAsync();
            if (obj != null && obj != DBNull.Value)
            {
                dto.ZipFileId = (Guid)obj;
                var safeName = string.IsNullOrWhiteSpace(dto.Name) ? "application" : dto.Name.Trim();
                dto.ZipFileName = safeName + ".zip";
            }
        }

        private static Guid ResolveDefaultPresentationFileId(List<UserApplicationFileDto> files)
        {
            var firstMedia = files
                .Where(f => f.FileCategory == (int)UserApplicationFileCategory.Image ||
                            f.FileCategory == (int)UserApplicationFileCategory.Video)
                .OrderBy(f => f.OrderIndex)
                .FirstOrDefault();
            return firstMedia?.FileId ?? Guid.Empty;
        }

        private static UserApplicationCardDto ReadCardFromReader(SqlDataReader reader)
        {
            var fileId = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationFileId"))
                ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DefaultPresentationFileId"));
            var fileCategory = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationFileCategory"))
                ? 0 : reader.GetInt32(reader.GetOrdinal("DefaultPresentationFileCategory"));
            var contentType = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationContentType"))
                ? "" : reader.GetString(reader.GetOrdinal("DefaultPresentationContentType"));
            var thumbId = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationThumbnailFileId"))
                ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DefaultPresentationThumbnailFileId"));

            return new UserApplicationCardDto
            {
                UserApplicationId = reader.GetGuid(reader.GetOrdinal("UserApplicationId")),
                UserApplicationVersionId = reader.GetGuid(reader.GetOrdinal("UserApplicationVersionId")),
                VersionIndex = reader.GetInt32(reader.GetOrdinal("VersionIndex")),
                IsDraft = reader.GetBoolean(reader.GetOrdinal("IsDraft")),
                Name = reader.GetString(reader.GetOrdinal("Name")),
                Price = reader.IsDBNull(reader.GetOrdinal("Price")) ? null : reader.GetDecimal(reader.GetOrdinal("Price")),
                Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
                RepositoryUrl = reader.IsDBNull(reader.GetOrdinal("RepositoryUrl")) ? null : reader.GetString(reader.GetOrdinal("RepositoryUrl")),
                CreatedAt = reader.GetDateTimeOffset(reader.GetOrdinal("CreatedAt")),
                DefaultPresentationFileId = fileId,
                DefaultPresentationFileCategory = fileCategory,
                DefaultPresentationContentType = contentType,
                DefaultPresentationUrl = fileId == Guid.Empty ? "" : $"/api/user-application/get-user-application-file/{fileId}",
                DefaultPresentationThumbnailUrl = thumbId == Guid.Empty ? "" : $"/api/user-application/get-user-application-file/{thumbId}",
                IsVideo = fileCategory == (int)UserApplicationFileCategory.Video,
                Technologies = new List<string>(),
            };
        }
    }
}