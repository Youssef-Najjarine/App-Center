namespace Oap.WebApp.DTOs.StoreApplication
{
    public class StoreApplicationCardDto
    {
        public Guid UserApplicationId { get; set; }
        public Guid UserApplicationVersionId { get; set; }
        public Guid OwnerUserId { get; set; }
        public string OwnerDisplayName { get; set; } = "";
        public string Name { get; set; } = "";
        public decimal? Price { get; set; }
        public string? Description { get; set; }
        public string? RepositoryUrl { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public int DefaultPresentationFileCategory { get; set; }
        public string DefaultPresentationContentType { get; set; } = "";
        public string DefaultPresentationUrl { get; set; } = "";
        public string DefaultPresentationThumbnailUrl { get; set; } = "";
        public bool IsVideo { get; set; }
        public List<string> Technologies { get; set; } = new();
    }

    public class StoreApplicationDetailsDto
    {
        public Guid UserApplicationId { get; set; }
        public Guid UserApplicationVersionId { get; set; }
        public Guid OwnerUserId { get; set; }
        public string OwnerDisplayName { get; set; } = "";
        public string Name { get; set; } = "";
        public decimal? Price { get; set; }
        public string? Description { get; set; }
        public string? RepositoryUrl { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public List<string> Technologies { get; set; } = new();
        public List<StoreApplicationFileDto> Files { get; set; } = new();
    }

    public class StoreApplicationFileDto
    {
        public Guid FileId { get; set; }
        public int FileCategory { get; set; }
        public int OrderIndex { get; set; }
        public string ContentType { get; set; } = "";
        public string Url { get; set; } = "";
    }
}