namespace Oap.WebApp.DTOs.ApplicationAnalytics
{
    public class AnalyticsEventBatch
    {
        public List<AnalyticsEventItem> Events { get; set; } = new();
    }

    public class AnalyticsEventItem
    {
        public Guid AppId { get; set; }
        public int EventType { get; set; }
        public string? Timestamp { get; set; }
    }

    public class ApplicationChartDataResponse
    {
        public List<ChartDataPoint> DataPoints { get; set; } = new();
        public long TotalImpressions { get; set; }
        public long TotalClicks { get; set; }
    }

    public class ChartDataPoint
    {
        public string Label { get; set; } = "";
        public long Impressions { get; set; }
        public long Clicks { get; set; }
    }

    public class BulkPopularityRequest
    {
        public List<Guid> AppIds { get; set; } = new();
    }

    public class ApplicationManagementCardDto
    {
        public Guid UserApplicationId { get; set; }
        public Guid UserApplicationVersionId { get; set; }
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public string? RepositoryUrl { get; set; }
        public decimal? Price { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public string DefaultPresentationUrl { get; set; } = "";
        public string DefaultPresentationThumbnailUrl { get; set; } = "";
        public int DefaultPresentationFileCategory { get; set; }
        public string DefaultPresentationContentType { get; set; } = "";
        public bool IsVideo { get; set; }
        public List<string> Technologies { get; set; } = new();
        public long TotalImpressions { get; set; }
        public long TotalClicks { get; set; }
    }
}