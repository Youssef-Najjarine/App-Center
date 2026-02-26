using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;
using Oap.WebApp.DTOs.UserApplication;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;
using System.Data;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Diagnostics;

namespace Oap.WebApp.Services
{
    public class UserApplicationService : IUserApplication
    {
        private readonly string _connectionString;
        private readonly IMemoryCache _cache;
        private readonly IServiceScopeFactory _scopeFactory;
        private const string AppMetadataPath = "oap.app.json";
        private const string TechCachePrefix = "ua_tech_v_";
        private const int ThumbnailCategory = 4;

        private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png", "image/webp"
        };
        private static readonly HashSet<string> AllowedVideoTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "video/mp4", "video/webm", "video/quicktime"
        };

        public UserApplicationService(IConfiguration configuration, IMemoryCache cache, IServiceScopeFactory scopeFactory)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
            _cache = cache;
            _scopeFactory = scopeFactory;
        }

        // ── Thumbnail generation ────────────────────────────────────────────────

        private async Task<byte[]?> ExtractFirstFrameAsJpgAsync(byte[] videoBytes)
        {
            if (videoBytes == null || videoBytes.Length == 0) return null;
            var tempInput = Path.GetTempFileName();
            var tempOutput = Path.GetTempFileName() + ".jpg";
            try
            {
                await File.WriteAllBytesAsync(tempInput, videoBytes);
                using var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "ffmpeg",
                        Arguments = $"-i \"{tempInput}\" -ss 00:00:01 -vframes 1 -vf scale=640:-1 -y \"{tempOutput}\"",
                        UseShellExecute = false,
                        RedirectStandardError = true,
                        CreateNoWindow = true
                    }
                };
                process.Start();
                string error = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();
                if (process.ExitCode == 0 && File.Exists(tempOutput))
                    return await File.ReadAllBytesAsync(tempOutput);
                Console.Error.WriteLine($"FFmpeg thumbnail error: {error}");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Thumbnail generation failed: {ex}");
            }
            finally
            {
                try
                {
                    if (File.Exists(tempInput)) File.Delete(tempInput);
                    if (File.Exists(tempOutput)) File.Delete(tempOutput);
                }
                catch { }
            }
            return null;
        }

        // ── File insert helpers ─────────────────────────────────────────────────

        private async Task<Guid> InsertThumbnailFileAsync(SqlConnection connection, SqlTransaction tx, byte[] bytes)
        {
            const string sql = @"
INSERT INTO dbo.[File] (ContentType, FileContents)
OUTPUT INSERTED.Id
VALUES (@ContentType, @FileContents);";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@ContentType", SqlDbType.VarChar, 50).Value = "image/jpeg";
            cmd.Parameters.Add("@FileContents", SqlDbType.VarBinary, -1).Value = bytes;
            return (Guid)(await cmd.ExecuteScalarAsync())!;
        }

        private async Task<Guid> InsertFileFromBytesAsync(SqlConnection connection, SqlTransaction tx, byte[] bytes, string contentType)
        {
            const string sql = @"
INSERT INTO dbo.[File] (ContentType, FileContents)
OUTPUT INSERTED.Id
VALUES (@ContentType, @FileContents);";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@ContentType", SqlDbType.VarChar, 50).Value = contentType;
            cmd.Parameters.Add("@FileContents", SqlDbType.VarBinary, -1).Value = bytes;
            return (Guid)(await cmd.ExecuteScalarAsync())!;
        }

        private async Task<Guid> InsertFileAsync(SqlConnection connection, SqlTransaction tx, IFormFile file)
        {
            var detected = DetectActualContentType(file);
            if (string.Equals(detected, "image/gif", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("GIF files are not allowed.");
            var isAllowed = IsAllowedImageDetected(detected) || IsAllowedVideoDetected(detected);
            if (!isAllowed) throw new InvalidOperationException("Invalid media type");
            await using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var bytes = ms.ToArray();
            const string sql = @"
INSERT INTO dbo.[File] (ContentType, FileContents)
OUTPUT INSERTED.Id
VALUES (@ContentType, @FileContents);";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@ContentType", SqlDbType.VarChar, 50).Value = detected;
            cmd.Parameters.Add("@FileContents", SqlDbType.VarBinary, -1).Value = bytes;
            return (Guid)(await cmd.ExecuteScalarAsync())!;
        }

        private async Task InsertVersionFileLinkAsync(
            SqlConnection connection, SqlTransaction tx,
            Guid versionId, Guid fileId, int fileCategory, int orderIndex)
        {
            const string sql = @"
INSERT INTO dbo.UserApplicationVersionFile
(UserApplicationVersionId, FileId, FileCategory, OrderIndex)
VALUES
(@VersionId, @FileId, @FileCategory, @OrderIndex);";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
            cmd.Parameters.Add("@FileCategory", SqlDbType.Int).Value = fileCategory;
            cmd.Parameters.Add("@OrderIndex", SqlDbType.Int).Value = orderIndex;
            await cmd.ExecuteNonQueryAsync();
        }

        // ── Create ──────────────────────────────────────────────────────────────

        public async Task<CreateUserApplicationResult> CreateUserApplicationAsync(
            Guid ownerUserId,
            CreateUserApplicationFormRequest request)
        {
            if (ownerUserId == Guid.Empty)
                return new CreateUserApplicationResult { Success = false, Error = "Invalid user." };
            if (request == null)
                return new CreateUserApplicationResult { Success = false, Error = "Invalid request." };
            if (request.ZipFile == null || request.ZipFile.Length == 0)
                return new CreateUserApplicationResult { Success = false, Error = "Zip file is required." };

            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            await using var tx = connection.BeginTransaction();
            try
            {
                var userApplicationId = await InsertUserApplicationAsync(connection, tx, ownerUserId);
                const int versionIndex = 1;
                var versionId = await InsertUserApplicationVersionAsync(
                    connection, tx,
                    userApplicationId,
                    versionIndex,
                    request.IsDraft,
                    request.Name.Trim(),
                    request.Price,
                    request.Description?.Trim(),
                    string.IsNullOrWhiteSpace(request.RepositoryUrl) ? null : request.RepositoryUrl.Trim()
                );

                await UpsertTechnologyTagsAsync(connection, tx, request.Technologies);

                var zipFileId = await InsertZipFileWithMetadataAsync(connection, tx, request.ZipFile, request.Technologies);
                await InsertVersionFileLinkAsync(connection, tx, versionId, zipFileId, (int)UserApplicationFileCategory.Zip, 0);

                var mediaIncoming = request.Media ?? new List<IFormFile>();
                var media = mediaIncoming.Where(f => f != null && f.Length > 0).ToList();

                var imageCount = 0;
                var videoCount = 0;
                foreach (var f in media)
                {
                    var detected = DetectActualContentType(f);
                    if (string.Equals(detected, "image/gif", StringComparison.OrdinalIgnoreCase))
                        throw new InvalidOperationException("GIF files are not allowed.");
                    if (IsAllowedImageDetected(detected)) imageCount++;
                    else if (IsAllowedVideoDetected(detected)) videoCount++;
                    else throw new InvalidOperationException("Invalid media type");
                }

                if (imageCount > 5) throw new InvalidOperationException("Too many images (max 5).");
                if (videoCount > 1) throw new InvalidOperationException("Too many videos (max 1).");

                var presentationIndex = request.PresentationIndex;
                if (media.Count == 0) presentationIndex = -1;
                else if (presentationIndex < 0 || presentationIndex >= media.Count) presentationIndex = 0;

                if (presentationIndex >= 0 && media.Count > 0)
                {
                    var selected = media[presentationIndex];
                    media.RemoveAt(presentationIndex);
                    media.Insert(0, selected);
                }

                byte[]? videoBytes = null;
                Guid videoVersionId = versionId;

                var orderIndex = 1;
                foreach (var f in media)
                {
                    var detected = DetectActualContentType(f);
                    var category = IsAllowedImageDetected(detected)
                        ? (int)UserApplicationFileCategory.Image
                        : (int)UserApplicationFileCategory.Video;

                    byte[]? fileBytes = null;
                    if (category == (int)UserApplicationFileCategory.Video)
                    {
                        using var ms = new MemoryStream();
                        await f.CopyToAsync(ms);
                        fileBytes = ms.ToArray();
                        videoBytes = fileBytes;
                    }

                    var fileId = fileBytes != null
                        ? await InsertFileFromBytesAsync(connection, tx, fileBytes, detected)
                        : await InsertFileAsync(connection, tx, f);

                    await InsertVersionFileLinkAsync(connection, tx, versionId, fileId, category, orderIndex);
                    orderIndex++;
                }

                await tx.CommitAsync();

                // Warm the tech cache immediately so the next bulk-tech request is instant.
                var techList = request.Technologies ?? new List<string>();
                var normalizedTechs = techList
                    .Select(t => (t ?? "").Trim())
                    .Where(t => !string.IsNullOrWhiteSpace(t))
                    .ToList();
                _cache.Set(
                    TechCachePrefix + versionId,
                    normalizedTechs,
                    new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(6) }
                );

                if (videoBytes != null)
                {
                    var capturedVideoBytes = videoBytes;
                    var capturedVersionId = videoVersionId;
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            var thumbBytes = await ExtractFirstFrameAsJpgAsync(capturedVideoBytes);
                            if (thumbBytes == null) return;

                            await using var bgConnection = new SqlConnection(_connectionString);
                            await bgConnection.OpenAsync();
                            await using var bgTx = bgConnection.BeginTransaction();
                            try
                            {
                                var thumbId = await InsertThumbnailFileAsync(bgConnection, bgTx, thumbBytes);
                                await InsertVersionFileLinkAsync(bgConnection, bgTx, capturedVersionId, thumbId, ThumbnailCategory, 0);
                                await bgTx.CommitAsync();
                            }
                            catch (Exception ex)
                            {
                                await bgTx.RollbackAsync();
                                Console.Error.WriteLine($"Background thumbnail commit failed: {ex}");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.Error.WriteLine($"Background thumbnail generation failed: {ex}");
                        }
                    });
                }

                return new CreateUserApplicationResult
                {
                    Success = true,
                    UserApplicationId = userApplicationId,
                    UserApplicationVersionId = versionId,
                };
            }
            catch (SqlException ex) when (IsUniqueViolation(ex))
            {
                await tx.RollbackAsync();
                Console.Error.WriteLine($"CreateUserApplicationAsync unique constraint violation: {ex}");
                return new CreateUserApplicationResult { Success = false, Error = "Duplicate data detected. Please try again." };
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                Console.Error.WriteLine($"CreateUserApplicationAsync failed: {ex}");
                return new CreateUserApplicationResult { Success = false, Error = "Server error while creating application." };
            }
        }

        // ── Cards ───────────────────────────────────────────────────────────────
        //
        // FAST PATH — returns in milliseconds. No ZIP reads. No tech loading.
        // Only lightweight text columns + file GUIDs are read.
        // Technologies arrive via the separate get-bulk-technologies endpoint which
        // the frontend fires in parallel immediately after cards render.

        public async Task<List<UserApplicationCardDto>> GetAllUserApplicationCardsAsync(Guid ownerUserId)
        {
            var results = new List<UserApplicationCardDto>();

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
FROM dbo.UserApplication ua
CROSS APPLY (
    SELECT TOP 1 *
    FROM dbo.UserApplicationVersion v
    WHERE v.UserApplicationId = ua.Id
    ORDER BY v.VersionIndex DESC
) uav
OUTER APPLY (
    SELECT TOP 1 uavf.FileId, uavf.FileCategory, f.ContentType
    FROM dbo.UserApplicationVersionFile uavf
    JOIN dbo.[File] f ON f.Id = uavf.FileId
    WHERE uavf.UserApplicationVersionId = uav.Id
      AND uavf.FileCategory IN (2, 3)
    ORDER BY uavf.OrderIndex ASC
) pres
OUTER APPLY (
    SELECT TOP 1 uavf.FileId
    FROM dbo.UserApplicationVersionFile uavf
    WHERE uavf.UserApplicationVersionId = uav.Id
      AND uavf.FileCategory = 4
) thumb
WHERE ua.OwnerUserId = @OwnerUserId
ORDER BY uav.CreatedAt DESC;";

            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var fileId = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationFileId"))
                    ? Guid.Empty
                    : reader.GetGuid(reader.GetOrdinal("DefaultPresentationFileId"));
                var fileCategory = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationFileCategory"))
                    ? 0
                    : reader.GetInt32(reader.GetOrdinal("DefaultPresentationFileCategory"));
                var contentType = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationContentType"))
                    ? ""
                    : reader.GetString(reader.GetOrdinal("DefaultPresentationContentType"));
                var thumbId = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationThumbnailFileId"))
                    ? Guid.Empty
                    : reader.GetGuid(reader.GetOrdinal("DefaultPresentationThumbnailFileId"));

                var versionId = reader.GetGuid(reader.GetOrdinal("UserApplicationVersionId"));

                results.Add(new UserApplicationCardDto
                {
                    UserApplicationId = reader.GetGuid(reader.GetOrdinal("UserApplicationId")),
                    UserApplicationVersionId = versionId,
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
                });
            }

            return results;
        }

        // ── Bulk technologies — ONE request replaces N per-card requests ─────────
        //
        // Accepts all version IDs at once. Serves cache-hits immediately (no DB).
        // For misses: fetches all ZIP file IDs in ONE query, then reads ZIPs in
        // parallel (max 6 concurrent). Populates the cache so future calls are instant.
        //
        // Cold cache (first ever load): latency = max(individual ZIP read time)
        // Warm cache (any subsequent load): latency ≈ 0 ms

        public async Task<Dictionary<string, List<string>>> GetBulkTechnologiesAsync(
            Guid ownerUserId, List<Guid> versionIds)
        {
            var result = new Dictionary<string, List<string>>();
            if (versionIds == null || versionIds.Count == 0) return result;

            // Ownership check — one query for all IDs at once.
            var ownedVersionIds = await GetOwnedVersionIdsAsync(ownerUserId, versionIds);
            if (ownedVersionIds.Count == 0) return result;

            // Split into cache-hits vs misses.
            var uncached = new List<Guid>();
            foreach (var vid in ownedVersionIds)
            {
                var key = TechCachePrefix + vid;
                if (_cache.TryGetValue(key, out List<string>? hit) && hit != null)
                    result[vid.ToString()] = hit;
                else
                    uncached.Add(vid);
            }

            if (uncached.Count == 0) return result;

            // One query to get all ZIP file IDs for the uncached set.
            var zipFileIdMap = await GetZipFileIdsForVersionsAsync(uncached);

            // Parallel ZIP reads — max 6 concurrent.
            var semaphore = new SemaphoreSlim(6, 6);
            var tasks = uncached.Select(async vid =>
            {
                await semaphore.WaitAsync();
                try
                {
                    if (!zipFileIdMap.TryGetValue(vid, out var zipFileId))
                        return (vid, new List<string>());

                    var techs = await ReadTechnologiesFromZipInDbAsync(zipFileId);
                    _cache.Set(
                        TechCachePrefix + vid,
                        techs,
                        new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(6) }
                    );
                    return (vid, techs);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Bulk tech load failed for version {vid}: {ex.Message}");
                    return (vid, new List<string>());
                }
                finally { semaphore.Release(); }
            });

            var loaded = await Task.WhenAll(tasks);
            foreach (var (vid, techs) in loaded)
                result[vid.ToString()] = techs;

            return result;
        }

        private async Task<List<Guid>> GetOwnedVersionIdsAsync(Guid ownerUserId, List<Guid> versionIds)
        {
            if (versionIds.Count == 0) return new List<Guid>();
            var paramNames = versionIds.Select((_, i) => $"@v{i}").ToList();
            var inClause = string.Join(", ", paramNames);
            var sql = $@"
SELECT uav.Id
FROM dbo.UserApplicationVersion uav
JOIN dbo.UserApplication ua ON ua.Id = uav.UserApplicationId
WHERE ua.OwnerUserId = @OwnerUserId
  AND uav.Id IN ({inClause});";
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
            for (int i = 0; i < versionIds.Count; i++)
                cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
            var owned = new List<Guid>();
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                owned.Add(reader.GetGuid(0));
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
WHERE uavf.UserApplicationVersionId IN ({inClause})
  AND uavf.FileCategory = @ZipCategory
GROUP BY uavf.UserApplicationVersionId;";
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@ZipCategory", SqlDbType.Int).Value = (int)UserApplicationFileCategory.Zip;
            for (int i = 0; i < versionIds.Count; i++)
                cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                result[reader.GetGuid(0)] = reader.GetGuid(1);
            return result;
        }

        private async Task<List<string>> ReadTechnologiesFromZipInDbAsync(Guid zipFileId)
        {
            const string sql = @"SELECT TOP 1 FileContents FROM dbo.[File] WHERE Id = @FileId;";
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = zipFileId;
            var obj = await cmd.ExecuteScalarAsync();
            if (obj == null || obj == DBNull.Value) return new List<string>();
            try { return ReadTechnologiesFromZip((byte[])obj); }
            catch { return new List<string>(); }
        }

        // ── Details ─────────────────────────────────────────────────────────────

        public async Task<List<UserApplicationDetailsDto>> GetAllUserApplicationDetailsAsync(Guid ownerUserId)
        {
            var results = new List<UserApplicationDetailsDto>();
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string sql = @"
SELECT ua.Id AS UserApplicationId,
       uav.Id AS UserApplicationVersionId,
       uav.VersionIndex,
       uav.IsDraft,
       uav.Name,
       uav.Price,
       uav.Description,
       uav.RepositoryUrl,
       uav.CreatedAt
FROM dbo.UserApplication ua
CROSS APPLY (
    SELECT TOP 1 *
    FROM dbo.UserApplicationVersion v
    WHERE v.UserApplicationId = ua.Id
    ORDER BY v.VersionIndex DESC
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
            }

            return results;
        }

        public async Task<UserApplicationDetailsDto?> GetUserApplicationDetailsAsync(Guid ownerUserId, Guid userApplicationId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string sql = @"
SELECT TOP 1
       ua.Id AS UserApplicationId,
       uav.Id AS UserApplicationVersionId,
       uav.VersionIndex,
       uav.IsDraft,
       uav.Name,
       uav.Price,
       uav.Description,
       uav.RepositoryUrl,
       uav.CreatedAt
FROM dbo.UserApplication ua
JOIN dbo.UserApplicationVersion uav ON uav.UserApplicationId = ua.Id
WHERE ua.OwnerUserId = @OwnerUserId
  AND ua.Id = @UserApplicationId
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
            return dto;
        }

        public async Task<List<string>> GetTechnologiesForVersionAsync(Guid ownerUserId, Guid userApplicationVersionId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string ownsSql = @"
SELECT TOP 1 1
FROM dbo.UserApplicationVersion uav
JOIN dbo.UserApplication ua ON ua.Id = uav.UserApplicationId
WHERE uav.Id = @VersionId
  AND ua.OwnerUserId = @OwnerUserId;";

            await using (var ownsCmd = new SqlCommand(ownsSql, connection))
            {
                ownsCmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = userApplicationVersionId;
                ownsCmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
                var owns = await ownsCmd.ExecuteScalarAsync();
                if (owns == null) return new List<string>();
            }

            return await GetTechnologiesForVersionCachedAsync(connection, userApplicationVersionId);
        }

        public async Task<StoredFile?> GetFileIfOwnedByUserAsync(Guid ownerUserId, Guid fileId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string sql = @"
SELECT f.Id, f.ContentType, f.FileContents, f.CreatedAt
FROM dbo.[File] f
WHERE f.Id = @FileId
AND EXISTS (
    SELECT 1
    FROM dbo.UserApplicationVersionFile uavf
    JOIN dbo.UserApplicationVersion uav ON uav.Id = uavf.UserApplicationVersionId
    JOIN dbo.UserApplication ua ON ua.Id = uav.UserApplicationId
    WHERE uavf.FileId = f.Id
      AND ua.OwnerUserId = @OwnerUserId
);";
            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
            cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;
            return new StoredFile
            {
                Id = reader.GetGuid(reader.GetOrdinal("Id")),
                ContentType = reader.GetString(reader.GetOrdinal("ContentType")),
                FileContents = (byte[])reader["FileContents"],
                CreatedAt = reader.GetDateTimeOffset(reader.GetOrdinal("CreatedAt"))
            };
        }

        // ── Private helpers ─────────────────────────────────────────────────────

        private static bool IsUniqueViolation(SqlException ex) => ex.Number == 2627 || ex.Number == 2601;

        private static Guid ResolveDefaultPresentationFileId(List<UserApplicationFileDto> files)
        {
            var firstMedia = files
                .Where(f => f.FileCategory == (int)UserApplicationFileCategory.Image ||
                            f.FileCategory == (int)UserApplicationFileCategory.Video)
                .OrderBy(f => f.OrderIndex)
                .FirstOrDefault();
            return firstMedia?.FileId ?? Guid.Empty;
        }

        private async Task<Guid> InsertUserApplicationAsync(SqlConnection connection, SqlTransaction tx, Guid ownerUserId)
        {
            const string sql = @"
INSERT INTO dbo.UserApplication (OwnerUserId)
OUTPUT INSERTED.Id
VALUES (@OwnerUserId);";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
            return (Guid)(await cmd.ExecuteScalarAsync())!;
        }

        private async Task<Guid> InsertUserApplicationVersionAsync(
            SqlConnection connection, SqlTransaction tx,
            Guid userApplicationId, int versionIndex, bool isDraft,
            string name, decimal? price, string? description, string? repositoryUrl)
        {
            const string sql = @"
INSERT INTO dbo.UserApplicationVersion
(UserApplicationId, VersionIndex, IsDraft, Name, Price, Description, RepositoryUrl)
OUTPUT INSERTED.Id
VALUES
(@UserApplicationId, @VersionIndex, @IsDraft, @Name, @Price, @Description, @RepositoryUrl);";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@UserApplicationId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
            cmd.Parameters.Add("@VersionIndex", SqlDbType.Int).Value = versionIndex;
            cmd.Parameters.Add("@IsDraft", SqlDbType.Bit).Value = isDraft;
            cmd.Parameters.Add("@Name", SqlDbType.NVarChar, 255).Value = name;
            cmd.Parameters.Add("@Price", SqlDbType.Decimal).Value = (object?)price ?? DBNull.Value;
            cmd.Parameters.Add("@Description", SqlDbType.NVarChar).Value = (object?)description ?? DBNull.Value;
            cmd.Parameters.Add("@RepositoryUrl", SqlDbType.VarChar, 2048).Value = (object?)repositoryUrl ?? DBNull.Value;
            return (Guid)(await cmd.ExecuteScalarAsync())!;
        }

        private async Task<Guid> InsertZipFileWithMetadataAsync(SqlConnection connection, SqlTransaction tx, IFormFile zipFile, List<string> technologies)
        {
            byte[] originalBytes;
            await using (var ms = new MemoryStream())
            {
                await zipFile.CopyToAsync(ms);
                originalBytes = ms.ToArray();
            }
            var finalBytes = originalBytes;
            try { finalBytes = InjectOrUpdateZipMetadata(originalBytes, technologies); }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Zip metadata injection failed; storing original zip. Error: {ex}");
                finalBytes = originalBytes;
            }
            const string sql = @"
