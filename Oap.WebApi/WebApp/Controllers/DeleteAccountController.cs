using Microsoft.AspNetCore.Mvc;
using Oap.WebApp.Models;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/account")]
    public class DeleteAccountController : ControllerBase
    {
        private readonly AuthCookieService _authCookieService;
        private readonly DeleteAccountService _deleteAccountService;
        private readonly IWebHostEnvironment _environment;

        public DeleteAccountController(
            AuthCookieService authCookieService,
            DeleteAccountService deleteAccountService,
            IWebHostEnvironment environment)
        {
            _authCookieService = authCookieService;
            _deleteAccountService = deleteAccountService;
            _environment = environment;
        }

        [HttpPost("delete")]
        public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
        {
            try
            {
                var token = Request.Cookies["auth_token"];
                if (string.IsNullOrWhiteSpace(token))
                    return Unauthorized(new { error = "Not authenticated" });

                UserTokenInfo? tokenInfo;
                try { tokenInfo = _authCookieService.ValidateToken(token); }
                catch { return Unauthorized(new { error = "Invalid auth token" }); }

                if (tokenInfo == null || tokenInfo.ExpiresUtc <= DateTime.UtcNow)
                    return Unauthorized(new { error = "Auth token expired" });

                if (string.IsNullOrWhiteSpace(request.Password))
                    return BadRequest(new { success = false, error = "Password is required." });

                var (success, error) = await _deleteAccountService.DeleteAccountAsync(tokenInfo.UserId, request.Password);

                if (!success)
                    return BadRequest(new { success = false, error });

                Response.Cookies.Delete("auth_token", new CookieOptions
                {
                    HttpOnly = true,
                    Secure = !_environment.IsDevelopment(),
                    SameSite = SameSiteMode.Lax,
                    Path = "/"
                });

                Response.Cookies.Delete("device_id", new CookieOptions
                {
                    HttpOnly = true,
                    Secure = !_environment.IsDevelopment(),
                    SameSite = SameSiteMode.Strict,
                    Path = "/"
                });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while deleting account." });
            }
        }
    }

    public class DeleteAccountRequest
    {
        public string Password { get; set; } = "";
    }
}