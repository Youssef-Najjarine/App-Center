namespace Oap.WebApp.Models
{
    public class StoredFile
    {
        public Guid Id { get; set; }
        public string ContentType { get; set; } = "";
        public byte[] FileContents { get; set; } = Array.Empty<byte>();
        public DateTimeOffset CreatedAt { get; set; }
    }
}