INSERT INTO dbo.[File] (ContentType, FileContents)
OUTPUT INSERTED.Id
VALUES (@ContentType, @FileContents);";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@ContentType", SqlDbType.VarChar, 50).Value =
                string.IsNullOrWhiteSpace(zipFile.ContentType) ? "application/zip" : zipFile.ContentType;
            cmd.Parameters.Add("@FileContents", SqlDbType.VarBinary, -1).Value = finalBytes;
            return (Guid)(await cmd.ExecuteScalarAsync())!;
        }

        private async Task UpsertTechnologyTagsAsync(SqlConnection connection, SqlTransaction tx, List<string> tags)
        {
            const string sql = @"
IF NOT EXISTS (SELECT 1 FROM dbo.TechnologyTag WHERE Name = @Name)
BEGIN
    INSERT INTO dbo.TechnologyTag (Name) VALUES (@Name);
END";
            foreach (var raw in (tags ?? new List<string>())
                         .Select(t => (t ?? "").Trim())
                         .Where(t => !string.IsNullOrWhiteSpace(t)))
            {
                await using var cmd = new SqlCommand(sql, connection, tx);
                cmd.Parameters.Add("@Name", SqlDbType.NVarChar, 100).Value = raw;
                await cmd.ExecuteNonQueryAsync();
            }
        }

        private async Task<List<UserApplicationFileDto>> GetFilesForVersionAsync(SqlConnection connection, Guid versionId)
        {
            var files = new List<UserApplicationFileDto>();
            const string sql = @"
SELECT uavf.FileId, uavf.FileCategory, uavf.OrderIndex, f.ContentType
FROM dbo.UserApplicationVersionFile uavf
JOIN dbo.[File] f ON f.Id = uavf.FileId
WHERE uavf.UserApplicationVersionId = @VersionId
ORDER BY uavf.OrderIndex;";
            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var fileId = reader.GetGuid(reader.GetOrdinal("FileId"));
                files.Add(new UserApplicationFileDto
                {
                    FileId = fileId,
                    FileCategory = reader.GetInt32(reader.GetOrdinal("FileCategory")),
                    OrderIndex = reader.GetInt32(reader.GetOrdinal("OrderIndex")),
                    ContentType = reader.GetString(reader.GetOrdinal("ContentType")),
                    Url = $"/api/user-application/get-user-application-file/{fileId}"
                });
            }
            return files;
        }

        private async Task<List<string>> GetTechnologiesForVersionCachedAsync(SqlConnection connection, Guid versionId)
        {
            var cacheKey = TechCachePrefix + versionId;
            if (_cache.TryGetValue(cacheKey, out List<string>? cached) && cached != null)
                return cached;
            var tech = await GetTechnologiesFromZipAsync(connection, versionId);
            _cache.Set(cacheKey, tech, new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(6) });
            return tech;
        }

        private async Task<List<string>> GetTechnologiesFromZipAsync(SqlConnection connection, Guid versionId)
        {
            const string zipFileIdSql = @"
SELECT TOP 1 uavf.FileId
FROM dbo.UserApplicationVersionFile uavf
WHERE uavf.UserApplicationVersionId = @VersionId
  AND uavf.FileCategory = @ZipCategory
ORDER BY uavf.OrderIndex;";

            Guid? zipFileId = null;
            await using (var cmd = new SqlCommand(zipFileIdSql, connection))
            {
                cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
                cmd.Parameters.Add("@ZipCategory", SqlDbType.Int).Value = (int)UserApplicationFileCategory.Zip;
                var obj = await cmd.ExecuteScalarAsync();
                if (obj == null || obj == DBNull.Value) return new List<string>();
                zipFileId = (Guid)obj;
            }

            const string zipBytesSql = @"SELECT TOP 1 FileContents FROM dbo.[File] WHERE Id = @FileId;";
            byte[]? zipBytes = null;
            await using (var cmd = new SqlCommand(zipBytesSql, connection))
            {
                cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = zipFileId!.Value;
                var obj = await cmd.ExecuteScalarAsync();
                if (obj == null || obj == DBNull.Value) return new List<string>();
                zipBytes = (byte[])obj;
            }

            try { return ReadTechnologiesFromZip(zipBytes!); }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Failed to read technologies from zip: {ex}");
                return new List<string>();
            }
        }

        private static byte[] InjectOrUpdateZipMetadata(byte[] zipBytes, List<string> technologies)
        {
            var cleaned = (technologies ?? new List<string>())
                .Select(t => (t ?? "").Trim())
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            var metadataObj = new { technologies = cleaned };
            var json = JsonSerializer.Serialize(metadataObj, new JsonSerializerOptions { WriteIndented = true });
            using var inputMs = new MemoryStream(zipBytes);
            using var outputMs = new MemoryStream();
            using (var inputZip = new ZipArchive(inputMs, ZipArchiveMode.Read, leaveOpen: true))
            using (var outputZip = new ZipArchive(outputMs, ZipArchiveMode.Create, leaveOpen: true))
            {
                foreach (var entry in inputZip.Entries)
                {
                    if (string.Equals(entry.FullName, AppMetadataPath, StringComparison.OrdinalIgnoreCase))
                        continue;
                    var newEntry = outputZip.CreateEntry(entry.FullName, CompressionLevel.Optimal);
                    if (entry.FullName.EndsWith("/")) continue;
                    using var entryIn = entry.Open();
                    using var entryOut = newEntry.Open();
                    entryIn.CopyTo(entryOut);
                }
                var metaEntry = outputZip.CreateEntry(AppMetadataPath, CompressionLevel.Optimal);
                using var metaStream = metaEntry.Open();
                var bytes = Encoding.UTF8.GetBytes(json);
                metaStream.Write(bytes, 0, bytes.Length);
            }
            return outputMs.ToArray();
        }

        private static List<string> ReadTechnologiesFromZip(byte[] zipBytes)
        {
            using var ms = new MemoryStream(zipBytes);
            using var zip = new ZipArchive(ms, ZipArchiveMode.Read, leaveOpen: false);
            var entry = zip.Entries.FirstOrDefault(e =>
                string.Equals(e.FullName, AppMetadataPath, StringComparison.OrdinalIgnoreCase));
            if (entry == null) return new List<string>();
            using var s = entry.Open();
            using var sr = new StreamReader(s, Encoding.UTF8);
            var json = sr.ReadToEnd();
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("technologies", out var techEl) || techEl.ValueKind != JsonValueKind.Array)
                return new List<string>();
            var list = new List<string>();
            foreach (var el in techEl.EnumerateArray())
            {
                if (el.ValueKind != JsonValueKind.String) continue;
                var v = (el.GetString() ?? "").Trim();
                if (!string.IsNullOrWhiteSpace(v)) list.Add(v);
            }
            return list;
        }

        private static bool IsAllowedImageDetected(string detectedContentType)
            => !string.IsNullOrWhiteSpace(detectedContentType) && AllowedImageTypes.Contains(detectedContentType);

        private static bool IsAllowedVideoDetected(string detectedContentType)
            => !string.IsNullOrWhiteSpace(detectedContentType) && AllowedVideoTypes.Contains(detectedContentType);

        private static string DetectActualContentType(IFormFile file)
        {
            try
            {
                using var s = file.OpenReadStream();
                Span<byte> header = stackalloc byte[64];
                var read = s.Read(header);
                if (read <= 0) return "";
                var h = header.Slice(0, read);
                if (h.Length >= 6)
                {
                    var sig = Encoding.ASCII.GetString(h.Slice(0, 6));
                    if (sig == "GIF87a" || sig == "GIF89a") return "image/gif";
                }
                if (h.Length >= 3 && h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF) return "image/jpeg";
                if (h.Length >= 8 &&
                    h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47 &&
                    h[4] == 0x0D && h[5] == 0x0A && h[6] == 0x1A && h[7] == 0x0A)
                    return "image/png";
                if (h.Length >= 12)
                {
                    var riff = Encoding.ASCII.GetString(h.Slice(0, 4));
                    var webp = Encoding.ASCII.GetString(h.Slice(8, 4));
                    if (riff == "RIFF" && webp == "WEBP") return "image/webp";
                }
                if (h.Length >= 4 && h[0] == 0x1A && h[1] == 0x45 && h[2] == 0xDF && h[3] == 0xA3)
                    return "video/webm";
                if (h.Length >= 12)
                {
                    var ftyp = Encoding.ASCII.GetString(h.Slice(4, 4));
                    if (ftyp == "ftyp")
                    {
                        var brand = Encoding.ASCII.GetString(h.Slice(8, 4));
                        if (brand == "qt  ") return "video/quicktime";
                        return "video/mp4";
                    }
                }
                return "";
            }
            catch { return ""; }
        }
    }
}