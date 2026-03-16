using Microsoft.AspNetCore.Mvc;
using Oap.WebApp.DTOs.ApplicationAnalytics;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/analytics")]
    public class ApplicationAnalyticsController : ControllerBase
    {
        private readonly AuthCookieService _authCookieService;
        private readonly IApplicationAnalytics _analyticsService;

        public ApplicationAnalyticsController(AuthCookieService authCookieService, IApplicationAnalytics analyticsService)
        {
            _authCookieService = authCookieService;
            _analyticsService = analyticsService;
        }

        private Guid? GetOptionalUserId()
        {
            var token = Request.Cookies["auth_token"];
            if (string.IsNullOrWhiteSpace(token)) return null;
            try
            {
                var tokenInfo = _authCookieService.ValidateToken(token);
                if (tokenInfo == null || tokenInfo.ExpiresUtc <= DateTime.UtcNow) return null;
                return tokenInfo.UserId;
            }
            catch { return null; }
        }

        [HttpPost("events")]
        public async Task<IActionResult> IngestEvents([FromBody] AnalyticsEventBatch batch)
        {
            if (batch?.Events == null || batch.Events.Count == 0)
                return Ok(new { success = true });

            var viewerUserId = GetOptionalUserId();
            await _analyticsService.IngestEventsAsync(viewerUserId, batch.Events);

            return Ok(new { success = true });
        }

        [HttpPost("bulk-popularity")]
        public async Task<IActionResult> GetBulkPopularity([FromBody] BulkPopularityRequest request)
        {
            if (request?.AppIds == null || request.AppIds.Count == 0)
                return Ok(new { success = true, totals = new Dictionary<string, object>() });

            try
            {
                var totals = await _analyticsService.GetBulkPopularityAsync(request.AppIds);

                var result = totals.ToDictionary(
                    kv => kv.Key.ToString(),
                    kv => new { impressions = kv.Value.impressions, clicks = kv.Value.clicks }
                );

                return Ok(new { success = true, totals = result });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return Ok(new { success = true, totals = new Dictionary<string, object>() });
            }
        }
    }
}