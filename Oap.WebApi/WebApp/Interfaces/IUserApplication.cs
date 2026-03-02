using Oap.WebApp.DTOs.UserApplication;
using Oap.WebApp.Models;
using System.IO;
using System.Threading;

namespace Oap.WebApp.Interfaces
{
    public interface IUserApplication
    {
        // ── Existing methods (unchanged) ──────────────────────────────────────
        Task<CreateUserApplicationResult> CreateUserApplicationAsync(Guid ownerUserId, CreateUserApplicationFormRequest request);
        Task<UserApplicationCardDto?> GetCreatedCardAsync(Guid ownerUserId, Guid userApplicationId, Guid userApplicationVersionId);
        Task<List<UserApplicationCardDto>> GetAllUserApplicationCardsAsync(Guid ownerUserId);
        Task<List<UserApplicationCardDto>> SearchUserApplicationCardsAsync(Guid ownerUserId, string? query, string? sort);
        Task<Dictionary<string, List<string>>> GetBulkTechnologiesAsync(Guid ownerUserId, List<Guid> versionIds);
        Task<List<UserApplicationDetailsDto>> GetAllUserApplicationDetailsAsync(Guid ownerUserId);
        Task<UserApplicationDetailsDto?> GetUserApplicationDetailsAsync(Guid ownerUserId, Guid userApplicationId);
        Task<List<string>> GetTechnologiesForVersionAsync(Guid ownerUserId, Guid userApplicationVersionId);

        // ── OLD method — REMOVE this one ─────────────────────────────────────
        // Task<StoredFile?> GetFileIfOwnedByUserAsync(Guid ownerUserId, Guid fileId);
        // (replaced by the two methods below)

        // ── NEW: metadata-only check (no FileContents) ────────────────────────
        /// <summary>
        /// Returns content type and file size for the given file if the user owns it.
        /// Does NOT read FileContents — safe to call for any file size.
        /// </summary>
        Task<FileMetadata?> GetFileMetaIfOwnedAsync(Guid ownerUserId, Guid fileId);

        // ── NEW: streaming range read ─────────────────────────────────────────
        /// <summary>
        /// Streams exactly <paramref name="length"/> bytes starting at
        /// <paramref name="offset"/> from the file into <paramref name="destination"/>.
        /// Uses SequentialAccess so SQL Server streams the data rather than
        /// loading the entire VARBINARY column into RAM.
        /// </summary>
        Task StreamFileRangeAsync(
            Guid ownerUserId,
            Guid fileId,
            long offset,
            long length,
            Stream destination,
            CancellationToken cancellationToken = default);
    }
}