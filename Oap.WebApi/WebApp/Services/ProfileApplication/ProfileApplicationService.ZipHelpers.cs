using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Caching.Memory;
using System.Data;
using System.IO.Compression;
using System.Text;
using System.Text.Json;

namespace Oap.WebApp.Services
{
    public partial class ProfileApplicationService
    {
        private async Task<List<string>> GetTechnologiesForVersionCachedAsync(SqlConnection connection, Guid versionId)
        {
            var cacheKey = TechCachePrefix + versionId;
            if (_cache.TryGetValue(cacheKey, out List<string>? cached) && cached != null)
                return cached;

            var techs = await GetTechnologiesFromTagTableAsync(connection, versionId);
            if (techs.Count == 0)
                techs = await GetTechsFromZipFastAsync(connection, versionId);

            _cache.Set(cacheKey, techs, new MemoryCacheEntryOptions { SlidingExpiration = TimeSpan.FromHours(6) });
            return techs;
        }

        private async Task<List<string>> GetTechnologiesFromTagTableAsync(SqlConnection connection, Guid versionId)
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

        private async Task<List<string>> GetTechsFromZipFastAsync(SqlConnection connection, Guid versionId)
        {
            const string zipIdSql = @"
SELECT TOP 1 uavf.FileId FROM dbo.UserApplicationVersionFile uavf
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

            const string sizeSql = "SELECT DATALENGTH(FileContents) FROM dbo.[File] WHERE Id = @FileId;";
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
                return await ReadTechnologiesFromZipFullAsync(connection, zipFileId);

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

            if (entryData.Length < 30) return new List<string>();
            if (entryData[0] != 0x50 || entryData[1] != 0x4B ||
                entryData[2] != 0x03 || entryData[3] != 0x04) return new List<string>();

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
                else
                    return await ReadTechnologiesFromZipFullAsync(connection, zipFileId);
            }
            catch { return new List<string>(); }

            return ParseTechnologiesFromJson(json);
        }

        private async Task<List<string>> ReadTechnologiesFromZipFullAsync(SqlConnection connection, Guid zipFileId)
        {
            const string sql = "SELECT TOP 1 FileContents FROM dbo.[File] WHERE Id = @FileId;";
            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = zipFileId;
            var obj = await cmd.ExecuteScalarAsync();
            if (obj == null || obj == DBNull.Value) return new List<string>();
            try { return ReadTechnologiesFromZip((byte[])obj); }
            catch { return new List<string>(); }
        }

        private async Task<List<string>> ReadTechnologiesFromZipInDbAsync(Guid zipFileId)
        {
            const string sql = "SELECT TOP 1 FileContents FROM dbo.[File] WHERE Id = @FileId;";
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
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

        private static void InjectOrUpdateZipMetadataToFile(string inputPath, string outputPath, List<string> technologies)
        {
            var cleaned = (technologies ?? new List<string>())
                .Select(t => (t ?? "").Trim())
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
            var metadataObj = new { technologies = cleaned };
            var json = JsonSerializer.Serialize(metadataObj, new JsonSerializerOptions { WriteIndented = true });

            using var inputStream = new FileStream(inputPath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920);
            using var outputStream = new FileStream(outputPath, FileMode.Create, FileAccess.Write, FileShare.None, 81920);
            using var inputZip = new ZipArchive(inputStream, ZipArchiveMode.Read, leaveOpen: true);
            using var outputZip = new ZipArchive(outputStream, ZipArchiveMode.Create, leaveOpen: true);

            foreach (var entry in inputZip.Entries)
            {
                if (string.Equals(entry.FullName, AppMetadataPath, StringComparison.OrdinalIgnoreCase)) continue;
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