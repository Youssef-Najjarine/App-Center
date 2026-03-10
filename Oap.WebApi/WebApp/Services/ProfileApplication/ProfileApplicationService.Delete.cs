using Microsoft.Data.SqlClient;
using System.Data;

namespace Oap.WebApp.Services
{
    public partial class ProfileApplicationService
    {
        public async Task<bool> DeleteUserApplicationAsync(Guid ownerUserId, Guid userApplicationId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

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

            await using var transaction = connection.BeginTransaction();
            try
            {
                {
                    var paramNames = versionIds.Select((_, i) => $"@v{i}").ToList();
                    var inClause = string.Join(", ", paramNames);
                    var sql = $"DELETE FROM dbo.UserApplicationVersionFile WHERE UserApplicationVersionId IN ({inClause});";
                    await using var cmd = new SqlCommand(sql, connection, transaction);
                    for (int i = 0; i < versionIds.Count; i++)
                        cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
                    await cmd.ExecuteNonQueryAsync();
                }

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
                catch (SqlException)

                {
                    var paramNames = versionIds.Select((_, i) => $"@v{i}").ToList();
                    var inClause = string.Join(", ", paramNames);
                    var sql = $"DELETE FROM dbo.UserApplicationVersion WHERE Id IN ({inClause});";
                    await using var cmd = new SqlCommand(sql, connection, transaction);
                    for (int i = 0; i < versionIds.Count; i++)
                        cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
                    await cmd.ExecuteNonQueryAsync();
                }

                {
                    const string sql = "DELETE FROM dbo.UserApplication WHERE Id = @AppId AND OwnerUserId = @OwnerId;";
                    await using var cmd = new SqlCommand(sql, connection, transaction);
                    cmd.Parameters.Add("@AppId", SqlDbType.UniqueIdentifier).Value = userApplicationId;
                    cmd.Parameters.Add("@OwnerId", SqlDbType.UniqueIdentifier).Value = ownerUserId;
                    await cmd.ExecuteNonQueryAsync();
                }

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
    }
}