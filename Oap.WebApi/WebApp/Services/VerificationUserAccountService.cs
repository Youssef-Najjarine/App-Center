using Microsoft.Data.SqlClient;
using System.Security.Cryptography;
using System.Text;
using Oap.WebApp.DTOs;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Utilities;

namespace Oap.WebApp.Services
{
    public class VerificationUserAccountService : IVerificationUserAccount
    {
        private readonly string _connectionString;
        private readonly EmailService _emailService;

        public VerificationUserAccountService(IConfiguration configuration, EmailService emailService)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
            _emailService = emailService;
        }

        public async Task GenerateAndSendCodeAsync(Guid userId, string email)
        {
            string code = new Random().Next(1000, 9999).ToString("D4");
            DateTime expires = DateTime.Now.AddMinutes(15);

            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var deleteCommand = new SqlCommand(
                "DELETE FROM [dbo].[UserVerification] WHERE UserId = @UserId", connection);
            deleteCommand.Parameters.AddWithValue("@UserId", userId);
            await deleteCommand.ExecuteNonQueryAsync();

            await using var insertCommand = new SqlCommand(
                @"INSERT INTO [dbo].[UserVerification] (UserId, VerificationCode, ExpirationTime)
                  VALUES (@UserId, @Code, @Expires)",
                connection);
            insertCommand.Parameters.AddWithValue("@UserId", userId);
            insertCommand.Parameters.AddWithValue("@Code", code);
            insertCommand.Parameters.AddWithValue("@Expires", expires);
            await insertCommand.ExecuteNonQueryAsync();

            try
            {
                await _emailService.SendVerificationCodeAsync(email, code);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Email send failed: {ex.Message}");
            }
        }

        public async Task<bool> VerifyCodeAsync(string email, string code)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var command = new SqlCommand(
                @"SELECT u.Id 
                  FROM [dbo].[User] u
                  INNER JOIN [dbo].[UserVerification] v ON u.Id = v.UserId
                  WHERE u.EmailAddress = @Email 
                    AND v.VerificationCode = @Code 
                    AND v.ExpirationTime > GETDATE()",
                connection);
            command.Parameters.AddWithValue("@Email", email.Trim());
            command.Parameters.AddWithValue("@Code", code);

            var userIdObj = await command.ExecuteScalarAsync();
            if (userIdObj == null) return false;

            Guid userId = (Guid)userIdObj;

            await using var transaction = connection.BeginTransaction();
            command.Transaction = transaction;

            await using var updateCommand = new SqlCommand(
                "UPDATE [dbo].[User] SET IsVerified = 1 WHERE Id = @UserId", connection, transaction);
            updateCommand.Parameters.AddWithValue("@UserId", userId);
            await updateCommand.ExecuteNonQueryAsync();

            await using var deleteCommand = new SqlCommand(
                "DELETE FROM [dbo].[UserVerification] WHERE UserId = @UserId", connection, transaction);
            deleteCommand.Parameters.AddWithValue("@UserId", userId);
            await deleteCommand.ExecuteNonQueryAsync();

            await transaction.CommitAsync();

            return true;
        }

        public async Task<bool> ResendCodeAsync(string email)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var getUserCommand = new SqlCommand(
                "SELECT Id FROM [dbo].[User] WHERE EmailAddress = @Email AND IsVerified = 0", connection);
            getUserCommand.Parameters.AddWithValue("@Email", email.Trim());

            var userIdObj = await getUserCommand.ExecuteScalarAsync();
            if (userIdObj == null) return false;

            Guid userId = (Guid)userIdObj;

            await GenerateAndSendCodeAsync(userId, email);
            return true;
        }

        public async Task<VerifyResetCodeResultRequest> VerifyResetCodeAsync(string email, string code)
        {
            await using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            await using var getUserIdCmd = new SqlCommand(
                @"SELECT u.Id
                  FROM [dbo].[User] u
                  INNER JOIN [dbo].[UserVerification] v ON u.Id = v.UserId
                  WHERE u.EmailAddress = @Email
                    AND v.VerificationCode = @Code
                    AND v.ExpirationTime > GETDATE()",
                connection);

            getUserIdCmd.Parameters.AddWithValue("@Email", email.Trim());
            getUserIdCmd.Parameters.AddWithValue("@Code", code.Trim());

            var userIdObj = await getUserIdCmd.ExecuteScalarAsync();
            if (userIdObj == null)
            {
                return new VerifyResetCodeResultRequest { Success = false, Error = "Invalid or expired code" };
            }

            var userId = (Guid)userIdObj;

            await using (var deleteVerificationCmd = new SqlCommand(
                "DELETE FROM [dbo].[UserVerification] WHERE UserId = @UserId",
                connection))
            {
                deleteVerificationCmd.Parameters.AddWithValue("@UserId", userId);
                await deleteVerificationCmd.ExecuteNonQueryAsync();
            }

            var resetToken = GenerateResetToken();
            var tokenHash = CryptoUtils.Sha256Hex(resetToken);
            var expires = DateTime.Now.AddMinutes(15);

            await using (var insertTokenCmd = new SqlCommand(
                @"INSERT INTO [dbo].[PasswordResetToken] (Id, UserId, TokenHash, ExpirationTime, Used, CreatedAt)
                  VALUES (NEWID(), @UserId, @TokenHash, @Expires, 0, GETDATE())",
                connection))
            {
                insertTokenCmd.Parameters.AddWithValue("@UserId", userId);
                insertTokenCmd.Parameters.Add("@TokenHash", System.Data.SqlDbType.NVarChar, 64).Value = tokenHash;
                insertTokenCmd.Parameters.AddWithValue("@Expires", expires);
                await insertTokenCmd.ExecuteNonQueryAsync();
            }

            return new VerifyResetCodeResultRequest { Success = true, ResetToken = resetToken };
        }

        private static string GenerateResetToken()
        {
            var bytes = RandomNumberGenerator.GetBytes(32);
            return Convert.ToBase64String(bytes);
        }

    }
}