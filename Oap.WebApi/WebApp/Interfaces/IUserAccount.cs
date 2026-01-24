using WebApp.Models;

namespace WebApp.Interfaces
{
    public interface IUserAccount
    {
        Task<UserAccount?> GetUserByIdAsync(Guid userId);
        Task<String> CreateUserAsync(string username, string password, string email, string firstName, string lastName);
        Task<bool> UsernameExistsAsync(string username);
        Task<bool> EmailExistsAsync(string email);
        Task<UserAccount> GetUserByEmailOrUsernameAsync(string emailOrUsername);
        Task<(bool Success, string? Error)> ResetPasswordWithTokenAsync(string tokenHash, string newPassword);
        Task<bool> UpdatePasswordHashAsync(Guid userId, string newPasswordHash);
        Task<bool> AnyOtherUserHasUsernameAsync(Guid userId, string username);
        Task<bool> AnyOtherUserHasEmailAsync(Guid userId, string email);
        Task<bool> UpdateProfileAsync(Guid userId, string firstName, string lastName, string email, string username, string? bio);

    }
}