using Microsoft.Data.SqlClient;
using System.Data;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Utilities;
using Oap.WebApp.Models;

namespace Oap.WebApp.Services
{
    public class UserAccountService : IUserAccount
    {
        private readonly string _connectionString;
        private readonly EmailService _emailService;

        public async Task<UserAccount?> GetUserByIdAsync(Guid userId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var command = new SqlCommand(
                "SELECT * FROM [dbo].[User] WHERE Id = @Id",
                connection);

            command.Parameters.Add("@Id", SqlDbType.UniqueIdentifier).Value = userId;

            await using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            return new UserAccount
            {
                Id = reader.GetGuid("Id"),
                Username = reader.GetString("Username"),
                PasswordHash = reader.GetString("PasswordHash"),
                EmailAddress = reader.GetString("EmailAddress"),
                IsVerified = reader.GetBoolean("IsVerified"),
                FirstName = reader.GetString("FirstName"),
                LastName = reader.GetString("LastName"),
                BioText = reader.IsDBNull("BioText") ? null : reader.GetString("BioText")
            };
        }

        public UserAccountService(IConfiguration configuration, EmailService emailService)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
            _emailService = emailService;
        }

        public async Task<bool> UsernameExistsAsync(string username)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var command = new SqlCommand(
                "SELECT COUNT(1) FROM [dbo].[User] WHERE Username = @Username",
                connection);

            command.Parameters.Add("@Username", SqlDbType.NVarChar, 255).Value = username.Trim();

            var count = (int)await command.ExecuteScalarAsync();
            return count > 0;
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var command = new SqlCommand(
                "SELECT COUNT(1) FROM [dbo].[User] WHERE EmailAddress = @Email",
                connection);

            command.Parameters.Add("@Email", SqlDbType.NVarChar, 255).Value = email.Trim();

