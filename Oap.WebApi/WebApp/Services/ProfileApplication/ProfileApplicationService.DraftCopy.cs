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
        public async Task<CreateUserApplicationResult> CreateDraftCopyAsync(
            Guid ownerUserId,
            Guid sourceAppId,
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

                {
                    const string sql = @"
SELECT TOP 1 1 FROM dbo.UserApplication
WHERE Id = @AppId AND OwnerUserId = @OwnerId;";
                    await using var cmd = new SqlCommand(sql, connection);
                    cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = sourceAppId;
                    cmd.Parameters.Add("@OwnerId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
                    if (await cmd.ExecuteScalarAsync() == null)
                        return new CreateUserApplicationResult { Success = false, Error = "Source app not found." };
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
                    catch { }
                }

                var mediaOrderEntries = new List<MediaOrderEntry>();
                if (!string.IsNullOrWhiteSpace(request.MediaOrder))
                {
                    try
                    {
                        mediaOrderEntries = JsonSerializer.Deserialize<List<MediaOrderEntry>>(request.MediaOrder,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
                    }
                    catch { }
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

                Guid? sourceThumbFileId = null;
                bool hasAnyVideo = orderedMedia.Any(m =>
                    (m.existingFileId.HasValue && MediaTypeDetector.IsAllowedVideo(m.contentType)) ||
                    (m.newFile != null && MediaTypeDetector.IsAllowedVideo(m.contentType)));

                if (hasAnyVideo)
                {
                    const string thumbSql = @"
SELECT TOP 1 uavf.FileId
FROM dbo.UserApplicationVersion uav WITH (NOLOCK)
JOIN dbo.UserApplicationVersionFile uavf WITH (NOLOCK) ON uavf.UserApplicationVersionId = uav.Id
WHERE uav.UserApplicationId = @AppId AND uavf.FileCategory = @ThumbCat
ORDER BY uav.VersionIndex DESC;";
                    await using var thumbCmd = new SqlCommand(thumbSql, connection);
                    thumbCmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = sourceAppId;
                    thumbCmd.Parameters.Add("@ThumbCat", SqlDbType.Int).Value = ThumbnailCategory;
                    var thumbObj = await thumbCmd.ExecuteScalarAsync();
                    if (thumbObj != null && thumbObj != DBNull.Value)
                        sourceThumbFileId = (Guid)thumbObj;
                }

                byte[]? preGeneratedThumbBytes = null;
                if (hasAnyVideo && sourceThumbFileId == null)
                {
                    var newVideoEntry = orderedMedia.FirstOrDefault(m => m.newFile != null && MediaTypeDetector.IsAllowedVideo(m.contentType));
                    if (newVideoEntry.newFile != null)
                    {
                        videoTempPath = Path.GetTempFileName();
                        await using (var fs = new FileStream(videoTempPath, FileMode.Create,
                            FileAccess.Write, FileShare.None, 81920, useAsync: true))
                            await newVideoEntry.newFile.OpenReadStream().CopyToAsync(fs);
                        try { preGeneratedThumbBytes = await ExtractFirstFrameAsJpgAsync(videoTempPath); }
                        catch { }
                    }
                }

                await using var tx = connection.BeginTransaction();
                try
                {
                    var newAppId = await InsertUserApplicationAsync(connection, tx, ownerUserId);
                    const int versionIndex = 1;
                    var versionId = await InsertUserApplicationVersionAsync(
                        connection, tx, newAppId, versionIndex,
                        true,
                        (request.Name ?? "").Trim(),
                        request.Price,
                        request.Description?.Trim(),
                        string.IsNullOrWhiteSpace(request.RepositoryUrl) ? null : request.RepositoryUrl.Trim()
                    );

                    await UpsertTechnologyTagsAsync(connection, tx, request.Technologies);

                    if (request.ZipFile != null && request.ZipFile.Length > 0)
                    {
                        (zipTempPath, var zipFileId) = await InsertZipFileWithMetadataAsync(
                            connection, tx, request.ZipFile, request.Technologies);
                        await InsertVersionFileLinkAsync(connection, tx, versionId, zipFileId, (int)UserApplicationFileCategory.Zip, 0);
                    }
                    else
                    {
                        const string zipSql = @"
SELECT TOP 1 uavf.FileId
FROM dbo.UserApplicationVersion uav
JOIN dbo.UserApplicationVersionFile uavf ON uavf.UserApplicationVersionId = uav.Id
WHERE uav.UserApplicationId = @AppId AND uavf.FileCategory = @ZipCat
ORDER BY uav.VersionIndex DESC;";
                        await using var zipCmd = new SqlCommand(zipSql, connection, tx);
                        zipCmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = sourceAppId;
                        zipCmd.Parameters.Add("@ZipCat", SqlDbType.Int).Value = (int)UserApplicationFileCategory.Zip;
                        var zipObj = await zipCmd.ExecuteScalarAsync();
                        if (zipObj != null && zipObj != DBNull.Value)
                            await InsertVersionFileLinkAsync(connection, tx, versionId, (Guid)zipObj, (int)UserApplicationFileCategory.Zip, 0);
                    }

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
                                fileId = await InsertFileFromTempPathAsync(connection, tx, videoTempPath, contentType);
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
                                fileId = await InsertFileAsync(connection, tx, newFile);

                            await InsertVersionFileLinkAsync(connection, tx, versionId, fileId, category, orderIdx);
                        }
                        orderIdx++;
                    }

                    if (sourceThumbFileId.HasValue)
                        await InsertVersionFileLinkAsync(connection, tx, versionId, sourceThumbFileId.Value, ThumbnailCategory, 0);
                    else if (preGeneratedThumbBytes != null)
                    {
                        var thumbId = await InsertThumbnailFileAsync(connection, tx, preGeneratedThumbBytes);
                        await InsertVersionFileLinkAsync(connection, tx, versionId, thumbId, ThumbnailCategory, 0);
                    }

                    await tx.CommitAsync();

                    var techList = request.Technologies ?? new List<string>();
                    var normalizedTechs = techList.Select(t => (t ?? "").Trim()).Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
                    _cache.Set(TechCachePrefix + versionId, normalizedTechs,
                        new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(6) });

                    return new CreateUserApplicationResult
                    {
                        Success = true,
                        UserApplicationId = newAppId,
                        UserApplicationVersionId = versionId,
                    };
                }
                catch (Exception)
                {
                    await tx.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"CreateDraftCopyAsync failed: {ex}");
                return new CreateUserApplicationResult { Success = false, Error = "Server error while creating draft copy." };
            }
            finally
            {
                try { if (zipTempPath != null && File.Exists(zipTempPath)) File.Delete(zipTempPath); } catch { }
                try { if (videoTempPath != null && File.Exists(videoTempPath)) File.Delete(videoTempPath); } catch { }
            }
        }

    }
}