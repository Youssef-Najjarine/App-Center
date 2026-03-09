namespace Oap.WebApp.DTOs.UserApplication
{
    public class UserApplicationCardDto
    {
        public Guid UserApplicationId { get; set; }
        public Guid UserApplicationVersionId { get; set; }
        public int VersionIndex { get; set; }
        public bool IsDraft { get; set; }
        public string Name { get; set; } = "";
        public decimal? Price { get; set; }
        public string? Description { get; set; }
        public string? RepositoryUrl { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public Guid DefaultPresentationFileId { get; set; }
        public int DefaultPresentationFileCategory { get; set; }
        public string DefaultPresentationContentType { get; set; } = "";
        public string DefaultPresentationUrl { get; set; } = "";
        public string DefaultPresentationThumbnailUrl { get; set; } = "";
        public bool IsVideo { get; set; }
        public List<string> Technologies { get; set; } = new();
    }
    public class UserApplicationDetailsDto
    {
        public Guid UserApplicationId { get; set; }
        public Guid UserApplicationVersionId { get; set; }
        public int VersionIndex { get; set; }
        public bool IsDraft { get; set; }
        public string Name { get; set; } = "";
        public decimal? Price { get; set; }
        public string? Description { get; set; }
        public string? RepositoryUrl { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public List<string> Technologies { get; set; } = new();
        public List<UserApplicationFileDto> Files { get; set; } = new();
        public Guid? DefaultPresentationFileId { get; set; }
        public Guid? ZipFileId { get; set; }
        public string? ZipFileName { get; set; }
    }
    public class UserApplicationFileDto
    {
        public Guid FileId { get; set; }
        public int FileCategory { get; set; }
        public int OrderIndex { get; set; }
        public string ContentType { get; set; } = "";
        public string Url { get; set; } = "";
    }
}