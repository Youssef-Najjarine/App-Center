namespace Oap.WebApp.DTOs.ApplicationTransaction
{
    public class PurchaseRequest
    {
        public Guid UserApplicationId { get; set; }
    }

    public class PurchaseResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public Guid TransactionId { get; set; }
    }

    public class PurchasedAppCardDto
    {
        public Guid TransactionId { get; set; }
        public Guid UserApplicationId { get; set; }
        public Guid UserApplicationVersionId { get; set; }
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public string? RepositoryUrl { get; set; }
        public decimal Amount { get; set; }
        public int Status { get; set; }
        public DateTimeOffset PurchasedAt { get; set; }
        public string SellerName { get; set; } = "";
        public string SellerEmail { get; set; } = "";
        public string DefaultPresentationUrl { get; set; } = "";
        public string DefaultPresentationThumbnailUrl { get; set; } = "";
        public int DefaultPresentationFileCategory { get; set; }
        public string DefaultPresentationContentType { get; set; } = "";
        public bool IsVideo { get; set; }
        public string? PresentationFilesJson { get; set; }
    }

    public class CheckPurchaseResult
    {
        public bool AlreadyPurchased { get; set; }
        public bool IsOwnApp { get; set; }
    }
}