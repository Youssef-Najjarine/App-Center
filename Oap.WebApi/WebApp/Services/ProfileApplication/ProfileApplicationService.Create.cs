using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;
using Oap.WebApp.DTOs.UserApplication;
using Oap.WebApp.Models;
using Oap.WebApp.Utilities;
using System.Data;

namespace Oap.WebApp.Services
{
    public partial class ProfileApplicationService
    {
        public async Task<CreateUserApplicationResult> CreateUserApplicationAsync(
            Guid ownerUserId,
            CreateUserApplicationFormRequest request)
        {
            if (ownerUserId == Guid.Empty)
                return new CreateUserApplicationResult { Success = false, Error = "Invalid user." };
            if (request == null)
                return new CreateUserApplicationResult { Success = false, Error = "Invalid request." };
            if (!request.IsDraft && (request.ZipFile == null || request.ZipFile.Length == 0))
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

                if (request.ZipFile != null && request.ZipFile.Length > 0)
                {
                    (zipTempPath, var zipFileId) = await InsertZipFileWithMetadataAsync(
                        connection, tx, request.ZipFile, request.Technologies);
                    await InsertVersionFileLinkAsync(connection, tx, versionId, zipFileId, (int)UserApplicationFileCategory.Zip, 0);
                }

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
    }
}