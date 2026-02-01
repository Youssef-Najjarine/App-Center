namespace Oap.WebApp.DTOs
{
    public class CreateUserApplicationRequest
    {
        public string AppName { get; set; } = "";
        public decimal Price { get; set; }
        public List<string> Technologies { get; set; } = new();
        public string Description { get; set; } = "";
        public string? RepoUrl { get; set; }
    }
}
