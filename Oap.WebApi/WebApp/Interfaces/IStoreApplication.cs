using Oap.WebApp.DTOs.StoreApplication;
using Oap.WebApp.Models;

namespace Oap.WebApp.Interfaces
{
    public interface IStoreApplication
    {
        Task<List<StoreApplicationCardDto>> GetAllStoreCardsAsync();
        Task<Dictionary<string, List<string>>> GetStoreBulkTechnologiesAsync(List<Guid> versionIds);
        Task<StoreApplicationDetailsDto?> GetStoreApplicationDetailsAsync(Guid userApplicationId);
        Task<List<StoreApplicationCardDto>> SearchStoreCardsAsync(string? query, string? sort);
        Task<FileMetadata?> GetPublicFileMetaAsync(Guid fileId);
        Task StreamPublicFileRangeAsync(Guid fileId, long offset, long length, Stream destination, CancellationToken cancellationToken = default);
    }
}