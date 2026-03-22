namespace Oap.WebApp.DTOs.ApplicationHistory
{
    public class SaleHistoryCardDto
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
        public string BuyerName { get; set; } = "";
        public string BuyerEmail { get; set; } = "";
        public string DefaultPresentationUrl { get; set; } = "";
        public string DefaultPresentationThumbnailUrl { get; set; } = "";
        public int DefaultPresentationFileCategory { get; set; }
        public string DefaultPresentationContentType { get; set; } = "";
        public bool IsVideo { get; set; }
    }

    public class SalesSummaryDto
    {
        public decimal TotalRevenue { get; set; }
        public int ApplicationsSold { get; set; }
        public int DisputedApplications { get; set; }
    }
}