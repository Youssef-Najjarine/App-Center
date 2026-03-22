using Oap.WebApp.DTOs.ApplicationHistory;

namespace Oap.WebApp.Interfaces
{
    public interface IApplicationHistory
    {
        Task<List<SaleHistoryCardDto>> GetMySalesAsync(Guid sellerUserId, string? sort, string? query, string? period);
        Task<SalesSummaryDto> GetSalesSummaryAsync(Guid sellerUserId, string? period);
        Task<(bool success, string? error)> GiveRefundAsync(Guid sellerUserId, Guid transactionId);
    }
}