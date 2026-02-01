using System.Text.RegularExpressions;
using Oap.WebApp.DTOs;

namespace Oap.WebApp.Utilities
{
    public static class SignUpValidator
    {
        private static readonly Regex EmailRegex = new(@"^[^\s@]+@[^\s@]+\.[^\s@]+$", RegexOptions.Compiled);
        private static readonly Regex UsernameRegex = new(@"^[a-zA-Z0-9._-]{3,15}$", RegexOptions.Compiled);
        private static readonly Regex UppercaseRegex = new(@"[A-Z]", RegexOptions.Compiled);
        private static readonly Regex NumberRegex = new(@"[0-9]", RegexOptions.Compiled);
        private static readonly Regex SpecialCharRegex = new(@"[!@#$%^&*(),.?""':{}|<>]", RegexOptions.Compiled);

        public static Dictionary<string, string> Validate(SignUpRequest request)
        {
            var errors = new Dictionary<string, string>();

            if (string.IsNullOrWhiteSpace(request.FirstName))
                errors["firstName"] = "Field Missing";
            if (string.IsNullOrWhiteSpace(request.LastName))
                errors["lastName"] = "Field Missing";
            if (string.IsNullOrWhiteSpace(request.Username))
                errors["username"] = "Field Missing";
            else if (!UsernameRegex.IsMatch(request.Username.Trim()))
                errors["username"] = "Please use 3-15 characters, only letters, numbers, periods, underscores, or hyphens.";

            if (string.IsNullOrWhiteSpace(request.Email))
                errors["email"] = "Field Missing";
            else if (!EmailRegex.IsMatch(request.Email.Trim()))
                errors["email"] = "Invalid email address";

            var passwordError = ValidatePassword(request.Password);
            if (passwordError != null)
                errors["password"] = passwordError;

            return errors;
        }

        public static string? ValidatePassword(string password)
        {
            if (string.IsNullOrWhiteSpace(password))
                return "Field Missing";

            if (password.Length < 8)
                return "Password must be at least 8 characters long.";
            if (!UppercaseRegex.IsMatch(password))
                return "Password must contain at least one uppercase letter.";
            if (!NumberRegex.IsMatch(password))
                return "Password must contain at least one number.";
            if (!SpecialCharRegex.IsMatch(password))
                return "Password must contain at least one special character.";

            return null; // valid
        }

    }
}