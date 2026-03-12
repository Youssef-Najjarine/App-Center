using Microsoft.Data.SqlClient;
using Oap.WebApp.DTOs.UserApplication;
using Oap.WebApp.Models;
using Oap.WebApp.Utilities;
using System.Data;
using System.Diagnostics;

namespace Oap.WebApp.Services
{
    public partial class ProfileApplicationService
    {
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
            if (!MediaTypeDetector.IsAllowedImage(detected) && !MediaTypeDetector.IsAllowedVideo(detected))
                throw new InvalidOperationException("Invalid media type");
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
VALUES (@VersionId, @FileId, @FileCategory, @OrderIndex);";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
            cmd.Parameters.Add("@FileCategory", SqlDbType.Int).Value = fileCategory;
            cmd.Parameters.Add("@OrderIndex", SqlDbType.Int).Value = orderIndex;
            await cmd.ExecuteNonQueryAsync();
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
VALUES (@UserApplicationId, @VersionIndex, @IsDraft, @Name, @Price, @Description, @RepositoryUrl);";
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

        private async Task<(string? tempOutputPath, Guid zipFileId)> PrepareZipMetadataUpdateAsync(
            SqlConnection connection, Guid versionId, List<string> technologies)
        {
            const string sql = @"
SELECT TOP 1 uavf.FileId
FROM dbo.UserApplicationVersionFile uavf
WHERE uavf.UserApplicationVersionId = @VersionId
  AND uavf.FileCategory = @ZipCat
ORDER BY uavf.OrderIndex;";

            Guid zipFileId;
            await using (var cmd = new SqlCommand(sql, connection))
            {
                cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
                cmd.Parameters.Add("@ZipCat", SqlDbType.Int).Value = (int)UserApplicationFileCategory.Zip;
                var obj = await cmd.ExecuteScalarAsync();
                if (obj == null || obj == DBNull.Value)
                    return (null, Guid.Empty);
                zipFileId = (Guid)obj;
            }

            var tempInputPath = Path.GetTempFileName();
            var tempOutputPath = Path.GetTempFileName();
            try
            {
                const string streamSql = @"SELECT FileContents FROM dbo.[File] WHERE Id = @FileId;";
                await using (var cmd = new SqlCommand(streamSql, connection))
                {
                    cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = zipFileId;
                    cmd.CommandTimeout = 300;
                    await using var reader = await cmd.ExecuteReaderAsync(CommandBehavior.SequentialAccess);
                    if (!await reader.ReadAsync() || reader.IsDBNull(0))
                    {
                        try { File.Delete(tempInputPath); } catch { }
                        try { File.Delete(tempOutputPath); } catch { }
                        return (null, Guid.Empty);
                    }
                    await using var sqlStream = reader.GetStream(0);
                    await using var fs = new FileStream(tempInputPath, FileMode.Create,
                        FileAccess.Write, FileShare.None, 81920, useAsync: true);
                    await sqlStream.CopyToAsync(fs, 81920);
                }

                InjectOrUpdateZipMetadataToFile(tempInputPath, tempOutputPath, technologies);
                return (tempOutputPath, zipFileId);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"PrepareZipMetadataUpdateAsync failed: {ex.Message}");
                try { if (File.Exists(tempOutputPath)) File.Delete(tempOutputPath); } catch { }
                return (null, Guid.Empty);
            }
            finally
            {
                try { if (File.Exists(tempInputPath)) File.Delete(tempInputPath); } catch { }
            }
        }

        private async Task ReplaceFileContentsFromTempAsync(
            SqlConnection connection, SqlTransaction tx, Guid fileId, string tempPath)
        {
            const string sql = @"UPDATE dbo.[File] SET FileContents = @FileContents WHERE Id = @FileId;";
            await using var cmd = new SqlCommand(sql, connection, tx);
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
            await using var fs = new FileStream(tempPath, FileMode.Open, FileAccess.Read,
                FileShare.Read, 81920, useAsync: true);
            cmd.Parameters.Add("@FileContents", SqlDbType.VarBinary, -1).Value = fs;
            cmd.CommandTimeout = 300;
            await cmd.ExecuteNonQueryAsync();
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
                    await zipFile.OpenReadStream().CopyToAsync(fs);

                try { InjectOrUpdateZipMetadataToFile(tempInputPath, tempOutputPath, technologies); }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Zip metadata injection failed; storing original zip. Error: {ex}");
                    File.Copy(tempInputPath, tempOutputPath, overwrite: true);
                }

                var contentType = string.IsNullOrWhiteSpace(zipFile.ContentType) ? "application/zip" : zipFile.ContentType;
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

        private async Task<List<UserApplicationFileDto>> GetFilesForVersionAsync(SqlConnection connection, Guid versionId)
        {
            var files = new List<UserApplicationFileDto>();
            const string sql = @"
SELECT uavf.FileId, uavf.FileCategory, uavf.OrderIndex, f.ContentType
FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
JOIN dbo.[File] f WITH (NOLOCK) ON f.Id = uavf.FileId
WHERE uavf.UserApplicationVersionId = @VersionId AND uavf.FileCategory IN (2, 3, 4)
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

        public async Task<FileMetadata?> GetFileMetaIfOwnedAsync(Guid ownerUserId, Guid fileId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            const string sql = @"
SELECT f.Id, f.ContentType, DATALENGTH(f.FileContents) AS FileSize
FROM dbo.[File] f WITH (NOLOCK)
WHERE f.Id = @FileId
  AND EXISTS (
    SELECT 1 FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
    JOIN dbo.UserApplicationVersion uav WITH (NOLOCK) ON uav.Id = uavf.UserApplicationVersionId
    JOIN dbo.UserApplication ua WITH (NOLOCK) ON ua.Id = uav.UserApplicationId
    WHERE uavf.FileId = f.Id AND ua.OwnerUserId = @OwnerUserId
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
            Guid ownerUserId, Guid fileId, long offset, long length,
            Stream destination, CancellationToken cancellationToken = default)
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
    SELECT 1 FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
    JOIN dbo.UserApplicationVersion uav WITH (NOLOCK) ON uav.Id = uavf.UserApplicationVersionId
    JOIN dbo.UserApplication ua WITH (NOLOCK) ON ua.Id = uav.UserApplicationId
    WHERE uavf.FileId = f.Id AND ua.OwnerUserId = @OwnerUserId
  );";
                await using var cmd = new SqlCommand(sql, connection);
                cmd.Parameters.Add("@Offset", SqlDbType.BigInt).Value = offset + 1;
                cmd.Parameters.Add("@Length", SqlDbType.BigInt).Value = length;
                cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
                cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
                await using var reader = await cmd.ExecuteReaderAsync(CommandBehavior.SequentialAccess, cancellationToken);
                if (!await reader.ReadAsync(cancellationToken)) return;
                if (reader.IsDBNull(0)) return;
                await using var sqlStream = reader.GetStream(0);
                await sqlStream.CopyToAsync(destination, 64 * 1024, cancellationToken);
            }
            catch (OperationCanceledException) { }
            catch (SqlException ex) when (SqlExceptionHelper.IsCancellation(ex)) { }
        }
    }
}