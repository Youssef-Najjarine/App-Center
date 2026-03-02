namespace Oap.WebApp.Models
{
    public class CreateUserApplicationResult
    {
        public bool Success { get; set; }
        public string? Error { get; set; }
        public Guid UserApplicationId { get; set; }
        public Guid UserApplicationVersionId { get; set; }
        public Guid? ThumbnailFileId { get; set; }
    }
}