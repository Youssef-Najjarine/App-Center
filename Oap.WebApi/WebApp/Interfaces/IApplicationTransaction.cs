using Oap.WebApp.DTOs.ApplicationTransaction;

namespace Oap.WebApp.Interfaces
{
    public interface IApplicationTransaction
    {
        Task<PurchaseResult> PurchaseAsync(Guid buyerUserId, Guid userApplicationId);
        Task<List<PurchasedAppCardDto>> GetMyPurchasesAsync(Guid buyerUserId, string? sort);
        Task<CheckPurchaseResult> CheckPurchaseStatusAsync(Guid userId, Guid userApplicationId);
        Task<(bool success, string? error)> RequestRefundAsync(Guid buyerUserId, Guid transactionId);
        Task<(bool success, string? error)> ReportIssueAsync(Guid buyerUserId, Guid transactionId);
        Task<(Stream? fileStream, string? fileName, string? error)> GetPurchasedZipAsync(Guid buyerUserId, Guid appId);
    }
}