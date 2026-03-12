using Microsoft.Data.SqlClient;
using Oap.WebApp.Models;
using Oap.WebApp.Utilities;
using System.Data;

namespace Oap.WebApp.Services
{
    public partial class StoreApplicationService
    {
        public async Task<FileMetadata?> GetPublicFileMetaAsync(Guid fileId)
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
    WHERE uavf.FileId = f.Id
      AND uav.IsDraft = 0
  );";

            await using var cmd = new SqlCommand(sql, connection);
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            return new FileMetadata
            {
                Id = reader.GetGuid(reader.GetOrdinal("Id")),
                ContentType = reader.GetString(reader.GetOrdinal("ContentType")),
                FileSize = reader.GetInt64(reader.GetOrdinal("FileSize")),
            };
        }

        public async Task StreamPublicFileRangeAsync(
            Guid fileId, long offset, long length,
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
    SELECT 1
    FROM dbo.UserApplicationVersionFile uavf WITH (NOLOCK)
    JOIN dbo.UserApplicationVersion uav WITH (NOLOCK) ON uav.Id = uavf.UserApplicationVersionId
    WHERE uavf.FileId = f.Id
      AND uav.IsDraft = 0
  );";

                await using var cmd = new SqlCommand(sql, connection);
                cmd.Parameters.Add("@Offset", SqlDbType.BigInt).Value = offset + 1;
                cmd.Parameters.Add("@Length", SqlDbType.BigInt).Value = length;
                cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;

                await using var reader = await cmd.ExecuteReaderAsync(
                    CommandBehavior.SequentialAccess, cancellationToken);

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