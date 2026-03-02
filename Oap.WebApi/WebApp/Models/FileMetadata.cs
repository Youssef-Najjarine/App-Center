namespace Oap.WebApp.Models
{
    public class FileMetadata
    {
        public Guid Id { get; set; }
        public string ContentType { get; set; } = "";
        public long FileSize { get; set; }
    }
}