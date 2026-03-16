using Oap.WebApp.DTOs.ApplicationAnalytics;

namespace Oap.WebApp.Interfaces
{
    public interface IApplicationManagement
    {
        Task<List<ApplicationManagementCardDto>> GetManagementCardsAsync(Guid ownerUserId);
    }
}