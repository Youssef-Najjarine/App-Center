using Oap.WebApp.Models;

namespace Oap.WebApp.Interfaces
{
    public interface IUserApplication
    {
        Task<UserApplication> CreateAsync(Guid ownerUserId);
        Task<List<UserApplication>> GetMineAsync(Guid ownerUserId);
    }
}
