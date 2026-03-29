using Microsoft.Data.SqlClient;
using Oap.WebApp.Utilities;
using System.Data;

namespace Oap.WebApp.Services
{
    public class DeleteAccountService
    {
        private readonly string _connectionString;

        public DeleteAccountService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        public async Task<(bool success, string? error)> DeleteAccountAsync(Guid userId, string password)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            const string authSql = "SELECT PasswordHash FROM dbo.[User] WHERE Id = @UserId;";
            string? storedHash;
            await using (var cmd = new SqlCommand(authSql, conn))
            {
                cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                storedHash = (string?)await cmd.ExecuteScalarAsync();
            }

            if (storedHash == null)
                return (false, "Account not found.");

            if (!PasswordHasher.VerifyPassword(password, storedHash))
                return (false, "Incorrect password.");

            await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();

            try
            {
                var appIds = new List<Guid>();
                await using (var cmd = new SqlCommand("SELECT Id FROM dbo.UserApplication WHERE OwnerUserId = @UserId;", conn, tx))
                {
                    cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync()) appIds.Add(reader.GetGuid(0));
                }

                if (appIds.Count > 0)
                {
                    var paramNames = appIds.Select((_, i) => $"@a{i}").ToList();
                    var inClause = string.Join(", ", paramNames);

                    var deleteAnalyticsSql = $"DELETE FROM dbo.ApplicationAnalyticsEvent WHERE UserApplicationId IN ({inClause});";
                    await using (var cmd = new SqlCommand(deleteAnalyticsSql, conn, tx))
                    {
                        for (int i = 0; i < appIds.Count; i++)
                            cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = appIds[i];
                        await cmd.ExecuteNonQueryAsync();
                    }
                }

                var versionIds = new List<Guid>();
                if (appIds.Count > 0)
                {
                    var paramNames = appIds.Select((_, i) => $"@a{i}").ToList();
                    var inClause = string.Join(", ", paramNames);

                    var versionIdsSql = $"SELECT Id FROM dbo.UserApplicationVersion WHERE UserApplicationId IN ({inClause});";
                    await using (var cmd = new SqlCommand(versionIdsSql, conn, tx))
                    {
                        for (int i = 0; i < appIds.Count; i++)
                            cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = appIds[i];
                        await using var reader = await cmd.ExecuteReaderAsync();
                        while (await reader.ReadAsync()) versionIds.Add(reader.GetGuid(0));
                    }
                }

