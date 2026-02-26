using Oap.WebApp.DTOs.UserApplication;
using Oap.WebApp.Models;

namespace Oap.WebApp.Interfaces
{
    public interface IUserApplication
    {
        Task<CreateUserApplicationResult> CreateUserApplicationAsync(Guid ownerUserId, CreateUserApplicationFormRequest request);
        Task<List<UserApplicationCardDto>> GetAllUserApplicationCardsAsync(Guid ownerUserId);
        Task<List<UserApplicationDetailsDto>> GetAllUserApplicationDetailsAsync(Guid ownerUserId);
        Task<UserApplicationDetailsDto?> GetUserApplicationDetailsAsync(Guid ownerUserId, Guid userApplicationId);
        Task<List<string>> GetTechnologiesForVersionAsync(Guid ownerUserId, Guid userApplicationVersionId);

        Task<Dictionary<string, List<string>>> GetBulkTechnologiesAsync(Guid ownerUserId, List<Guid> versionIds);

        Task<StoredFile?> GetFileIfOwnedByUserAsync(Guid ownerUserId, Guid fileId);
    }
}