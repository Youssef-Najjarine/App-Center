using Oap.WebApp.Utilities;

namespace Oap.WebApp.Middleware
{
    public class AuthTokenMiddleware
    {
        private readonly RequestDelegate _next;

        public AuthTokenMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(
            HttpContext context,
            AuthCookieService authCookieService,
            IWebHostEnvironment env)
        {
            if (context.Request.Cookies.TryGetValue("auth_token", out var token) &&
                !string.IsNullOrWhiteSpace(token))
            {
                var userInfo = authCookieService.ValidateToken(token);

                if (userInfo != null)
                {
                    context.Items["User"] = userInfo;

                    // Sliding expiration — re-issue cookie
                    var refreshedToken = authCookieService.CreateToken(userInfo);

                    context.Response.Cookies.Append("auth_token", refreshedToken, new CookieOptions
                    {
                        HttpOnly = true,
                        Secure = !env.IsDevelopment(),
                        SameSite = SameSiteMode.Strict,
                        Expires = userInfo.ExpiresUtc
                    });
                }
            }

            await _next(context);
        }
    }
}
