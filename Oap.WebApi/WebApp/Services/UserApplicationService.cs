using System.Data;
using Microsoft.Data.SqlClient;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;

namespace Oap.WebApp.Services
{
    public class UserApplicationService : IUserApplication
    {
        private readonly string _connectionString;

        public UserApplicationService(IConfiguration config)
        {
            _connectionString = config.GetConnectionString("DefaultConnection")
                ?? throw new Exception("Missing connection string: DefaultConnection");
        }

        public async Task<UserApplication> CreateAsync(Guid ownerUserId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            // Insert row and return the new Id
            await using var cmd = new SqlCommand(@"
INSERT INTO [dbo].[UserApplication] (OwnerUserId)
OUTPUT INSERTED.Id, INSERTED.OwnerUserId
VALUES (@OwnerUserId);
", connection);

            cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
                throw new Exception("Insert failed: no row returned.");

            return new UserApplication
            {
                Id = reader.GetGuid(0),
                OwnerUserId = reader.GetGuid(1),
            };
        }

        public async Task<List<UserApplication>> GetMineAsync(Guid ownerUserId)
        {
            var results = new List<UserApplication>();

            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var cmd = new SqlCommand(@"
SELECT Id, OwnerUserId
FROM [dbo].[UserApplication]
WHERE OwnerUserId = @OwnerUserId
ORDER BY Id DESC;
", connection);

            cmd.Parameters.Add("@OwnerUserId", SqlDbType.UniqueIdentifier).Value = ownerUserId;

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                results.Add(new UserApplication
                {
                    Id = reader.GetGuid(0),
                    OwnerUserId = reader.GetGuid(1)
                });
            }

            return results;
        }
    }
}
