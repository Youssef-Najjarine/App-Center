using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;
using Oap.WebApp.DTOs.StoreApplication;
using Oap.WebApp.Models;
using System.Data;
using System.IO.Compression;
using System.Text;
using System.Text.Json;

namespace Oap.WebApp.Services
{
    public partial class StoreApplicationService
    {
        private const string AppMetadataPath = "oap.app.json";

        public async Task<List<StoreApplicationCardDto>> GetAllStoreCardsAsync()
        {
            var results = new List<StoreApplicationCardDto>();
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string sql = @"
SELECT
    ua.Id                       AS UserApplicationId,
    uav.Id                      AS UserApplicationVersionId,
    ua.OwnerUserId,
    uav.Name,
    uav.Price,
    uav.Description,
    uav.RepositoryUrl,
    uav.CreatedAt,
    pres.FileId                 AS DefaultPresentationFileId,
    pres.FileCategory           AS DefaultPresentationFileCategory,
    pres.ContentType            AS DefaultPresentationContentType,
    thumb.FileId                AS DefaultPresentationThumbnailFileId
FROM dbo.UserApplication ua WITH (NOLOCK)
CROSS APPLY (
    SELECT TOP 1 *
    FROM dbo.UserApplicationVersion v WITH (NOLOCK)
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
    SELECT TOP 1 uavf.FileId
    FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
    WHERE uavf.UserApplicationVersionId = uav.Id AND uavf.FileCategory = 4
) thumb
ORDER BY uav.CreatedAt DESC;";

            await using var cmd = new SqlCommand(sql, connection);
            await using var reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
                results.Add(ReadStoreCardFromReader(reader));

            return results;
        }

        public async Task<StoreApplicationDetailsDto?> GetStoreApplicationDetailsAsync(Guid userApplicationId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            const string sql = @"
SELECT TOP 1
    ua.Id AS UserApplicationId,
    uav.Id AS UserApplicationVersionId,
    ua.OwnerUserId,
    uav.Name, uav.Price, uav.Description, uav.RepositoryUrl, uav.CreatedAt
FROM dbo.UserApplication ua WITH (NOLOCK)
JOIN dbo.UserApplicationVersion uav WITH (NOLOCK) ON uav.UserApplicationId = ua.Id
WHERE ua.Id = @AppId AND uav.IsDraft = 0
ORDER BY uav.VersionIndex DESC;";

            StoreApplicationDetailsDto? dto = null;
            await using (var cmd = new SqlCommand(sql, connection))
            {
                cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync()) return null;
                dto = new StoreApplicationDetailsDto
                {
                    UserApplicationId = reader.GetGuid(reader.GetOrdinal("UserApplicationId")),
                    UserApplicationVersionId = reader.GetGuid(reader.GetOrdinal("UserApplicationVersionId")),
                    OwnerUserId = reader.GetGuid(reader.GetOrdinal("OwnerUserId")),
                    Name = reader.GetString(reader.GetOrdinal("Name")),
                    Price = reader.IsDBNull(reader.GetOrdinal("Price")) ? null : reader.GetDecimal(reader.GetOrdinal("Price")),
                    Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
                    RepositoryUrl = reader.IsDBNull(reader.GetOrdinal("RepositoryUrl")) ? null : reader.GetString(reader.GetOrdinal("RepositoryUrl")),
                    CreatedAt = reader.GetDateTimeOffset(reader.GetOrdinal("CreatedAt")),
                    Technologies = new List<string>(),
                };
            }

            // Get files
            {
                const string filesSql = @"
SELECT uavf.FileId, uavf.FileCategory, uavf.OrderIndex, f.ContentType
FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
JOIN dbo.[File] f WITH (NOLOCK) ON f.Id = uavf.FileId
WHERE uavf.UserApplicationVersionId = @VersionId AND uavf.FileCategory IN (2, 3, 4)
ORDER BY uavf.OrderIndex ASC;";
                await using var cmd = new SqlCommand(filesSql, connection);
                cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = dto.UserApplicationVersionId;
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var fid = reader.GetGuid(reader.GetOrdinal("FileId"));
                    dto.Files.Add(new StoreApplicationFileDto
                    {
                        FileId = fid,
                        FileCategory = reader.GetInt32(reader.GetOrdinal("FileCategory")),
                        OrderIndex = reader.GetInt32(reader.GetOrdinal("OrderIndex")),
                        ContentType = reader.GetString(reader.GetOrdinal("ContentType")),
                        Url = $"/api/store/file/{fid}",
                    });
                }
            }

