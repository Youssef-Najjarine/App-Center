namespace Oap.WebApp.Models
{
    public class AdminTokenInfo
    {
        public Guid AdminId { get; set; }
        public string Username { get; set; } = "";
        public string DisplayName { get; set; } = "";
        public DateTime ExpiresUtc { get; set; }
    }
}