using System.Text.RegularExpressions;
using WebApp.DTOs;

namespace WebApp.Utilities
{
    public static class EditProfileValidator
    {
        private static readonly Regex EmailRegex = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);
        private static readonly Regex UsernameRegex = new(@"^[a-zA-Z0-9._-]{3,15}$", RegexOptions.Compiled);

        public static Dictionary<string, string> Validate(UpdateProfileRequest request)
        {
            var errors = new Dictionary<string, string>();

            if (string.IsNullOrWhiteSpace(request.FirstName))
                errors["firstName"] = "Field Missing";

            if (string.IsNullOrWhiteSpace(request.LastName))
                errors["lastName"] = "Field Missing";

            if (string.IsNullOrWhiteSpace(request.Email))
                errors["email"] = "Field Missing";
            else if (!EmailRegex.IsMatch(request.Email.Trim()))
                errors["email"] = "Invalid email";

            if (string.IsNullOrWhiteSpace(request.Username))
                errors["username"] = "Field Missing";
            else if (!UsernameRegex.IsMatch(request.Username.Trim()))
                errors["username"] = "Invalid username";

            return errors;
        }
    }
}
