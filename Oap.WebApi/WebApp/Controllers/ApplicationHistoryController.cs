using Microsoft.AspNetCore.Mvc;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/app-history")]
    public class ApplicationHistoryController : ControllerBase
    {
        private readonly AuthCookieService _authCookieService;
        private readonly IApplicationHistory _historyService;

        public ApplicationHistoryController(
            AuthCookieService authCookieService,
            IApplicationHistory historyService)
        {
            _authCookieService = authCookieService;
            _historyService = historyService;
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

        [HttpGet("my-sales")]
        public async Task<IActionResult> GetMySales(
            [FromQuery] string? sort,
            [FromQuery] string? q,
            [FromQuery] string? period)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null) return Unauthorized(new { error = "Not authenticated" });

                var items = await _historyService.GetMySalesAsync(
                    tokenInfo.UserId, sort?.Trim(), q?.Trim(), period?.Trim());
                return Ok(new { success = true, sales = items });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading sales history." });
            }
        }

        [HttpGet("sales-summary")]
        public async Task<IActionResult> GetSalesSummary([FromQuery] string? period)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null) return Unauthorized(new { error = "Not authenticated" });

                var summary = await _historyService.GetSalesSummaryAsync(tokenInfo.UserId, period?.Trim());
                return Ok(new { success = true, summary });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading sales summary." });
            }
        }

        [HttpPost("give-refund/{transactionId:guid}")]
        public async Task<IActionResult> GiveRefund([FromRoute] Guid transactionId)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null) return Unauthorized(new { error = "Not authenticated" });

                var (success, error) = await _historyService.GiveRefundAsync(tokenInfo.UserId, transactionId);
                if (!success)
                    return BadRequest(new { success = false, error });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error processing refund." });
            }
        }
    }
}