                var appFileIds = new List<Guid>();
                if (versionIds.Count > 0)
                {
                    var vParamNames = versionIds.Select((_, i) => $"@v{i}").ToList();
                    var vInClause = string.Join(", ", vParamNames);

                    var getFileIdsSql = $"SELECT DISTINCT FileId FROM dbo.UserApplicationVersionFile WHERE UserApplicationVersionId IN ({vInClause});";
                    await using (var cmd = new SqlCommand(getFileIdsSql, conn, tx))
                    {
                        for (int i = 0; i < versionIds.Count; i++)
                            cmd.Parameters.Add(vParamNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
                        await using var reader = await cmd.ExecuteReaderAsync();
                        while (await reader.ReadAsync()) appFileIds.Add(reader.GetGuid(0));
                    }

                    var deleteVersionFilesSql = $"DELETE FROM dbo.UserApplicationVersionFile WHERE UserApplicationVersionId IN ({vInClause});";
                    await using (var cmd = new SqlCommand(deleteVersionFilesSql, conn, tx))
                    {
                        for (int i = 0; i < versionIds.Count; i++)
                            cmd.Parameters.Add(vParamNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
                        await cmd.ExecuteNonQueryAsync();
                    }
                }

                if (versionIds.Count > 0)
                {
                    var vParamNames = versionIds.Select((_, i) => $"@v{i}").ToList();
                    var vInClause = string.Join(", ", vParamNames);

                    var deleteVersionsSql = $"DELETE FROM dbo.UserApplicationVersion WHERE Id IN ({vInClause});";
                    await using (var cmd = new SqlCommand(deleteVersionsSql, conn, tx))
                    {
                        for (int i = 0; i < versionIds.Count; i++)
                            cmd.Parameters.Add(vParamNames[i], SqlDbType.UniqueIdentifier).Value = versionIds[i];
                        await cmd.ExecuteNonQueryAsync();
                    }
                }

                if (appIds.Count > 0)
                {
                    var paramNames = appIds.Select((_, i) => $"@a{i}").ToList();
                    var inClause = string.Join(", ", paramNames);

                    var deleteAppsSql = $"DELETE FROM dbo.UserApplication WHERE Id IN ({inClause});";
                    await using (var cmd = new SqlCommand(deleteAppsSql, conn, tx))
                    {
                        for (int i = 0; i < appIds.Count; i++)
                            cmd.Parameters.Add(paramNames[i], SqlDbType.UniqueIdentifier).Value = appIds[i];
                        await cmd.ExecuteNonQueryAsync();
                    }
                }

                var profileFileIds = new List<Guid>();
                await using (var cmd = new SqlCommand("SELECT FileId FROM dbo.UserProfileFile WHERE UserId = @UserId;", conn, tx))
                {
                    cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync()) profileFileIds.Add(reader.GetGuid(0));
                }

                await using (var cmd = new SqlCommand("DELETE FROM dbo.UserProfileFile WHERE UserId = @UserId;", conn, tx))
                {
                    cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                    await cmd.ExecuteNonQueryAsync();
                }

                await using (var cmd = new SqlCommand("DELETE FROM dbo.PasswordResetToken WHERE UserId = @UserId;", conn, tx))
                {
                    cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                    await cmd.ExecuteNonQueryAsync();
                }

                await using (var cmd = new SqlCommand("DELETE FROM dbo.UserVerification WHERE UserId = @UserId;", conn, tx))
                {
                    cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                    await cmd.ExecuteNonQueryAsync();
                }

                await using (var cmd = new SqlCommand("DELETE FROM dbo.TrustedDevice WHERE UserId = @UserId;", conn, tx))
                {
                    cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                    await cmd.ExecuteNonQueryAsync();
                }

                var allFileIds = appFileIds.Concat(profileFileIds).Distinct().ToList();
                if (allFileIds.Count > 0)
                {
                    var fParamNames = allFileIds.Select((_, i) => $"@f{i}").ToList();
                    var fInClause = string.Join(", ", fParamNames);

                    var deleteOrphanedFilesSql = $@"
DELETE FROM dbo.[File] WHERE Id IN ({fInClause})
AND NOT EXISTS (SELECT 1 FROM dbo.UserApplicationVersionFile WHERE FileId = dbo.[File].Id)
AND NOT EXISTS (SELECT 1 FROM dbo.UserProfileFile WHERE FileId = dbo.[File].Id)
AND NOT EXISTS (SELECT 1 FROM dbo.ApplicationTransaction WHERE ZipFileId = dbo.[File].Id)
AND NOT EXISTS (SELECT 1 FROM dbo.ApplicationTransaction WHERE PresentationFileId = dbo.[File].Id)
AND NOT EXISTS (SELECT 1 FROM dbo.ApplicationTransaction WHERE ThumbnailFileId = dbo.[File].Id)
AND NOT EXISTS (SELECT 1 FROM dbo.ApplicationTransaction WHERE PresentationFilesJson LIKE '%' + CONVERT(NVARCHAR(36), dbo.[File].Id) + '%');";

                    await using (var cmd = new SqlCommand(deleteOrphanedFilesSql, conn, tx))
                    {
                        for (int i = 0; i < allFileIds.Count; i++)
                            cmd.Parameters.Add(fParamNames[i], SqlDbType.UniqueIdentifier).Value = allFileIds[i];
                        await cmd.ExecuteNonQueryAsync();
                    }
                }

                await using (var cmd = new SqlCommand("DELETE FROM dbo.[User] WHERE Id = @UserId;", conn, tx))
                {
                    cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                    await cmd.ExecuteNonQueryAsync();
                }

                await tx.CommitAsync();
                return (true, null);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                Console.Error.WriteLine($"DeleteAccount failed: {ex}");
                return (false, "An error occurred while deleting your account.");
            }
        }
    }
}