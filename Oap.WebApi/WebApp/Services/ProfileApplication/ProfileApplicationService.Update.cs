using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;
using Oap.WebApp.DTOs.UserApplication;
using Oap.WebApp.Models;
using Oap.WebApp.Utilities;
using System.Data;
using System.Text.Json;

namespace Oap.WebApp.Services
{
    public partial class ProfileApplicationService
    {
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
            string? zipMetadataUpdatePath = null;
            Guid zipMetadataUpdateFileId = Guid.Empty;

            try
            {
                await using var connection = new SqlConnection(_connectionString);
                await connection.OpenAsync();

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
                    catch {}
                }

                var mediaOrderEntries = new List<MediaOrderEntry>();
                if (!string.IsNullOrWhiteSpace(request.MediaOrder))
                {
                    try
                    {
                        mediaOrderEntries = JsonSerializer.Deserialize<List<MediaOrderEntry>>(request.MediaOrder,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                    }
                    catch {}
                }

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

                var presentationIndex = request.PresentationIndex;
                if (orderedMedia.Count == 0) presentationIndex = -1;
                else if (presentationIndex < 0 || presentationIndex >= orderedMedia.Count) presentationIndex = 0;

                if (presentationIndex >= 0 && presentationIndex < orderedMedia.Count && orderedMedia.Count > 0)
                {
                    var presItem = orderedMedia[presentationIndex];
                    orderedMedia.RemoveAt(presentationIndex);
                    orderedMedia.Insert(0, presItem);
                }

                var currentMediaFileIds = await GetFileIdsForCategoriesNoTxAsync(connection, versionId,
                    new[] { (int)UserApplicationFileCategory.Image, (int)UserApplicationFileCategory.Video });
                var currentThumbFileIds = await GetFileIdsForCategoryNoTxAsync(connection, versionId, ThumbnailCategory);

                byte[]? preGeneratedThumbBytes = null;
                Guid? reuseThumbFileId = null;

                var hasAnyExistingVideo = orderedMedia.Any(m => m.existingFileId.HasValue && MediaTypeDetector.IsAllowedVideo(m.contentType));
                var hasAnyNewVideo = orderedMedia.Any(m => m.newFile != null && MediaTypeDetector.IsAllowedVideo(m.contentType));
                var hasAnyVideo = hasAnyExistingVideo || hasAnyNewVideo;

                if (hasAnyVideo)
                {
                    if (currentThumbFileIds.Count > 0 && hasAnyExistingVideo)
                    {
                        reuseThumbFileId = currentThumbFileIds[0];
                    }
                    else if (hasAnyNewVideo)
                    {
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
                        var existingVideoEntry = orderedMedia.First(m => m.existingFileId.HasValue && MediaTypeDetector.IsAllowedVideo(m.contentType));
                        videoTempPath = await StreamFileToTempAsync(existingVideoEntry.existingFileId!.Value);
                        if (videoTempPath != null)
                        {
                            try { preGeneratedThumbBytes = await ExtractFirstFrameAsJpgAsync(videoTempPath); }
                            catch (Exception ex) { Console.Error.WriteLine($"Thumbnail pre-gen failed: {ex.Message}"); }
                        }
                    }
                }

                if (request.ZipFile == null || request.ZipFile.Length == 0)
                {
                    try
                    {
                        (zipMetadataUpdatePath, zipMetadataUpdateFileId) =
                            await PrepareZipMetadataUpdateAsync(connection, versionId, request.Technologies);
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"ZIP metadata pre-update failed (non-fatal): {ex.Message}");
                    }
                }

                await using var tx = connection.BeginTransaction();
                try
                {
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

                    await UpsertTechnologyTagsAsync(connection, tx, request.Technologies);
                    var techList = request.Technologies ?? new List<string>();
                    var normalizedTechs = techList.Select(t => (t ?? "").Trim()).Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
                    _cache.Set(TechCachePrefix + versionId, normalizedTechs, new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(6) });

                    if (request.ZipFile != null && request.ZipFile.Length > 0)
                    {
                        var oldZipFileIds = await GetFileIdsForCategoryAsync(connection, tx, versionId, (int)UserApplicationFileCategory.Zip);
                        await DeleteVersionFileLinksForCategoryAsync(connection, tx, versionId, (int)UserApplicationFileCategory.Zip);
                        foreach (var oldId in oldZipFileIds)
                            await DeleteFileIfOrphanedAsync(connection, tx, oldId);

                        (zipTempPath, var zipFileId) = await InsertZipFileWithMetadataAsync(connection, tx, request.ZipFile, request.Technologies);
                        await InsertVersionFileLinkAsync(connection, tx, versionId, zipFileId, (int)UserApplicationFileCategory.Zip, 0);
                    }
                    else if (zipMetadataUpdatePath != null && zipMetadataUpdateFileId != Guid.Empty)
                    {
                        await ReplaceFileContentsFromTempAsync(connection, tx, zipMetadataUpdateFileId, zipMetadataUpdatePath);
                    }

                    var keepSet = new HashSet<Guid>(existingKeepIds);
                    var removeFileIds = currentMediaFileIds.Where(id => !keepSet.Contains(id)).ToList();

                    await DeleteVersionFileLinksForCategoriesAsync(connection, tx, versionId,
                        new[] { (int)UserApplicationFileCategory.Image, (int)UserApplicationFileCategory.Video, ThumbnailCategory });

                    foreach (var id in removeFileIds)
                        await DeleteFileIfOrphanedAsync(connection, tx, id);

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
                                fileId = await InsertFileFromTempPathAsync(connection, tx, videoTempPath, contentType);
                            }
                            else if (isVideo)
                            {
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

                    if (reuseThumbFileId.HasValue)
                    {
                        await InsertVersionFileLinkAsync(connection, tx, versionId, reuseThumbFileId.Value, ThumbnailCategory, 0);
                    }
                    else if (preGeneratedThumbBytes != null)
                    {
                        var thumbId = await InsertThumbnailFileAsync(connection, tx, preGeneratedThumbBytes);
                        await InsertVersionFileLinkAsync(connection, tx, versionId, thumbId, ThumbnailCategory, 0);
                    }

                    await tx.CommitAsync();
                }
                catch (Exception)
                {
                    await tx.RollbackAsync();
                    throw;
                }

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
                try { if (zipMetadataUpdatePath != null && File.Exists(zipMetadataUpdatePath)) File.Delete(zipMetadataUpdatePath); } catch { }
            }
        }

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
    }
}