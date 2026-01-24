namespace WebApp.Models
{
    public class UserAccount
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string EmailAddress { get; set; } = string.Empty;
        public bool IsVerified { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? BioText { get; set; }
    }
}