            var count = (int)await command.ExecuteScalarAsync();
            return count > 0;
        }

        public async Task<string?> CreateUserAsync(string username, string password, string email, string firstName, string lastName)
        {
            string passwordHash = PasswordHasher.HashPassword(password);
            string code = new Random().Next(1000, 9999).ToString("D4");
            DateTime expires = DateTime.Now.AddMinutes(15);

            string u = username.Trim();
            string e = email.Trim();
            string fn = firstName.Trim();
            string ln = lastName.Trim();

            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            await using var transaction = connection.BeginTransaction();

            try
            {
                Guid? existingUserId = null;

                var existingByUsername = await GetUserByUsernameAsync(connection, transaction, u);
                var existingByEmail = await GetUserByEmailAsync(connection, transaction, e);

                if (existingByUsername != null && existingByEmail != null && existingByUsername.Id != existingByEmail.Id)
                {
                    await transaction.RollbackAsync();
                    return "Username and email belong to different unverified accounts. Please use a unique username/email pair or verify your original account.";
                }

                if (existingByUsername != null && existingByUsername.IsVerified)
                {
                    await transaction.RollbackAsync();
                    return "Username already taken";
                }

                if (existingByEmail != null && existingByEmail.IsVerified)
                {
                    await transaction.RollbackAsync();
                    return "Email already taken";
                }

                if (existingByUsername != null)
                {
                    existingUserId = existingByUsername.Id;
                }
                else if (existingByEmail != null)
                {
                    existingUserId = existingByEmail.Id;
                }

                if (existingUserId.HasValue)
                {
                    if (await AnyOtherUserHasUsernameAsync(connection, transaction, existingUserId.Value, u))
                    {
                        await transaction.RollbackAsync();
                        return "Username already taken";
                    }

                    if (await AnyOtherUserHasEmailAsync(connection, transaction, existingUserId.Value, e))
                    {
                        await transaction.RollbackAsync();
                        return "Email already taken";
                    }

                    await using var updateCommand = new SqlCommand(
                        @"UPDATE [dbo].[User]
                          SET Username = @Username,
                              PasswordHash = @PasswordHash,
                              EmailAddress = @EmailAddress,
                              FirstName = @FirstName,
                              LastName = @LastName
                          WHERE Id = @UserId",
                        connection, transaction);

                    updateCommand.Parameters.Add("@Username", SqlDbType.NVarChar, 255).Value = u;
                    updateCommand.Parameters.Add("@PasswordHash", SqlDbType.VarChar, 512).Value = passwordHash;
                    updateCommand.Parameters.Add("@EmailAddress", SqlDbType.NVarChar, 255).Value = e;
                    updateCommand.Parameters.Add("@FirstName", SqlDbType.NVarChar, 100).Value = fn;
                    updateCommand.Parameters.Add("@LastName", SqlDbType.NVarChar, 100).Value = ln;
                    updateCommand.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = existingUserId.Value;

                    await updateCommand.ExecuteNonQueryAsync();
                }
                else
                {
                    await using var insertCommand = new SqlCommand(
                        @"INSERT INTO [dbo].[User]
                          (Username, PasswordHash, EmailAddress, FirstName, LastName, IsVerified)
                          OUTPUT INSERTED.Id
                          VALUES (@Username, @PasswordHash, @EmailAddress, @FirstName, @LastName, 0);",
                        connection, transaction);

                    insertCommand.Parameters.Add("@Username", SqlDbType.NVarChar, 255).Value = u;
                    insertCommand.Parameters.Add("@PasswordHash", SqlDbType.VarChar, 512).Value = passwordHash;
                    insertCommand.Parameters.Add("@EmailAddress", SqlDbType.NVarChar, 255).Value = e;
                    insertCommand.Parameters.Add("@FirstName", SqlDbType.NVarChar, 100).Value = fn;
                    insertCommand.Parameters.Add("@LastName", SqlDbType.NVarChar, 100).Value = ln;

                    var userIdObj = await insertCommand.ExecuteScalarAsync();
                    if (userIdObj == null || userIdObj == DBNull.Value)
                    {
                        await transaction.RollbackAsync();
                        return "Failed to create user";
                    }

                    existingUserId = (Guid)userIdObj;
                }

                await using var verifyCommand = new SqlCommand(
                    @"MERGE [dbo].[UserVerification] AS target
                      USING (VALUES (@UserId, @Code, @Expires)) AS source (UserId, VerificationCode, ExpirationTime)
                      ON target.UserId = source.UserId
                      WHEN MATCHED THEN
                          UPDATE SET VerificationCode = source.VerificationCode, ExpirationTime = source.ExpirationTime
                      WHEN NOT MATCHED THEN
                          INSERT (UserId, VerificationCode, ExpirationTime)
                          VALUES (source.UserId, source.VerificationCode, source.ExpirationTime);",
                    connection, transaction);

                verifyCommand.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = existingUserId.Value;
                verifyCommand.Parameters.Add("@Code", SqlDbType.Char, 4).Value = code;
                verifyCommand.Parameters.Add("@Expires", SqlDbType.DateTime).Value = expires;

                await verifyCommand.ExecuteNonQueryAsync();

                await transaction.CommitAsync();

                try
                {
                    await _emailService.SendVerificationCodeAsync(e, code);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"Email send failed: {ex.Message}");
                }

                return null;
            }
            catch (SqlException ex) when (IsUniqueViolation(ex))
            {
                await transaction.RollbackAsync();
                return "Username or email already taken";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Console.Error.WriteLine($"CreateUserAsync failed: {ex}");
                return "Server error during signup";
            }
        }

        public async Task<UserAccount?> GetUserByEmailOrUsernameAsync(string emailOrUsername)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var command = new SqlCommand(
                "SELECT * FROM [dbo].[User] WHERE Username = @Value OR EmailAddress = @Value",
                connection);

            command.Parameters.Add("@Value", SqlDbType.NVarChar, 255).Value = emailOrUsername.Trim();

            await using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            return new UserAccount
            {
                Id = reader.GetGuid("Id"),
                Username = reader.GetString("Username"),
                PasswordHash = reader.GetString("PasswordHash"),
                EmailAddress = reader.GetString("EmailAddress"),
                IsVerified = reader.GetBoolean("IsVerified"),
                FirstName = reader.GetString("FirstName"),
                LastName = reader.GetString("LastName"),
                BioText = reader.IsDBNull("BioText") ? null : reader.GetString("BioText")
            };
        }

        private static bool IsUniqueViolation(SqlException ex)
            => ex.Number == 2627 || ex.Number == 2601;

        private async Task<bool> AnyOtherUserHasUsernameAsync(SqlConnection connection, SqlTransaction transaction, Guid userId, string username)
        {
            await using var command = new SqlCommand(
                @"SELECT COUNT(1)
                  FROM [dbo].[User]
                  WHERE Username = @Username AND Id <> @UserId",
                connection, transaction);

            command.Parameters.Add("@Username", SqlDbType.NVarChar, 255).Value = username.Trim();
            command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;

            var count = (int)await command.ExecuteScalarAsync();
            return count > 0;
        }

        private async Task<bool> AnyOtherUserHasEmailAsync(SqlConnection connection, SqlTransaction transaction, Guid userId, string email)
        {
            await using var command = new SqlCommand(
                @"SELECT COUNT(1)
                  FROM [dbo].[User]
                  WHERE EmailAddress = @Email AND Id <> @UserId",
                connection, transaction);

            command.Parameters.Add("@Email", SqlDbType.NVarChar, 255).Value = email.Trim();
            command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;

            var count = (int)await command.ExecuteScalarAsync();
            return count > 0;
        }

        private async Task<UserAccount?> GetUserByUsernameAsync(SqlConnection connection, SqlTransaction transaction, string username)
        {
            await using var command = new SqlCommand(
                "SELECT * FROM [dbo].[User] WHERE Username = @Username",
                connection, transaction);

            command.Parameters.Add("@Username", SqlDbType.NVarChar, 255).Value = username.Trim();

            await using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            return new UserAccount
            {
                Id = reader.GetGuid("Id"),
                Username = reader.GetString("Username"),
                PasswordHash = reader.GetString("PasswordHash"),
                EmailAddress = reader.GetString("EmailAddress"),
                IsVerified = reader.GetBoolean("IsVerified"),
                FirstName = reader.GetString("FirstName"),
                LastName = reader.GetString("LastName"),
                BioText = reader.IsDBNull("BioText") ? null : reader.GetString("BioText")
            };
        }

        private async Task<UserAccount?> GetUserByEmailAsync(SqlConnection connection, SqlTransaction transaction, string email)
        {
            await using var command = new SqlCommand(
                "SELECT * FROM [dbo].[User] WHERE EmailAddress = @Email",
                connection, transaction);

            command.Parameters.Add("@Email", SqlDbType.NVarChar, 255).Value = email.Trim();

            await using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            return new UserAccount
            {
                Id = reader.GetGuid("Id"),
                Username = reader.GetString("Username"),
                PasswordHash = reader.GetString("PasswordHash"),
                EmailAddress = reader.GetString("EmailAddress"),
                IsVerified = reader.GetBoolean("IsVerified"),
                FirstName = reader.GetString("FirstName"),
                LastName = reader.GetString("LastName"),
                BioText = reader.IsDBNull("BioText") ? null : reader.GetString("BioText")
            };
        }

        public async Task<(bool Success, string? Error)> ResetPasswordWithTokenAsync(string tokenHash, string newPassword)
        {
            if (string.IsNullOrWhiteSpace(tokenHash))
                return (false, "Invalid or expired reset token");

            var newPasswordHash = PasswordHasher.HashPassword(newPassword);

            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var tx = connection.BeginTransaction();

            try
            {
                await using var getTokenCmd = new SqlCommand(@"
            SELECT TOP 1 UserId
            FROM [dbo].[PasswordResetToken]
            WHERE TokenHash = @TokenHash
              AND Used = 0
              AND ExpirationTime > GETDATE()
        ", connection, tx);

                getTokenCmd.Parameters.Add("@TokenHash", SqlDbType.NVarChar, 64).Value = tokenHash;

                var userIdObj = await getTokenCmd.ExecuteScalarAsync();
                if (userIdObj == null || userIdObj == DBNull.Value)
                {
                    await tx.RollbackAsync();
                    return (false, "Invalid or expired reset token");
                }

                var userId = (Guid)userIdObj;

                await using var updateUserCmd = new SqlCommand(@"
            UPDATE [dbo].[User]
            SET PasswordHash = @PasswordHash
            WHERE Id = @UserId
        ", connection, tx);

                updateUserCmd.Parameters.Add("@PasswordHash", SqlDbType.VarChar, 512).Value = newPasswordHash;
                updateUserCmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;

                var rows = await updateUserCmd.ExecuteNonQueryAsync();
                if (rows == 0)
                {
                    await tx.RollbackAsync();
                    return (false, "User not found");
                }

                await using var markUsedCmd = new SqlCommand(@"
            UPDATE [dbo].[PasswordResetToken]
            SET Used = 1
            WHERE TokenHash = @TokenHash
        ", connection, tx);

                markUsedCmd.Parameters.Add("@TokenHash", SqlDbType.NVarChar, 64).Value = tokenHash;
                await markUsedCmd.ExecuteNonQueryAsync();

                await tx.CommitAsync();
                return (true, null);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                await tx.RollbackAsync();
                return (false, "Server error while resetting password");
            }
        }

        public async Task<bool> UpdatePasswordHashAsync(Guid userId, string newPasswordHash)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var command = new SqlCommand(@"
        UPDATE [dbo].[User]
        SET PasswordHash = @PasswordHash
        WHERE Id = @UserId
    ", connection);

            command.Parameters.Add("@PasswordHash", SqlDbType.VarChar, 512).Value = newPasswordHash;
            command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;

            var rows = await command.ExecuteNonQueryAsync();
            return rows > 0;
        }

        public async Task<bool> AnyOtherUserHasUsernameAsync(Guid userId, string username)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var command = new SqlCommand(@"
        SELECT COUNT(1)
        FROM [dbo].[User]
        WHERE Username = @Username AND Id <> @UserId
    ", connection);

            command.Parameters.Add("@Username", SqlDbType.NVarChar, 255).Value = username.Trim();
            command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;

            var count = (int)await command.ExecuteScalarAsync();
            return count > 0;
        }

        public async Task<bool> AnyOtherUserHasEmailAsync(Guid userId, string email)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var command = new SqlCommand(@"
        SELECT COUNT(1)
        FROM [dbo].[User]
        WHERE EmailAddress = @Email AND Id <> @UserId
    ", connection);

            command.Parameters.Add("@Email", SqlDbType.NVarChar, 255).Value = email.Trim();
            command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;

            var count = (int)await command.ExecuteScalarAsync();
            return count > 0;
        }

        public async Task<bool> UpdateProfileAsync(Guid userId, string firstName, string lastName, string email, string username, string? bio)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var command = new SqlCommand(@"
        UPDATE [dbo].[User]
        SET FirstName = @FirstName,
            LastName = @LastName,
            EmailAddress = @Email,
            Username = @Username,
            BioText = @Bio
        WHERE Id = @UserId
    ", connection);

            command.Parameters.Add("@FirstName", SqlDbType.NVarChar, 100).Value = firstName.Trim();
            command.Parameters.Add("@LastName", SqlDbType.NVarChar, 100).Value = lastName.Trim();
            command.Parameters.Add("@Email", SqlDbType.NVarChar, 255).Value = email.Trim();
            command.Parameters.Add("@Username", SqlDbType.NVarChar, 255).Value = username.Trim();
            command.Parameters.Add("@Bio", SqlDbType.NVarChar).Value = (object?)bio?.Trim() ?? DBNull.Value;
            command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;

            var rows = await command.ExecuteNonQueryAsync();
            return rows > 0;
        }

        public async Task UpsertUserProfilePhotoAsync(Guid userId, string contentType, byte[] fileContents)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var tx = await connection.BeginTransactionAsync();

            try
            {
                var existingFileIds = new List<Guid>();

                await using (var findCmd = new SqlCommand(@"
            SELECT FileId
            FROM dbo.UserProfileFile
            WHERE UserId = @UserId
        ", connection, (SqlTransaction)tx))
                {
                    findCmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;

                    await using var reader = await findCmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        existingFileIds.Add(reader.GetGuid(0));
                    }
                }

                foreach (var fileId in existingFileIds)
                {
                    await using var deleteFileCmd = new SqlCommand(@"
                DELETE FROM dbo.[File]
                WHERE Id = @FileId
            ", connection, (SqlTransaction)tx);

                    deleteFileCmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
                    await deleteFileCmd.ExecuteNonQueryAsync();
                }

                var newFileId = Guid.NewGuid();

                await using (var insertFileCmd = new SqlCommand(@"
            INSERT INTO dbo.[File] (Id, ContentType, FileContents)
            VALUES (@Id, @ContentType, @FileContents)
        ", connection, (SqlTransaction)tx))
                {
                    insertFileCmd.Parameters.Add("@Id", SqlDbType.UniqueIdentifier).Value = newFileId;
                    insertFileCmd.Parameters.Add("@ContentType", SqlDbType.VarChar, 50).Value = contentType;
                    insertFileCmd.Parameters.Add("@FileContents", SqlDbType.VarBinary, -1).Value = fileContents;

                    await insertFileCmd.ExecuteNonQueryAsync();
                }

                await using (var insertMapCmd = new SqlCommand(@"
            INSERT INTO dbo.UserProfileFile (UserId, FileId)
            VALUES (@UserId, @FileId)
        ", connection, (SqlTransaction)tx))
                {
                    insertMapCmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                    insertMapCmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = newFileId;

                    await insertMapCmd.ExecuteNonQueryAsync();
                }

                await tx.CommitAsync();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<StoredFile?> GetUserProfilePhotoAsync(Guid userId)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var command = new SqlCommand(@"
        SELECT TOP 1 f.Id, f.ContentType, f.FileContents, f.CreatedAt
        FROM dbo.UserProfileFile upf
        INNER JOIN dbo.[File] f ON f.Id = upf.FileId
        WHERE upf.UserId = @UserId
        ORDER BY f.CreatedAt DESC
    ", connection);

            command.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;

            await using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;

            return new StoredFile
            {
                Id = reader.GetGuid(0),
                ContentType = reader.GetString(1),
                FileContents = (byte[])reader["FileContents"],
                CreatedAt = reader.GetFieldValue<DateTimeOffset>(3)
            };
        }

    }
}