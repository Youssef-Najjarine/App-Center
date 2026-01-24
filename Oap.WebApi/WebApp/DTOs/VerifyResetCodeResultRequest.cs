namespace WebApp.DTOs
{
    public class VerifyResetCodeResultRequest
    {
        public bool Success { get; set; }
        public string? ResetToken { get; set; }
        public string? Error { get; set; }
    }
}
