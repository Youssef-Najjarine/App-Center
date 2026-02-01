using Microsoft.AspNetCore.Mvc;
using Oap.WebApp.DTOs;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/user-application")]
    public class UserApplicationController : ControllerBase
    {
        private readonly AuthCookieService _authCookieService;
        private readonly IUserApplication _userApps;

        public UserApplicationController(AuthCookieService authCookieService, IUserApplication userApps)
        {
            _authCookieService = authCookieService;
            _userApps = userApps;
        }

        [HttpPost("create-user-application")]
        public async Task<IActionResult> CreateUserApplication([FromBody] CreateUserApplicationRequest request)
        {
            try
            {
                var token = Request.Cookies["auth_token"];
                if (string.IsNullOrWhiteSpace(token))
                    return Unauthorized(new { error = "Not authenticated" });

                UserTokenInfo? tokenInfo;
                try
                {
                    tokenInfo = _authCookieService.ValidateToken(token);
                }
                catch
                {
                    return Unauthorized(new { error = "Invalid auth token" });
                }

                if (tokenInfo == null || tokenInfo.ExpiresUtc <= DateTime.UtcNow)
                    return Unauthorized(new { error = "Auth token expired" });

                var created = await _userApps.CreateAsync(tokenInfo.UserId);

                return Ok(new
                {
                    success = true,
                    application = new
                    {
                        id = created.Id,
                        ownerUserId = created.OwnerUserId
                    }
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { error = "Server error while creating application." });
            }
        }

        [HttpGet("user-application-details")]
        public async Task<IActionResult> UserApplicationDetails()
        {
            try
            {
                var token = Request.Cookies["auth_token"];
                if (string.IsNullOrWhiteSpace(token))
                    return Unauthorized(new { error = "Not authenticated" });

                UserTokenInfo? tokenInfo;
                try
                {
                    tokenInfo = _authCookieService.ValidateToken(token);
                }
                catch
                {
                    return Unauthorized(new { error = "Invalid auth token" });
                }

                if (tokenInfo == null || tokenInfo.ExpiresUtc <= DateTime.UtcNow)
                    return Unauthorized(new { error = "Auth token expired" });

                var apps = await _userApps.GetMineAsync(tokenInfo.UserId);

                return Ok(new
                {
                    success = true,
                    applications = apps.Select(a => new { id = a.Id, ownerUserId = a.OwnerUserId })
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { error = "Server error while loading applications." });
            }
        }
    }
}
