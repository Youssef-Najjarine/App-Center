using Oap.WebApp.DTOs.ApplicationAnalytics;

namespace Oap.WebApp.Interfaces
{
    public interface IApplicationAnalytics
    {
        Task IngestEventsAsync(Guid? viewerUserId, List<AnalyticsEventItem> events);
        Task<ApplicationChartDataResponse> GetChartDataAsync(Guid ownerUserId, Guid appId, string period);
        Task<Dictionary<Guid, (long impressions, long clicks)>> GetBulkTotalsAsync(Guid ownerUserId);
        Task<Dictionary<Guid, (long impressions, long clicks)>> GetBulkPopularityAsync(List<Guid> appIds);
    }
}