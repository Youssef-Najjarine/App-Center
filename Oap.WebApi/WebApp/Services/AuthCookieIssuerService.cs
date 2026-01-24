using Microsoft.AspNetCore.Http;
using WebApp.Utilities;

namespace WebApp.Services
{
    public class AuthCookieIssuerService
    {
        private readonly AuthCookieService _authCookieService;
        private readonly IWebHostEnvironment _environment;

        public AuthCookieIssuerService(AuthCookieService authCookieService, IWebHostEnvironment environment)
        {
            _authCookieService = authCookieService;
            _environment = environment;
        }

        public void IssueAuthCookie(HttpResponse response, Guid userId, string username)
        {
            var tokenInfo = new UserTokenInfo
            {
                UserId = userId,
                Username = username,
                ExpiresUtc = DateTime.UtcNow.AddDays(30)
            };

            var encryptedToken = _authCookieService.CreateToken(tokenInfo);

            response.Cookies.Append("auth_token", encryptedToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = !_environment.IsDevelopment(),
                SameSite = SameSiteMode.Lax,
                Expires = tokenInfo.ExpiresUtc,
                Path = "/"
            });
        }
    }
}
