namespace Oap.WebApp.DTOs.UserApplication
{
    public class BulkTechnologiesRequest
    {
        public List<Guid> VersionIds { get; set; } = new();
    }
}