            dto.Technologies = await GetStoreTechsCachedAsync(connection, dto.UserApplicationVersionId);

            return dto;
        }

        public async Task<Dictionary<string, List<string>>> GetStoreBulkTechnologiesAsync(List<Guid> versionIds)
        {
            var result = new Dictionary<string, List<string>>();
            if (versionIds == null || versionIds.Count == 0) return result;

            var uncached = new List<Guid>();
            foreach (var vid in versionIds)
            {
                if (_cache.TryGetValue(StoreTechCachePrefix + vid, out List<string>? hit) && hit != null)
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
                    var techs = await ReadTechsFromZipFastAsync(conn, vid);
                    _cache.Set(StoreTechCachePrefix + vid, techs, new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(6) });
                    return (vid, techs);
                }
                catch { return (vid, new List<string>()); }
                finally { semaphore.Release(); }
            });

            foreach (var (vid, techs) in await Task.WhenAll(tasks))
                result[vid.ToString()] = techs;

            return result;
        }

        public async Task<List<StoreApplicationCardDto>> SearchStoreCardsAsync(string? query, string? sort)
        {
            var allCards = await GetAllStoreCardsAsync();

            if (allCards.Count == 0) return allCards;

            var versionIds = allCards.Select(c => c.UserApplicationVersionId).Distinct().ToList();
            var techMap = await GetStoreBulkTechnologiesAsync(versionIds);
            foreach (var card in allCards)
                if (techMap.TryGetValue(card.UserApplicationVersionId.ToString(), out var techs))
                    card.Technologies = techs;

            if (!string.IsNullOrWhiteSpace(query))
            {
                var q = query.ToLowerInvariant();
                allCards = allCards.Where(c =>
                    (c.Name ?? "").ToLowerInvariant().Contains(q) ||
                    (c.Description ?? "").ToLowerInvariant().Contains(q) ||
                    (c.RepositoryUrl ?? "").ToLowerInvariant().Contains(q) ||
                    c.Technologies.Any(t => t.ToLowerInvariant().Contains(q))
                ).ToList();
            }

            allCards = sort?.ToUpperInvariant() switch
            {
                "A-Z" => allCards.OrderBy(c => c.Name ?? "").ToList(),
                "Z-A" => allCards.OrderByDescending(c => c.Name ?? "").ToList(),
                _ => allCards.OrderByDescending(c => c.CreatedAt).ToList(),
            };

            return allCards;
        }

        private static StoreApplicationCardDto ReadStoreCardFromReader(SqlDataReader reader)
        {
            var fileId = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationFileId"))
                ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DefaultPresentationFileId"));
            var fileCategory = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationFileCategory"))
                ? 0 : reader.GetInt32(reader.GetOrdinal("DefaultPresentationFileCategory"));
            var contentType = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationContentType"))
                ? "" : reader.GetString(reader.GetOrdinal("DefaultPresentationContentType"));
            var thumbId = reader.IsDBNull(reader.GetOrdinal("DefaultPresentationThumbnailFileId"))
                ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("DefaultPresentationThumbnailFileId"));

            return new StoreApplicationCardDto
            {
                UserApplicationId = reader.GetGuid(reader.GetOrdinal("UserApplicationId")),
                UserApplicationVersionId = reader.GetGuid(reader.GetOrdinal("UserApplicationVersionId")),
                OwnerUserId = reader.GetGuid(reader.GetOrdinal("OwnerUserId")),
                Name = reader.GetString(reader.GetOrdinal("Name")),
                Price = reader.IsDBNull(reader.GetOrdinal("Price")) ? null : reader.GetDecimal(reader.GetOrdinal("Price")),
                Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
                RepositoryUrl = reader.IsDBNull(reader.GetOrdinal("RepositoryUrl")) ? null : reader.GetString(reader.GetOrdinal("RepositoryUrl")),
                CreatedAt = reader.GetDateTimeOffset(reader.GetOrdinal("CreatedAt")),
                DefaultPresentationFileCategory = fileCategory,
                DefaultPresentationContentType = contentType,
                DefaultPresentationUrl = fileId == Guid.Empty ? "" : $"/api/store/file/{fileId}",
                DefaultPresentationThumbnailUrl = thumbId == Guid.Empty ? "" : $"/api/store/file/{thumbId}",
                IsVideo = fileCategory == 3,
                Technologies = new List<string>(),
            };
        }

        private async Task<List<string>> GetStoreTechsCachedAsync(SqlConnection connection, Guid versionId)
        {
            var key = StoreTechCachePrefix + versionId;
            if (_cache.TryGetValue(key, out List<string>? cached) && cached != null)
                return cached;

            var techs = await ReadTechsFromZipFastAsync(connection, versionId);
            _cache.Set(key, techs, new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(6) });
            return techs;
        }

        private async Task<List<string>> ReadTechsFromZipFastAsync(SqlConnection connection, Guid versionId)
        {
            const string zipIdSql = @"
SELECT TOP 1 uavf.FileId FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
WHERE uavf.UserApplicationVersionId = @VersionId AND uavf.FileCategory = 1
ORDER BY uavf.OrderIndex;";

            Guid zipFileId;
            await using (var cmd = new SqlCommand(zipIdSql, connection))
            {
                cmd.Parameters.Add("@VersionId", SqlDbType.UniqueIdentifier).Value = versionId;
                var obj = await cmd.ExecuteScalarAsync();
                if (obj == null || obj == DBNull.Value) return new List<string>();
                zipFileId = (Guid)obj;
            }

            long fileSize;
            await using (var cmd = new SqlCommand("SELECT DATALENGTH(FileContents) FROM dbo.[File] WHERE Id = @FileId;", connection))
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

            byte[] tail;
            await using (var cmd = new SqlCommand("SELECT SUBSTRING(FileContents, @Offset, @Length) FROM dbo.[File] WHERE Id = @FileId;", connection))
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
                { eocdOffset = i; break; }
            }
            if (eocdOffset < 0) return new List<string>();

            long centralDirOffset = BitConverter.ToUInt32(tail, eocdOffset + 16);
            int centralDirSize = (int)BitConverter.ToUInt32(tail, eocdOffset + 12);
            if (centralDirOffset == 0xFFFFFFFF || centralDirSize > 10 * 1024 * 1024)
                return new List<string>();

            byte[] centralDir;
            await using (var cmd = new SqlCommand("SELECT SUBSTRING(FileContents, @Offset, @Length) FROM dbo.[File] WHERE Id = @FileId;", connection))
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
                    centralDir[pos + 2] != 0x01 || centralDir[pos + 3] != 0x02) break;

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
            byte[] entryData;
            await using (var cmd = new SqlCommand("SELECT SUBSTRING(FileContents, @Offset, @Length) FROM dbo.[File] WHERE Id = @FileId;", connection))
            {
                cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = zipFileId;
                cmd.Parameters.Add("@Offset", SqlDbType.Int).Value = (int)metaLocalHeaderOffset + 1;
                cmd.Parameters.Add("@Length", SqlDbType.Int).Value = readSize;
                var obj = await cmd.ExecuteScalarAsync();
                if (obj == null || obj == DBNull.Value) return new List<string>();
                entryData = (byte[])obj;
            }

            if (entryData.Length < 30 ||
                entryData[0] != 0x50 || entryData[1] != 0x4B ||
                entryData[2] != 0x03 || entryData[3] != 0x04)
                return new List<string>();

            int localFnLen = BitConverter.ToUInt16(entryData, 26);
            int localExtraLen = BitConverter.ToUInt16(entryData, 28);
            int dataStart = 30 + localFnLen + localExtraLen;
            if (dataStart + metaCompressedSize > entryData.Length) return new List<string>();

            var compressedData = new byte[metaCompressedSize];
            Array.Copy(entryData, dataStart, compressedData, 0, metaCompressedSize);

            string json;
            try
            {
                if (metaCompressionMethod == 0)
                    json = Encoding.UTF8.GetString(compressedData);
                else if (metaCompressionMethod == 8)
                {
                    using var ms = new MemoryStream(compressedData);
                    using var ds = new DeflateStream(ms, CompressionMode.Decompress);
                    using var sr = new StreamReader(ds, Encoding.UTF8);
                    json = await sr.ReadToEndAsync();
                }
                else return new List<string>();
            }
            catch { return new List<string>(); }

            return ParseTechnologiesFromJson(json);
        }

        private static List<string> ParseTechnologiesFromJson(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try
            {
                using var doc = JsonDocument.Parse(json);
                if (!doc.RootElement.TryGetProperty("technologies", out var techEl) ||
                    techEl.ValueKind != JsonValueKind.Array) return new List<string>();
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
    }
}