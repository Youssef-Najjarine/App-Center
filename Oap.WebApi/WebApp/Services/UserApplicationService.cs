using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;
using Oap.WebApp.DTOs.UserApplication;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;
using Oap.WebApp.Utilities;
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

        public UserApplicationService(IConfiguration configuration, IMemoryCache cache, IServiceScopeFactory scopeFactory)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
            _cache = cache;
            _scopeFactory = scopeFactory;
        }

        private async Task<byte[]?> ExtractFirstFrameAsJpgAsync(string inputPath)
        {
            if (string.IsNullOrWhiteSpace(inputPath) || !File.Exists(inputPath)) return null;
            var tempOutput = Path.GetTempFileName() + ".jpg";
            try
            {
                using var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "ffmpeg",
                        Arguments = $"-i \"{inputPath}\" -ss 00:00:01 -vframes 1 -vf scale=640:-1 -y \"{tempOutput}\"",
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
                try { if (File.Exists(tempOutput)) File.Delete(tempOutput); } catch { }
            }
            return null;
        }

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

        private async Task<Guid> InsertFileFromTempPathAsync(
            SqlConnection connection, SqlTransaction tx, string tempPath, string contentType)
        {
            const string sql = @"
INSERT INTO dbo.[File] (ContentType, FileContents)
OUTPUT INSERTED.Id
VALUES (@ContentType, @FileContents);";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@ContentType", SqlDbType.VarChar, 50).Value = contentType;

            await using var fs = new FileStream(tempPath, FileMode.Open, FileAccess.Read,
                FileShare.Read, 81920, useAsync: true);
            cmd.Parameters.Add("@FileContents", SqlDbType.VarBinary, -1).Value = fs;

            return (Guid)(await cmd.ExecuteScalarAsync())!;
        }

        private async Task<Guid> InsertFileAsync(SqlConnection connection, SqlTransaction tx, IFormFile file)
        {
            var detected = MediaTypeDetector.DetectContentType(file);
            if (string.Equals(detected, "image/gif", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("GIF files are not allowed.");
            var isAllowed = MediaTypeDetector.IsAllowedImage(detected) || MediaTypeDetector.IsAllowedVideo(detected);
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

        // ─────────────────────────────────────────────────────────────────────
        //  CREATE
        // ─────────────────────────────────────────────────────────────────────

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

            string? zipTempPath = null;
            string? videoTempPath = null;

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

                (zipTempPath, var zipFileId) = await InsertZipFileWithMetadataAsync(
                    connection, tx, request.ZipFile, request.Technologies);
                await InsertVersionFileLinkAsync(connection, tx, versionId, zipFileId, (int)UserApplicationFileCategory.Zip, 0);

                var mediaIncoming = request.Media ?? new List<IFormFile>();
                var media = mediaIncoming.Where(f => f != null && f.Length > 0).ToList();

                var imageCount = 0;
                var videoCount = 0;
                foreach (var f in media)
                {
                    var detected = MediaTypeDetector.DetectContentType(f);
                    if (string.Equals(detected, "image/gif", StringComparison.OrdinalIgnoreCase))
                        throw new InvalidOperationException("GIF files are not allowed.");
                    if (MediaTypeDetector.IsAllowedImage(detected)) imageCount++;
                    else if (MediaTypeDetector.IsAllowedVideo(detected)) videoCount++;
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

                var orderIndex = 1;
                foreach (var f in media)
                {
                    var detected = MediaTypeDetector.DetectContentType(f);
                    var isVideo = MediaTypeDetector.IsAllowedVideo(detected);
                    var category = isVideo
                        ? (int)UserApplicationFileCategory.Video
                        : (int)UserApplicationFileCategory.Image;

                    Guid fileId;

                    if (isVideo)
                    {
                        videoTempPath = Path.GetTempFileName();
                        await using (var fs = new FileStream(videoTempPath, FileMode.Create,
                            FileAccess.Write, FileShare.None, 81920, useAsync: true))
                        {
                            await f.OpenReadStream().CopyToAsync(fs);
                        }

                        fileId = await InsertFileFromTempPathAsync(connection, tx, videoTempPath, detected);
                    }
                    else
                    {
                        fileId = await InsertFileAsync(connection, tx, f);
                    }

                    await InsertVersionFileLinkAsync(connection, tx, versionId, fileId, category, orderIndex);
                    orderIndex++;
                }

                await tx.CommitAsync();

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

                Guid? thumbnailFileId = null;
                if (videoTempPath != null)
                {
                    try
                    {
                        var thumbBytes = await ExtractFirstFrameAsJpgAsync(videoTempPath);
                        if (thumbBytes != null)
                        {
                            await using var thumbConn = new SqlConnection(_connectionString);
                            await thumbConn.OpenAsync();
                            await using var thumbTx = thumbConn.BeginTransaction();
                            try
                            {
                                var thumbId = await InsertThumbnailFileAsync(thumbConn, thumbTx, thumbBytes);
                                await InsertVersionFileLinkAsync(thumbConn, thumbTx, versionId, thumbId, ThumbnailCategory, 0);
                                await thumbTx.CommitAsync();
                                thumbnailFileId = thumbId;
                            }
                            catch (Exception ex)
                            {
                                await thumbTx.RollbackAsync();
                                Console.Error.WriteLine($"Thumbnail commit failed: {ex}");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"Thumbnail generation failed: {ex}");
                    }
                    finally
                    {
                        try { if (File.Exists(videoTempPath)) File.Delete(videoTempPath); } catch { }
                        videoTempPath = null;
                    }
                }

                return new CreateUserApplicationResult
                {
                    Success = true,
                    UserApplicationId = userApplicationId,
                    UserApplicationVersionId = versionId,
                    ThumbnailFileId = thumbnailFileId,
                };
            }
            catch (SqlException ex) when (SqlExceptionHelper.IsUniqueViolation(ex))
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
            finally
            {
                try { if (zipTempPath != null && File.Exists(zipTempPath)) File.Delete(zipTempPath); } catch { }
                try { if (videoTempPath != null && File.Exists(videoTempPath)) File.Delete(videoTempPath); } catch { }
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        //  UPDATE
        // ─────────────────────────────────────────────────────────────────────

        // ─────────────────────────────────────────────────────────────────────
        //  DELETE
        // ─────────────────────────────────────────────────────────────────────

        public async Task<bool> DeleteUserApplicationAsync(Guid ownerUserId, Guid userApplicationId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            // ── 1. Verify ownership ─────────────────────────────────────────
            const string ownsSql = @"
SELECT TOP 1 1
FROM dbo.UserApplication
WHERE Id = @AppId AND OwnerUserId = @OwnerId;";

            await using (var ownsCmd = new SqlCommand(ownsSql, connection))
            {
                ownsCmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                ownsCmd.Parameters.Add("@OwnerId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
                var owns = await ownsCmd.ExecuteScalarAsync();
                if (owns == null) return false;
            }

            // ── 2. Collect all version IDs and file IDs before deleting ─────
            var versionIds = new List<Guid>();
            {
                const string sql = @"
SELECT Id FROM dbo.UserApplicationVersion
WHERE UserApplicationId = @AppId;";
                await using var cmd = new SqlCommand(sql, connection);
                cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                    versionIds.Add(reader.GetGuid(0));
            }

            if (versionIds.Count == 0)
            {
                // No versions — just delete the application row
                await using var tx = connection.BeginTransaction();
                try
                {
                    const string sql = "DELETE FROM dbo.UserApplication WHERE Id = @AppId AND OwnerUserId = @OwnerId;";
                    await using var cmd = new SqlCommand(sql, connection, tx);
                    cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                    cmd.Parameters.Add("@OwnerId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
                    await cmd.ExecuteNonQueryAsync();
                    await tx.CommitAsync();
                    return true;
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            }

            // Collect all file IDs linked to any version of this app
            var allFileIds = new List<Guid>();
            {
                var paramNames = versionIds.Select((_, i) => $"@v{i}").ToList();
                var inClause = string.Join(", ", paramNames);
                var sql = $@"
SELECT DISTINCT uavf.FileId
FROM dbo.UserApplicationVersionFile uavf
WHERE uavf.UserApplicationVersionId IN ({inClause});";
                await using var cmd = new SqlCommand(sql, connection);
                for (int i = 0; i < versionIds.Count; i++)
                    cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                    allFileIds.Add(reader.GetGuid(0));
            }

            // ── 3. Delete everything in a single transaction ────────────────
            //  Order matters due to foreign keys:
            //  a) UserApplicationVersionFile (links files to versions)
            //  b) UserApplicationVersionTechnologyTag (links tags to versions)
            //  c) UserApplicationVersion (versions)
            //  d) UserApplication (the app itself)
            //  e) File rows (only if orphaned — no other version references them)

            await using var transaction = connection.BeginTransaction();
            try
            {
                // a) Delete all file links for all versions
                {
                    var paramNames = versionIds.Select((_, i) => $"@v{i}").ToList();
                    var inClause = string.Join(", ", paramNames);
                    var sql = $"DELETE FROM dbo.UserApplicationVersionFile WHERE UserApplicationVersionId IN ({inClause});";
                    await using var cmd = new SqlCommand(sql, connection, transaction);
                    for (int i = 0; i < versionIds.Count; i++)
                        cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
                    await cmd.ExecuteNonQueryAsync();
                }

                // b) Delete technology tag links (if the table exists)
                try
                {
                    var paramNames = versionIds.Select((_, i) => $"@v{i}").ToList();
                    var inClause = string.Join(", ", paramNames);
                    var sql = $"DELETE FROM dbo.UserApplicationVersionTechnologyTag WHERE UserApplicationVersionId IN ({inClause});";
                    await using var cmd = new SqlCommand(sql, connection, transaction);
                    for (int i = 0; i < versionIds.Count; i++)
                        cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
                    await cmd.ExecuteNonQueryAsync();
                }
                catch (SqlException) { /* table may not exist — that's fine */ }

                // c) Delete all versions
                {
                    var paramNames = versionIds.Select((_, i) => $"@v{i}").ToList();
                    var inClause = string.Join(", ", paramNames);
                    var sql = $"DELETE FROM dbo.UserApplicationVersion WHERE Id IN ({inClause});";
                    await using var cmd = new SqlCommand(sql, connection, transaction);
                    for (int i = 0; i < versionIds.Count; i++)
                        cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
                    await cmd.ExecuteNonQueryAsync();
                }

                // d) Delete the application itself
                {
                    const string sql = "DELETE FROM dbo.UserApplication WHERE Id = @AppId AND OwnerUserId = @OwnerId;";
                    await using var cmd = new SqlCommand(sql, connection, transaction);
                    cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                    cmd.Parameters.Add("@OwnerId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
                    await cmd.ExecuteNonQueryAsync();
                }

                // e) Delete orphaned files (only if no other version still links to them)
                foreach (var fileId in allFileIds)
                {
                    const string sql = @"
DELETE FROM dbo.[File]
WHERE Id = @FileId
  AND NOT EXISTS (
    SELECT 1 FROM dbo.UserApplicationVersionFile WHERE FileId = @FileId
  );";
                    await using var cmd = new SqlCommand(sql, connection, transaction);
                    cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
                    await cmd.ExecuteNonQueryAsync();
                }

                await transaction.CommitAsync();

                // ── 4. Invalidate technology cache for all deleted versions ──
                foreach (var vid in versionIds)
                    _cache.Remove(TechCachePrefix + vid);

                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        /// <summary>
        /// Checks whether the given application already has a zip file linked.
        /// </summary>
        public async Task<bool> HasZipFileAsync(Guid ownerUserId, Guid userApplicationId)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            const string sql = @"
SELECT TOP 1 1
FROM dbo.UserApplicationVersionFile uavf
JOIN dbo.UserApplicationVersion uav ON uav.Id = uavf.UserApplicationVersionId
JOIN dbo.UserApplication ua          ON ua.Id  = uav.UserApplicationId
WHERE ua.Id = @AppId
  AND ua.OwnerUserId = @OwnerId
  AND uavf.FileCategory = @ZipCat;";

            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
            cmd.Parameters.Add("@OwnerId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
            cmd.Parameters.Add("@ZipCat", SqlDbType.Int).Value = (int)UserApplicationFileCategory.Zip;
            var result = await cmd.ExecuteScalarAsync();
            return result != null;
        }

        public async Task<CreateUserApplicationResult> UpdateUserApplicationAsync(
            Guid ownerUserId,
            Guid userApplicationId,
            UpdateUserApplicationFormRequest request)
        {
            if (ownerUserId == Guid.Empty)
                return new CreateUserApplicationResult { Success = false, Error = "Invalid user." };

            string? zipTempPath = null;
            string? videoTempPath = null;

            try
            {
                await using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();

                // ══════════════════════════════════════════════════════════════
                //  PHASE 1: Read-only queries + heavy I/O (NO transaction)
                //  Goal: do all slow work before we take any locks.
                // ══════════════════════════════════════════════════════════════

                // ── 1a. Resolve the latest version ──────────────────────────
                Guid versionId;
                {
                    const string sql = @"
SELECT TOP 1 uav.Id
FROM dbo.UserApplicationVersion uav
JOIN dbo.UserApplication ua ON ua.Id = uav.UserApplicationId
WHERE ua.Id = @AppId AND ua.OwnerUserId = @OwnerId
ORDER BY uav.VersionIndex DESC;";
                    await using var cmd = new SqlCommand(sql, connection);
                    cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                    cmd.Parameters.Add("@OwnerId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
                    var obj = await cmd.ExecuteScalarAsync();
                    if (obj == null)
                        return new CreateUserApplicationResult { Success = false, Error = "Application not found." };
                    versionId = (Guid)obj;
                }

                // ── 1b. Parse request data ──────────────────────────────────

                var existingKeepIds = new List<Guid>();
                if (!string.IsNullOrWhiteSpace(request.ExistingMediaFileIds))
                {
                    try
                    {
                        var parsed = JsonSerializer.Deserialize<List<string>>(request.ExistingMediaFileIds);
                        if (parsed != null)
                            foreach (var s in parsed)
                                if (Guid.TryParse(s, out var gid) && gid != Guid.Empty)
                                    existingKeepIds.Add(gid);
                    }
                    catch { /* ignore */ }
                }

                var mediaOrderEntries = new List<MediaOrderEntry>();
                if (!string.IsNullOrWhiteSpace(request.MediaOrder))
                {
                    try
                    {
                        mediaOrderEntries = JsonSerializer.Deserialize<List<MediaOrderEntry>>(request.MediaOrder,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                    }
                    catch { /* ignore */ }
                }

                // ── 1c. Get content types for existing files (read-only, no tx needed) ──
                var existingFileContentTypes = new Dictionary<Guid, string>();
                if (existingKeepIds.Count > 0)
                {
                    var paramNames = existingKeepIds.Select((_, i) => $"@fid{i}").ToList();
                    var inClause = string.Join(", ", paramNames);
                    var ctSql = $"SELECT Id, ContentType FROM dbo.[File] WHERE Id IN ({inClause});";
                    await using var ctCmd = new SqlCommand(ctSql, connection);
                    for (int i = 0; i < existingKeepIds.Count; i++)
                        ctCmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = existingKeepIds[i];
                    await using var ctReader = await ctCmd.ExecuteReaderAsync();
                    while (await ctReader.ReadAsync())
                        existingFileContentTypes[ctReader.GetGuid(0)] = ctReader.GetString(1);
                }

                // ── 1d. Build the ordered media list ────────────────────────
                var newMediaFiles = (request.Media ?? new List<IFormFile>()).Where(f => f != null && f.Length > 0).ToList();
                var orderedMedia = new List<(Guid? existingFileId, IFormFile? newFile, string contentType)>();

                if (mediaOrderEntries.Count > 0)
                {
                    int newIdx = 0;
                    foreach (var entry in mediaOrderEntries)
                    {
                        if (entry.Type == "existing" && Guid.TryParse(entry.FileId, out var eid))
                        {
                            var ct = existingFileContentTypes.GetValueOrDefault(eid, "image/jpeg");
                            orderedMedia.Add((eid, null, ct));
                        }
                        else if (entry.Type == "new")
                        {
                            var idx = entry.NewIndex ?? newIdx;
                            if (idx >= 0 && idx < newMediaFiles.Count)
                            {
                                var f = newMediaFiles[idx];
                                var ct = MediaTypeDetector.DetectContentType(f);
                                orderedMedia.Add((null, f, ct));
                            }
                            newIdx++;
                        }
                    }
                }
                else
                {
                    foreach (var fid in existingKeepIds)
                    {
                        var ct = existingFileContentTypes.GetValueOrDefault(fid, "image/jpeg");
                        orderedMedia.Add((fid, null, ct));
                    }
                    foreach (var f in newMediaFiles)
                    {
                        var ct = MediaTypeDetector.DetectContentType(f);
                        orderedMedia.Add((null, f, ct));
                    }
                }

                // ── 1e. Apply presentation reordering ───────────────────────
                var presentationIndex = request.PresentationIndex;
                if (orderedMedia.Count == 0) presentationIndex = -1;
                else if (presentationIndex < 0 || presentationIndex >= orderedMedia.Count) presentationIndex = 0;

                if (presentationIndex >= 0 && presentationIndex < orderedMedia.Count && orderedMedia.Count > 0)
                {
                    var presItem = orderedMedia[presentationIndex];
                    orderedMedia.RemoveAt(presentationIndex);
                    orderedMedia.Insert(0, presItem);
                }

                // ── 1f. Read current file IDs (needed for thumbnail reuse decision) ──
                var currentMediaFileIds = await GetFileIdsForCategoriesNoTxAsync(connection, versionId,
                    new[] { (int)UserApplicationFileCategory.Image, (int)UserApplicationFileCategory.Video });
                var currentThumbFileIds = await GetFileIdsForCategoryNoTxAsync(connection, versionId, ThumbnailCategory);

                // ── 1g. Determine thumbnail strategy ────────────────────────
                //  The thumbnail is used in two places:
                //    1. Card display (when video IS the presentation)
                //    2. Detail modal carousel (for ANY video in the media list)
                //  So we must keep/generate a thumbnail whenever ANY video exists,
                //  not just when the presentation is a video.
                byte[]? preGeneratedThumbBytes = null;
                Guid? reuseThumbFileId = null;

                // Check if ANY video exists in the ordered media
                var hasAnyExistingVideo = orderedMedia.Any(m => m.existingFileId.HasValue && MediaTypeDetector.IsAllowedVideo(m.contentType));
                var hasAnyNewVideo = orderedMedia.Any(m => m.newFile != null && MediaTypeDetector.IsAllowedVideo(m.contentType));
                var hasAnyVideo = hasAnyExistingVideo || hasAnyNewVideo;

                if (hasAnyVideo)
                {
                    if (currentThumbFileIds.Count > 0 && hasAnyExistingVideo)
                    {
                        // An existing video is present and we already have a thumbnail — reuse it.
                        // This covers both "video is presentation" and "video is not presentation" cases.
                        reuseThumbFileId = currentThumbFileIds[0];
                    }
                    else if (hasAnyNewVideo)
                    {
                        // A new video is being uploaded — generate a thumbnail from it.
                        var newVideoEntry = orderedMedia.First(m => m.newFile != null && MediaTypeDetector.IsAllowedVideo(m.contentType));
                        videoTempPath = Path.GetTempFileName();
                        await using (var fs = new FileStream(videoTempPath, FileMode.Create,
                            FileAccess.Write, FileShare.None, 81920, useAsync: true))
                        {
                            await newVideoEntry.newFile!.OpenReadStream().CopyToAsync(fs);
                        }
                        try { preGeneratedThumbBytes = await ExtractFirstFrameAsJpgAsync(videoTempPath); }
                        catch (Exception ex) { Console.Error.WriteLine($"Thumbnail pre-gen failed: {ex.Message}"); }
                    }
                    else if (hasAnyExistingVideo && currentThumbFileIds.Count == 0)
                    {
                        // Rare edge case: existing video but no thumbnail was ever generated.
                        // Use streaming download to avoid loading GB into memory.
                        var existingVideoEntry = orderedMedia.First(m => m.existingFileId.HasValue && MediaTypeDetector.IsAllowedVideo(m.contentType));
                        videoTempPath = await StreamFileToTempAsync(existingVideoEntry.existingFileId!.Value);
                        if (videoTempPath != null)
                        {
                            try { preGeneratedThumbBytes = await ExtractFirstFrameAsJpgAsync(videoTempPath); }
                            catch (Exception ex) { Console.Error.WriteLine($"Thumbnail pre-gen failed: {ex.Message}"); }
                        }
                    }
                }

                // ══════════════════════════════════════════════════════════════
                //  PHASE 2: Fast transaction (only quick DB writes)
                // ══════════════════════════════════════════════════════════════

                await using var tx = connection.BeginTransaction();
                try
                {
                    // ── 2a. Update version metadata ─────────────────────────
                    {
                        const string sql = @"
UPDATE dbo.UserApplicationVersion
SET Name          = @Name,
    Price         = @Price,
    Description   = @Description,
    RepositoryUrl = @RepositoryUrl,
    IsDraft       = @IsDraft
WHERE Id = @VersionId;";
                        await using var cmd = new SqlCommand(sql, connection, tx);
                        cmd.Parameters.Add("@Name", SqlDbType.NVarChar, 255).Value = request.Name.Trim();
                        cmd.Parameters.Add("@Price", SqlDbType.Decimal).Value = (object?)request.Price ?? DBNull.Value;
                        cmd.Parameters.Add("@Description", SqlDbType.NVarChar).Value = (object?)request.Description?.Trim() ?? DBNull.Value;
                        cmd.Parameters.Add("@RepositoryUrl", SqlDbType.VarChar, 2048).Value =
                            string.IsNullOrWhiteSpace(request.RepositoryUrl) ? DBNull.Value : (object)request.RepositoryUrl.Trim();
                        cmd.Parameters.Add("@IsDraft", SqlDbType.Bit).Value = request.IsDraft;
                        cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
                        await cmd.ExecuteNonQueryAsync();
                    }

                    // ── 2b. Update technologies ─────────────────────────────
                    await UpsertTechnologyTagsAsync(connection, tx, request.Technologies);
                    var techList = request.Technologies ?? new List<string>();
                    var normalizedTechs = techList.Select(t => (t ?? "").Trim()).Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
                    _cache.Set(TechCachePrefix + versionId, normalizedTechs, new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(6) });

                    // ── 2c. Handle ZIP file ─────────────────────────────────
                    if (request.ZipFile != null && request.ZipFile.Length > 0)
                    {
                        var oldZipFileIds = await GetFileIdsForCategoryAsync(connection, tx, versionId, (int)UserApplicationFileCategory.Zip);
                        await DeleteVersionFileLinksForCategoryAsync(connection, tx, versionId, (int)UserApplicationFileCategory.Zip);
                        foreach (var oldId in oldZipFileIds)
                            await DeleteFileIfOrphanedAsync(connection, tx, oldId);

                        (zipTempPath, var zipFileId) = await InsertZipFileWithMetadataAsync(connection, tx, request.ZipFile, request.Technologies);
                        await InsertVersionFileLinkAsync(connection, tx, versionId, zipFileId, (int)UserApplicationFileCategory.Zip, 0);
                    }

                    // ── 2d. Delete old media + thumbnail LINKS ──────────────
                    var keepSet = new HashSet<Guid>(existingKeepIds);
                    var removeFileIds = currentMediaFileIds.Where(id => !keepSet.Contains(id)).ToList();

                    await DeleteVersionFileLinksForCategoriesAsync(connection, tx, versionId,
                        new[] { (int)UserApplicationFileCategory.Image, (int)UserApplicationFileCategory.Video, ThumbnailCategory });

                    foreach (var id in removeFileIds)
                        await DeleteFileIfOrphanedAsync(connection, tx, id);

                    // ── 2e. Insert new media links ──────────────────────────
                    var orderIdx = 1;
                    foreach (var (existingFileId, newFile, contentType) in orderedMedia)
                    {
                        var isVideo = MediaTypeDetector.IsAllowedVideo(contentType);
                        var category = isVideo
                            ? (int)UserApplicationFileCategory.Video
                            : (int)UserApplicationFileCategory.Image;

                        if (existingFileId.HasValue)
                        {
                            await InsertVersionFileLinkAsync(connection, tx, versionId, existingFileId.Value, category, orderIdx);
                        }
                        else if (newFile != null)
                        {
                            Guid fileId;
                            if (isVideo && videoTempPath != null)
                            {
                                // Video was already saved to temp in phase 1
                                fileId = await InsertFileFromTempPathAsync(connection, tx, videoTempPath, contentType);
                            }
                            else if (isVideo)
                            {
                                // Fallback: non-presentation video
                                var tempVid = Path.GetTempFileName();
                                await using (var fs = new FileStream(tempVid, FileMode.Create,
                                    FileAccess.Write, FileShare.None, 81920, useAsync: true))
                                    await newFile.OpenReadStream().CopyToAsync(fs);
                                fileId = await InsertFileFromTempPathAsync(connection, tx, tempVid, contentType);
                                try { File.Delete(tempVid); } catch { }
                            }
                            else
                            {
                                fileId = await InsertFileAsync(connection, tx, newFile);
                            }
                            await InsertVersionFileLinkAsync(connection, tx, versionId, fileId, category, orderIdx);
                        }
                        orderIdx++;
                    }

                    // ── 2f. Handle thumbnail ────────────────────────────────
                    if (reuseThumbFileId.HasValue)
                    {
                        // Re-link the existing thumbnail file — zero cost, no new file insert.
                        await InsertVersionFileLinkAsync(connection, tx, versionId, reuseThumbFileId.Value, ThumbnailCategory, 0);
                    }
                    else if (preGeneratedThumbBytes != null)
                    {
                        // Insert newly generated thumbnail bytes.
                        var thumbId = await InsertThumbnailFileAsync(connection, tx, preGeneratedThumbBytes);
                        await InsertVersionFileLinkAsync(connection, tx, versionId, thumbId, ThumbnailCategory, 0);
                    }

                    await tx.CommitAsync();
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    throw;
                }

                // ══════════════════════════════════════════════════════════════
                //  PHASE 3: Post-commit cleanup (no locks held)
                // ══════════════════════════════════════════════════════════════

                // Only clean up old thumbnails that weren't reused.
                var thumbsToCleanup = reuseThumbFileId.HasValue
                    ? currentThumbFileIds.Where(id => id != reuseThumbFileId.Value).ToList()
                    : currentThumbFileIds;

                if (thumbsToCleanup.Count > 0)
                {
                    try
                    {
                        await using var cleanupConn = new SqlConnection(_connectionString);
                        await cleanupConn.OpenAsync();
                        foreach (var oldThumbId in thumbsToCleanup)
                        {
                            try
                            {
                                const string cleanupSql = @"
DELETE FROM dbo.[File]
WHERE Id = @FileId
  AND NOT EXISTS (
    SELECT 1 FROM dbo.UserApplicationVersionFile WHERE FileId = @FileId
  );";
                                await using var cleanupCmd = new SqlCommand(cleanupSql, cleanupConn);
                                cleanupCmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = oldThumbId;
                                await cleanupCmd.ExecuteNonQueryAsync();
                            }
                            catch (Exception ex)
                            {
                                Console.Error.WriteLine($"Old thumbnail cleanup failed for {oldThumbId}: {ex.Message}");
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"Thumbnail cleanup connection failed: {ex.Message}");
                    }
                }

                return new CreateUserApplicationResult
                {
                    Success = true,
                    UserApplicationId = userApplicationId,
                    UserApplicationVersionId = versionId,
                };
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"UpdateUserApplicationAsync failed: {ex}");
                return new CreateUserApplicationResult { Success = false, Error = "Server error while updating application." };
            }
            finally
            {
                try { if (zipTempPath != null && File.Exists(zipTempPath)) File.Delete(zipTempPath); } catch { }
                try { if (videoTempPath != null && File.Exists(videoTempPath)) File.Delete(videoTempPath); } catch { }
            }
        }

        // ── Update helper methods ───────────────────────────────────────────

        private class MediaOrderEntry
        {
            public string Type { get; set; } = "";
            public string? FileId { get; set; }
            public int? NewIndex { get; set; }
        }

        private async Task<List<Guid>> GetFileIdsForCategoryAsync(
            SqlConnection connection, SqlTransaction tx, Guid versionId, int fileCategory)
        {
            const string sql = @"
SELECT uavf.FileId
FROM dbo.UserApplicationVersionFile uavf
WHERE uavf.UserApplicationVersionId = @VersionId
  AND uavf.FileCategory = @Cat;";
            var ids = new List<Guid>();
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
            cmd.Parameters.Add("@Cat", SqlDbType.Int).Value = fileCategory;
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync()) ids.Add(reader.GetGuid(0));
            return ids;
        }

        private async Task<List<Guid>> GetFileIdsForCategoriesAsync(
            SqlConnection connection, SqlTransaction tx, Guid versionId, int[] categories)
        {
            var paramNames = categories.Select((_, i) => $"@cat{i}").ToList();
            var inClause = string.Join(", ", paramNames);
            var sql = $@"
SELECT uavf.FileId
FROM dbo.UserApplicationVersionFile uavf
WHERE uavf.UserApplicationVersionId = @VersionId
  AND uavf.FileCategory IN ({inClause});";
            var ids = new List<Guid>();
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
            for (int i = 0; i < categories.Length; i++)
                cmd.Parameters.Add(paramNames[i], SqlDbType.Int).Value = categories[i];
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync()) ids.Add(reader.GetGuid(0));
            return ids;
        }

        private async Task DeleteVersionFileLinksForCategoryAsync(
            SqlConnection connection, SqlTransaction tx, Guid versionId, int fileCategory)
        {
            const string sql = @"
DELETE FROM dbo.UserApplicationVersionFile
WHERE UserApplicationVersionId = @VersionId
  AND FileCategory = @Cat;";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
            cmd.Parameters.Add("@Cat", SqlDbType.Int).Value = fileCategory;
            await cmd.ExecuteNonQueryAsync();
        }

        private async Task DeleteVersionFileLinksForCategoriesAsync(
            SqlConnection connection, SqlTransaction tx, Guid versionId, int[] categories)
        {
            var paramNames = categories.Select((_, i) => $"@cat{i}").ToList();
            var inClause = string.Join(", ", paramNames);
            var sql = $@"
DELETE FROM dbo.UserApplicationVersionFile
WHERE UserApplicationVersionId = @VersionId
  AND FileCategory IN ({inClause});";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
            for (int i = 0; i < categories.Length; i++)
                cmd.Parameters.Add(paramNames[i], SqlDbType.Int).Value = categories[i];
            await cmd.ExecuteNonQueryAsync();
        }

        /// <summary>
        /// Deletes a file from dbo.[File] only if it has no remaining links in UserApplicationVersionFile.
        /// </summary>
        private async Task DeleteFileIfOrphanedAsync(
            SqlConnection connection, SqlTransaction tx, Guid fileId)
        {
            const string sql = @"
DELETE FROM dbo.[File]
WHERE Id = @FileId
  AND NOT EXISTS (
    SELECT 1 FROM dbo.UserApplicationVersionFile WHERE FileId = @FileId
  );";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
            await cmd.ExecuteNonQueryAsync();
        }

        private async Task<string?> GetFileContentTypeAsync(
            SqlConnection connection, SqlTransaction tx, Guid fileId)
        {
            const string sql = @"SELECT TOP 1 ContentType FROM dbo.[File] WHERE Id = @FileId;";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
            var obj = await cmd.ExecuteScalarAsync();
            return obj as string;
        }

        /// <summary>
        /// Downloads a file from the DB to a temp path (used for video thumbnail generation on existing files).
        /// </summary>
        private async Task<string?> DownloadFileToTempAsync(
            SqlConnection connection, SqlTransaction tx, Guid fileId)
        {
            const string sql = @"SELECT FileContents FROM dbo.[File] WHERE Id = @FileId;";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
            cmd.CommandTimeout = 300; // large files may take time

            var obj = await cmd.ExecuteScalarAsync();
            if (obj == null || obj == DBNull.Value) return null;

            var bytes = (byte[])obj;
            var tempPath = Path.GetTempFileName();
            await File.WriteAllBytesAsync(tempPath, bytes);
            return tempPath;
        }

        /// <summary>
        /// Streams a file from the DB to a temp path using its own connection (no transaction).
        /// Uses SequentialAccess + GetStream so the file is NEVER loaded entirely into memory.
        /// Safe for files of any size (tested with 1+ GB videos).
        /// </summary>
        private async Task<string?> StreamFileToTempAsync(Guid fileId)
        {
            const string sql = @"SELECT FileContents FROM dbo.[File] WHERE Id = @FileId;";
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
            cmd.CommandTimeout = 600;

            await using var reader = await cmd.ExecuteReaderAsync(CommandBehavior.SequentialAccess);
            if (!await reader.ReadAsync() || reader.IsDBNull(0)) return null;

            var tempPath = Path.GetTempFileName();
            try
            {
                await using var sqlStream = reader.GetStream(0);
                await using var fileStream = new FileStream(tempPath, FileMode.Create,
                    FileAccess.Write, FileShare.None, 81920, useAsync: true);
                await sqlStream.CopyToAsync(fileStream, 81920);
                return tempPath;
            }
            catch
            {
                try { if (File.Exists(tempPath)) File.Delete(tempPath); } catch { }
                throw;
            }
        }

        /// <summary>
        /// Gets file IDs for specific categories without a transaction (read-only).
        /// </summary>
        private async Task<List<Guid>> GetFileIdsForCategoriesNoTxAsync(
            SqlConnection connection, Guid versionId, int[] categories)
        {
            var paramNames = categories.Select((_, i) => $"@cat{i}").ToList();
            var inClause = string.Join(", ", paramNames);
            var sql = $@"
SELECT uavf.FileId
FROM dbo.UserApplicationVersionFile uavf
WHERE uavf.UserApplicationVersionId = @VersionId
  AND uavf.FileCategory IN ({inClause});";
            var ids = new List<Guid>();
            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
            for (int i = 0; i < categories.Length; i++)
                cmd.Parameters.Add(paramNames[i], SqlDbType.Int).Value = categories[i];
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync()) ids.Add(reader.GetGuid(0));
            return ids;
        }

        /// <summary>
        /// Gets file IDs for a single category without a transaction (read-only).
        /// </summary>
        private async Task<List<Guid>> GetFileIdsForCategoryNoTxAsync(
            SqlConnection connection, Guid versionId, int fileCategory)
        {
            const string sql = @"
SELECT uavf.FileId
FROM dbo.UserApplicationVersionFile uavf
WHERE uavf.UserApplicationVersionId = @VersionId
  AND uavf.FileCategory = @Cat;";
            var ids = new List<Guid>();
            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
            cmd.Parameters.Add("@Cat", SqlDbType.Int).Value = fileCategory;
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync()) ids.Add(reader.GetGuid(0));
            return ids;
        }

        // ─────────────────────────────────────────────────────────────────────
        //  GET CARD
        // ─────────────────────────────────────────────────────────────────────

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
CROSS APPLY (
    SELECT TOP 1 *
    FROM dbo.UserApplicationVersion v WITH (NOLOCK)
    WHERE v.UserApplicationId = ua.Id
    ORDER BY v.VersionIndex DESC
) uav
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

        public async Task<Dictionary<string, List<string>>> GetBulkTechnologiesAsync(
            Guid ownerUserId, List<Guid> versionIds)
        {
            var result = new Dictionary<string, List<string>>();
            if (versionIds == null || versionIds.Count == 0) return result;

            var ownedVersionIds = await GetOwnedVersionIdsAsync(ownerUserId, versionIds);
            if (ownedVersionIds.Count == 0) return result;

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

            var zipFileIdMap = await GetZipFileIdsForVersionsAsync(uncached);

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
                await PopulateZipFileInfoAsync(connection, item);
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
FROM dbo.UserApplication ua WITH (NOLOCK)
JOIN dbo.UserApplicationVersion uav WITH (NOLOCK) ON uav.UserApplicationId = ua.Id
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
            await PopulateZipFileInfoAsync(connection, dto);
            return dto;
        }

        /// <summary>
        /// Populates ZipFileId and ZipFileName on a details DTO.
        /// </summary>
        private async Task PopulateZipFileInfoAsync(SqlConnection connection, UserApplicationDetailsDto dto)
        {
            const string sql = @"
SELECT TOP 1 uavf.FileId
FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
WHERE uavf.UserApplicationVersionId = @VersionId
  AND uavf.FileCategory = @ZipCat
ORDER BY uavf.OrderIndex;";

            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = dto.UserApplicationVersionId;
            cmd.Parameters.Add("@ZipCat", SqlDbType.Int).Value = (int)UserApplicationFileCategory.Zip;
            var obj = await cmd.ExecuteScalarAsync();
            if (obj != null && obj != DBNull.Value)
            {
                dto.ZipFileId = (Guid)obj;
                // We don't store the original filename, so derive one from the app name
                var safeName = string.IsNullOrWhiteSpace(dto.Name) ? "application" : dto.Name.Trim();
                dto.ZipFileName = safeName + ".zip";
            }
        }

        public async Task<List<UserApplicationCardDto>> SearchUserApplicationCardsAsync(
            Guid ownerUserId, string? query, string? sort)
        {
            var results = new List<UserApplicationCardDto>();
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
{(hasQuery ? @"
  AND (
    uav.Name        LIKE @Query
    OR uav.Description   LIKE @Query
    OR uav.RepositoryUrl LIKE @Query
  )" : "")}
ORDER BY {orderBy};";

            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
            if (hasQuery)
                cmd.Parameters.Add("@Query", SqlDbType.NVarChar, 2100).Value = $"%{query}%";

            var dbMatches = new List<UserApplicationCardDto>();
            var allVersionIds = new List<Guid>();

            await using (var reader = await cmd.ExecuteReaderAsync())
            {
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
                    allVersionIds.Add(versionId);

                    dbMatches.Add(new UserApplicationCardDto
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
            }

            if (allVersionIds.Count > 0)
            {
                var techMap = await GetBulkTechnologiesAsync(ownerUserId, allVersionIds);
                foreach (var card in dbMatches)
                {
                    var key = card.UserApplicationVersionId.ToString();
                    if (techMap.TryGetValue(key, out var techs))
                        card.Technologies = techs;
                }
            }

            if (hasQuery)
            {
                var q = query!.ToLowerInvariant();
                var matchedIds = new HashSet<Guid>(dbMatches.Select(c => c.UserApplicationId));

                const string allCardsSql = @"
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
WHERE ua.OwnerUserId = @OwnerUserId2;";

                await using var allCmd = new SqlCommand(allCardsSql, connection);
                allCmd.Parameters.Add("@OwnerUserId2", SqlDbType.UniqueIdentifier).Value = ownerUserId;

                var candidatesForTechSearch = new List<UserApplicationCardDto>();
                await using (var reader2 = await allCmd.ExecuteReaderAsync())
                {
                    while (await reader2.ReadAsync())
                    {
                        var appId = reader2.GetGuid(reader2.GetOrdinal("UserApplicationId"));
                        if (matchedIds.Contains(appId)) continue;

                        var fileId = reader2.IsDBNull(reader2.GetOrdinal("DefaultPresentationFileId"))
                            ? Guid.Empty
                            : reader2.GetGuid(reader2.GetOrdinal("DefaultPresentationFileId"));
                        var fileCategory = reader2.IsDBNull(reader2.GetOrdinal("DefaultPresentationFileCategory"))
                            ? 0
                            : reader2.GetInt32(reader2.GetOrdinal("DefaultPresentationFileCategory"));
                        var contentType = reader2.IsDBNull(reader2.GetOrdinal("DefaultPresentationContentType"))
                            ? ""
                            : reader2.GetString(reader2.GetOrdinal("DefaultPresentationContentType"));
                        var thumbId = reader2.IsDBNull(reader2.GetOrdinal("DefaultPresentationThumbnailFileId"))
                            ? Guid.Empty
                            : reader2.GetGuid(reader2.GetOrdinal("DefaultPresentationThumbnailFileId"));

                        var versionId = reader2.GetGuid(reader2.GetOrdinal("UserApplicationVersionId"));

                        candidatesForTechSearch.Add(new UserApplicationCardDto
                        {
                            UserApplicationId = appId,
                            UserApplicationVersionId = versionId,
                            VersionIndex = reader2.GetInt32(reader2.GetOrdinal("VersionIndex")),
                            IsDraft = reader2.GetBoolean(reader2.GetOrdinal("IsDraft")),
                            Name = reader2.GetString(reader2.GetOrdinal("Name")),
                            Price = reader2.IsDBNull(reader2.GetOrdinal("Price")) ? null : reader2.GetDecimal(reader2.GetOrdinal("Price")),
                            Description = reader2.IsDBNull(reader2.GetOrdinal("Description")) ? null : reader2.GetString(reader2.GetOrdinal("Description")),
                            RepositoryUrl = reader2.IsDBNull(reader2.GetOrdinal("RepositoryUrl")) ? null : reader2.GetString(reader2.GetOrdinal("RepositoryUrl")),
                            CreatedAt = reader2.GetDateTimeOffset(reader2.GetOrdinal("CreatedAt")),
                            DefaultPresentationFileId = fileId,
                            DefaultPresentationFileCategory = fileCategory,
                            DefaultPresentationContentType = contentType,
                            DefaultPresentationUrl = fileId == Guid.Empty ? "" : $"/api/user-application/get-user-application-file/{fileId}",
                            DefaultPresentationThumbnailUrl = thumbId == Guid.Empty ? "" : $"/api/user-application/get-user-application-file/{thumbId}",
                            IsVideo = fileCategory == (int)UserApplicationFileCategory.Video,
                            Technologies = new List<string>(),
                        });
                    }
                }

                if (candidatesForTechSearch.Count > 0)
                {
                    var candidateVersionIds = candidatesForTechSearch.Select(c => c.UserApplicationVersionId).ToList();
                    var candidateTechMap = await GetBulkTechnologiesAsync(ownerUserId, candidateVersionIds);

                    foreach (var card in candidatesForTechSearch)
                    {
                        var key = card.UserApplicationVersionId.ToString();
                        if (candidateTechMap.TryGetValue(key, out var techs))
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

        public async Task<FileMetadata?> GetFileMetaIfOwnedAsync(Guid ownerUserId, Guid fileId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string sql = @"
SELECT f.Id, f.ContentType, DATALENGTH(f.FileContents) AS FileSize
FROM dbo.[File] f WITH (NOLOCK)
WHERE f.Id = @FileId
  AND EXISTS (
    SELECT 1
    FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
    JOIN dbo.UserApplicationVersion uav WITH (NOLOCK) ON uav.Id = uavf.UserApplicationVersionId
    JOIN dbo.UserApplication ua WITH (NOLOCK)          ON ua.Id  = uav.UserApplicationId
    WHERE uavf.FileId      = f.Id
      AND ua.OwnerUserId   = @OwnerUserId
  );";

            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
            cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            return new FileMetadata
            {
                Id = reader.GetGuid(reader.GetOrdinal("Id")),
                ContentType = reader.GetString(reader.GetOrdinal("ContentType")),
                FileSize = reader.GetInt64(reader.GetOrdinal("FileSize")),
            };
        }

        public async Task StreamFileRangeAsync(
            Guid ownerUserId,
            Guid fileId,
            long offset,
            long length,
            Stream destination,
            CancellationToken cancellationToken = default)
        {
            try
            {
                await using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync(cancellationToken);

                const string sql = @"
SELECT SUBSTRING(f.FileContents, @Offset, @Length)
FROM dbo.[File] f WITH (NOLOCK)
WHERE f.Id = @FileId
  AND EXISTS (
    SELECT 1
    FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
    JOIN dbo.UserApplicationVersion uav WITH (NOLOCK) ON uav.Id = uavf.UserApplicationVersionId
    JOIN dbo.UserApplication ua WITH (NOLOCK)          ON ua.Id  = uav.UserApplicationId
    WHERE uavf.FileId      = f.Id
      AND ua.OwnerUserId   = @OwnerUserId
  );";

                await using var cmd = new SqlCommand(sql, connection);
                cmd.Parameters.Add("@Offset", SqlDbType.BigInt).Value = offset + 1; // SQL SUBSTRING is 1-based
                cmd.Parameters.Add("@Length", SqlDbType.BigInt).Value = length;
                cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
                cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;

                await using var reader = await cmd.ExecuteReaderAsync(
                    CommandBehavior.SequentialAccess, cancellationToken);

                if (!await reader.ReadAsync(cancellationToken)) return;
                if (reader.IsDBNull(0)) return;

                await using var sqlStream = reader.GetStream(0);

                const int bufferSize = 64 * 1024;
                await sqlStream.CopyToAsync(destination, bufferSize, cancellationToken);
            }
            catch (OperationCanceledException) { }
            catch (SqlException ex) when (SqlExceptionHelper.IsCancellation(ex)) { }
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

        private async Task<(string TempOutputPath, Guid ZipFileId)> InsertZipFileWithMetadataAsync(
            SqlConnection connection, SqlTransaction tx,
            IFormFile zipFile, List<string> technologies)
        {
            var tempInputPath = Path.GetTempFileName();
            var tempOutputPath = Path.GetTempFileName();

            try
            {
                await using (var fs = new FileStream(tempInputPath, FileMode.Create,
                    FileAccess.Write, FileShare.None, 81920, useAsync: true))
                {
                    await zipFile.OpenReadStream().CopyToAsync(fs);
                }

                try
                {
                    InjectOrUpdateZipMetadataToFile(tempInputPath, tempOutputPath, technologies);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Zip metadata injection failed; storing original zip. Error: {ex}");
                    File.Copy(tempInputPath, tempOutputPath, overwrite: true);
                }

                var contentType = string.IsNullOrWhiteSpace(zipFile.ContentType)
                    ? "application/zip"
                    : zipFile.ContentType;

                var zipFileId = await InsertFileFromTempPathAsync(connection, tx, tempOutputPath, contentType);
                return (tempOutputPath, zipFileId);
            }
            catch
            {
                try { if (File.Exists(tempOutputPath)) File.Delete(tempOutputPath); } catch { }
                throw;
            }
            finally
            {
                try { if (File.Exists(tempInputPath)) File.Delete(tempInputPath); } catch { }
            }
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
FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
JOIN dbo.[File] f WITH (NOLOCK) ON f.Id = uavf.FileId
WHERE uavf.UserApplicationVersionId = @VersionId
  AND uavf.FileCategory IN (2, 3, 4)
ORDER BY uavf.OrderIndex ASC;";

            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var fid = reader.GetGuid(reader.GetOrdinal("FileId"));
                files.Add(new UserApplicationFileDto
                {
                    FileId = fid,
                    FileCategory = reader.GetInt32(reader.GetOrdinal("FileCategory")),
                    OrderIndex = reader.GetInt32(reader.GetOrdinal("OrderIndex")),
                    ContentType = reader.GetString(reader.GetOrdinal("ContentType")),
                    Url = $"/api/user-application/get-user-application-file/{fid}"
                });
            }
            return files;
        }

        private async Task<List<string>> GetTechnologiesForVersionCachedAsync(
            SqlConnection connection, Guid versionId)
        {
            var cacheKey = TechCachePrefix + versionId;
            if (_cache.TryGetValue(cacheKey, out List<string>? cached) && cached != null)
                return cached;

            var techs = await GetTechnologiesFromTagTableAsync(connection, versionId);

            if (techs.Count == 0)
                techs = await GetTechsFromZipFastAsync(connection, versionId);

            _cache.Set(cacheKey, techs, new MemoryCacheEntryOptions
            {
                SlidingExpiration = TimeSpan.FromHours(6)
            });
            return techs;
        }

        private async Task<List<string>> GetTechnologiesFromTagTableAsync(
            SqlConnection connection, Guid versionId)
        {
            const string sql = @"
SELECT tt.Name
FROM dbo.UserApplicationVersionTechnologyTag uvtt
JOIN dbo.TechnologyTag tt ON tt.Id = uvtt.TechnologyTagId
WHERE uvtt.UserApplicationVersionId = @VersionId
ORDER BY tt.Name;";

            var result = new List<string>();
            try
            {
                await using var cmd = new SqlCommand(sql, connection);
                cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var name = reader.IsDBNull(0) ? null : reader.GetString(0);
                    if (!string.IsNullOrWhiteSpace(name)) result.Add(name.Trim());
                }
            }
            catch (SqlException) { }
            return result;
        }

        private async Task<List<string>> GetTechsFromZipFastAsync(
            SqlConnection connection, Guid versionId)
        {
            const string zipIdSql = @"
SELECT TOP 1 uavf.FileId
FROM dbo.UserApplicationVersionFile uavf
WHERE uavf.UserApplicationVersionId = @VersionId
  AND uavf.FileCategory = 1
ORDER BY uavf.OrderIndex;";

            Guid zipFileId;
            await using (var cmd = new SqlCommand(zipIdSql, connection))
            {
                cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
                var obj = await cmd.ExecuteScalarAsync();
                if (obj == null || obj == DBNull.Value) return new List<string>();
                zipFileId = (Guid)obj;
            }

            const string sizeSql = @"
SELECT DATALENGTH(FileContents) FROM dbo.[File] WHERE Id = @FileId;";
            long fileSize;
            await using (var cmd = new SqlCommand(sizeSql, connection))
            {
                cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = zipFileId;
                var obj = await cmd.ExecuteScalarAsync();
                if (obj == null || obj == DBNull.Value) return new List<string>();
                fileSize = Convert.ToInt64(obj);
            }
            if (fileSize < 22) return new List<string>();

            const int maxTailSize = 65535 + 22;
            var tailOffset = (int)Math.Max(0, fileSize - maxTailSize);
            var tailLength = (int)(fileSize - tailOffset);

            const string tailSql = @"
SELECT SUBSTRING(FileContents, @Offset, @Length) FROM dbo.[File] WHERE Id = @FileId;";

            byte[] tail;
            await using (var cmd = new SqlCommand(tailSql, connection))
            {
                cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = zipFileId;
                cmd.Parameters.Add("@Offset", SqlDbType.Int).Value = tailOffset + 1;
                cmd.Parameters.Add("@Length", SqlDbType.Int).Value = tailLength;
                var obj = await cmd.ExecuteScalarAsync();
                if (obj == null || obj == DBNull.Value) return new List<string>();
                tail = (byte[])obj;
            }

            int eocdOffset = -1;
            for (int i = tail.Length - 22; i >= 0; i--)
            {
                if (tail[i] == 0x50 && tail[i + 1] == 0x4B && tail[i + 2] == 0x05 && tail[i + 3] == 0x06)
                {
                    eocdOffset = i;
                    break;
                }
            }
            if (eocdOffset < 0) return new List<string>();

            long centralDirOffset = BitConverter.ToUInt32(tail, eocdOffset + 16);
            int centralDirSize = (int)BitConverter.ToUInt32(tail, eocdOffset + 12);

            if (centralDirOffset == 0xFFFFFFFF || centralDirSize > 10 * 1024 * 1024)
                return await ReadTechnologiesFromZipFullAsync(connection, zipFileId);

            const string cdSql = @"
SELECT SUBSTRING(FileContents, @Offset, @Length) FROM dbo.[File] WHERE Id = @FileId;";

            byte[] centralDir;
            await using (var cmd = new SqlCommand(cdSql, connection))
            {
                cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = zipFileId;
                cmd.Parameters.Add("@Offset", SqlDbType.Int).Value = (int)centralDirOffset + 1;
                cmd.Parameters.Add("@Length", SqlDbType.Int).Value = centralDirSize;
                var obj = await cmd.ExecuteScalarAsync();
                if (obj == null || obj == DBNull.Value) return new List<string>();
                centralDir = (byte[])obj;
            }

            long metaLocalHeaderOffset = -1;
            int metaCompressedSize = -1;
            int metaCompressionMethod = -1;
            int pos = 0;
            while (pos + 46 <= centralDir.Length)
            {
                if (centralDir[pos] != 0x50 || centralDir[pos + 1] != 0x4B ||
                    centralDir[pos + 2] != 0x01 || centralDir[pos + 3] != 0x02)
                    break;

                int compression = BitConverter.ToUInt16(centralDir, pos + 10);
                int compressedSize = (int)BitConverter.ToUInt32(centralDir, pos + 20);
                int fileNameLength = BitConverter.ToUInt16(centralDir, pos + 28);
                int extraLength = BitConverter.ToUInt16(centralDir, pos + 30);
                int commentLength = BitConverter.ToUInt16(centralDir, pos + 32);
                long localHeaderOff = BitConverter.ToUInt32(centralDir, pos + 42);

                if (pos + 46 + fileNameLength <= centralDir.Length)
                {
                    var entryName = Encoding.UTF8.GetString(centralDir, pos + 46, fileNameLength);
                    if (string.Equals(entryName, AppMetadataPath, StringComparison.OrdinalIgnoreCase))
                    {
                        metaLocalHeaderOffset = localHeaderOff;
                        metaCompressedSize = compressedSize;
                        metaCompressionMethod = compression;
                        break;
                    }
                }
                pos += 46 + fileNameLength + extraLength + commentLength;
            }

            if (metaLocalHeaderOffset < 0) return new List<string>();

            int readSize = 30 + 256 + metaCompressedSize;
            const string entrySql = @"
SELECT SUBSTRING(FileContents, @Offset, @Length) FROM dbo.[File] WHERE Id = @FileId;";

            byte[] entryData;
            await using (var cmd = new SqlCommand(entrySql, connection))
            {
                cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = zipFileId;
                cmd.Parameters.Add("@Offset", SqlDbType.Int).Value = (int)metaLocalHeaderOffset + 1;
                cmd.Parameters.Add("@Length", SqlDbType.Int).Value = readSize;
                var obj = await cmd.ExecuteScalarAsync();
                if (obj == null || obj == DBNull.Value) return new List<string>();
                entryData = (byte[])obj;
            }

            if (entryData.Length < 30) return new List<string>();
            if (entryData[0] != 0x50 || entryData[1] != 0x4B ||
                entryData[2] != 0x03 || entryData[3] != 0x04)
                return new List<string>();

            int localFnLen = BitConverter.ToUInt16(entryData, 26);
            int localExtraLen = BitConverter.ToUInt16(entryData, 28);
            int dataStart = 30 + localFnLen + localExtraLen;

            if (dataStart + metaCompressedSize > entryData.Length)
                return new List<string>();

            var compressedData = new byte[metaCompressedSize];
            Array.Copy(entryData, dataStart, compressedData, 0, metaCompressedSize);

            string json;
            try
            {
                if (metaCompressionMethod == 0)
                {
                    json = Encoding.UTF8.GetString(compressedData);
                }
                else if (metaCompressionMethod == 8)
                {
                    using var ms = new MemoryStream(compressedData);
                    using var ds = new System.IO.Compression.DeflateStream(ms, System.IO.Compression.CompressionMode.Decompress);
                    using var sr = new StreamReader(ds, Encoding.UTF8);
                    json = await sr.ReadToEndAsync();
                }
                else
                {
                    return await ReadTechnologiesFromZipFullAsync(connection, zipFileId);
                }
            }
            catch
            {
                return new List<string>();
            }

            return ParseTechnologiesFromJson(json);
        }

        private async Task<List<string>> ReadTechnologiesFromZipFullAsync(
            SqlConnection connection, Guid zipFileId)
        {
            const string sql = @"SELECT TOP 1 FileContents FROM dbo.[File] WHERE Id = @FileId;";
            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = zipFileId;
            var obj = await cmd.ExecuteScalarAsync();
            if (obj == null || obj == DBNull.Value) return new List<string>();
            try { return ReadTechnologiesFromZip((byte[])obj); }
            catch { return new List<string>(); }
        }

        private static List<string> ParseTechnologiesFromJson(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try
            {
                using var doc = JsonDocument.Parse(json);
                if (!doc.RootElement.TryGetProperty("technologies", out var techEl) ||
                    techEl.ValueKind != JsonValueKind.Array)
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
            catch { return new List<string>(); }
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

        private static void InjectOrUpdateZipMetadataToFile(
            string inputPath, string outputPath, List<string> technologies)
        {
            var cleaned = (technologies ?? new List<string>())
                .Select(t => (t ?? "").Trim())
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            var metadataObj = new { technologies = cleaned };
            var json = JsonSerializer.Serialize(metadataObj, new JsonSerializerOptions { WriteIndented = true });

            using var inputStream = new FileStream(inputPath, FileMode.Open, FileAccess.Read,
                FileShare.Read, 81920);
            using var outputStream = new FileStream(outputPath, FileMode.Create, FileAccess.Write,
                FileShare.None, 81920);

            using var inputZip = new ZipArchive(inputStream, ZipArchiveMode.Read, leaveOpen: true);
            using var outputZip = new ZipArchive(outputStream, ZipArchiveMode.Create, leaveOpen: true);

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
    }
}