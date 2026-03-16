using Microsoft.AspNetCore.Mvc;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/app-management")]
    public class ApplicationManagementController : ControllerBase
    {
        private readonly AuthCookieService _authCookieService;
        private readonly IApplicationManagement _managementService;
        private readonly IApplicationAnalytics _analyticsService;

        public ApplicationManagementController(
            AuthCookieService authCookieService,
            IApplicationManagement managementService,
            IApplicationAnalytics analyticsService)
        {
            _authCookieService = authCookieService;
            _managementService = managementService;
            _analyticsService = analyticsService;
        }

        private UserTokenInfo? GetAuthedUser()
        {
            var token = Request.Cookies["auth_token"];
            if (string.IsNullOrWhiteSpace(token)) return null;
            try
            {
                var tokenInfo = _authCookieService.ValidateToken(token);
                if (tokenInfo == null || tokenInfo.ExpiresUtc <= DateTime.UtcNow) return null;
                return tokenInfo;
            }
            catch { return null; }
        }

        [HttpGet("cards")]
        public async Task<IActionResult> GetManagementCards()
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null) return Unauthorized(new { error = "Not authenticated" });

                var cards = await _managementService.GetManagementCardsAsync(tokenInfo.UserId);
                return Ok(new { success = true, applications = cards });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while loading management data." });
            }
        }

        [HttpGet("chart/{appId:guid}")]
        public async Task<IActionResult> GetChartData(
            [FromRoute] Guid appId,
            [FromQuery] string? period)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null) return Unauthorized(new { error = "Not authenticated" });

                var data = await _analyticsService.GetChartDataAsync(
                    tokenInfo.UserId, appId, period ?? "6m");

                return Ok(new { success = true, chart = data });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error while loading chart data." });
            }
        }
    }
}