using Oap.WebApp.DTOs.UserApplication;
using Oap.WebApp.Models;

namespace Oap.WebApp.Interfaces
{
    public interface IProfileApplication
    {
        Task<CreateUserApplicationResult> CreateUserApplicationAsync(Guid ownerUserId, CreateUserApplicationFormRequest request);

        Task<CreateUserApplicationResult> UpdateUserApplicationAsync(Guid ownerUserId, Guid userApplicationId, UpdateUserApplicationFormRequest request);
        Task<bool> HasZipFileAsync(Guid ownerUserId, Guid userApplicationId);

        Task<bool> DeleteUserApplicationAsync(Guid ownerUserId, Guid userApplicationId);

        Task<UserApplicationCardDto?> GetCreatedCardAsync(Guid ownerUserId, Guid userApplicationId, Guid userApplicationVersionId);
        Task<List<UserApplicationCardDto>> GetAllUserApplicationCardsAsync(Guid ownerUserId);
        Task<List<UserApplicationDetailsDto>> GetAllUserApplicationDetailsAsync(Guid ownerUserId);
        Task<UserApplicationDetailsDto?> GetUserApplicationDetailsAsync(Guid ownerUserId, Guid userApplicationId);
        Task<List<UserApplicationCardDto>> SearchUserApplicationCardsAsync(Guid ownerUserId, string? query, string? sort);
        Task<List<string>> GetTechnologiesForVersionAsync(Guid ownerUserId, Guid userApplicationVersionId);
        Task<Dictionary<string, List<string>>> GetBulkTechnologiesAsync(Guid ownerUserId, List<Guid> versionIds);

        Task<FileMetadata?> GetFileMetaIfOwnedAsync(Guid ownerUserId, Guid fileId);
        Task StreamFileRangeAsync(Guid ownerUserId, Guid fileId, long offset, long length, Stream destination, CancellationToken cancellationToken = default);
    }
}