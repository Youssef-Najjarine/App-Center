namespace Oap.WebApp.DTOs
{
    public class CreateNewPasswordRequest
    {
        public string ResetToken { get; set; } = "";
        public string NewPassword { get; set; } = "";
    }
}
