using Microsoft.Data.SqlClient;
using System.Data;

namespace Oap.WebApp.Services
{
    public class TrustedDeviceService
    {
        private readonly string _connectionString;

        public TrustedDeviceService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        public async Task<bool> IsDeviceTrustedAsync(Guid userId, string deviceId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var cmd = new SqlCommand(
                @"SELECT LastVerifiedUtc
                  FROM [dbo].[TrustedDevice]
                  WHERE UserId = @UserId AND DeviceId = @DeviceId",
                connection);

            cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
            cmd.Parameters.Add("@DeviceId", SqlDbType.NVarChar, 64).Value = deviceId;

            var result = await cmd.ExecuteScalarAsync();
            if (result == null || result == DBNull.Value) return false;

            var lastVerifiedUtc = (DateTime)result;

            return lastVerifiedUtc >= DateTime.UtcNow.AddDays(-30);
        }

        public async Task UpsertTrustedDeviceAsync(Guid userId, string deviceId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var cmd = new SqlCommand(
                @"MERGE [dbo].[TrustedDevice] AS target
                  USING (VALUES (@UserId, @DeviceId, @NowUtc)) AS src (UserId, DeviceId, LastVerifiedUtc)
                  ON target.UserId = src.UserId AND target.DeviceId = src.DeviceId
                  WHEN MATCHED THEN UPDATE SET LastVerifiedUtc = src.LastVerifiedUtc
                  WHEN NOT MATCHED THEN INSERT (UserId, DeviceId, LastVerifiedUtc)
                  VALUES (src.UserId, src.DeviceId, src.LastVerifiedUtc);",
                connection);

            cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
            cmd.Parameters.Add("@DeviceId", SqlDbType.NVarChar, 64).Value = deviceId;
            cmd.Parameters.Add("@NowUtc", SqlDbType.DateTime).Value = DateTime.UtcNow;

            await cmd.ExecuteNonQueryAsync();
        }
    }
}
