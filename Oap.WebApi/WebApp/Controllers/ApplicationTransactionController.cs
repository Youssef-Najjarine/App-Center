using Microsoft.AspNetCore.Mvc;
using Oap.WebApp.DTOs.ApplicationTransaction;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/transaction")]
    public class ApplicationTransactionController : ControllerBase
    {
        private readonly AuthCookieService _authCookieService;
        private readonly IApplicationTransaction _transactionService;

        public ApplicationTransactionController(
            AuthCookieService authCookieService,
            IApplicationTransaction transactionService)
        {
            _authCookieService = authCookieService;
            _transactionService = transactionService;
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

        /// <summary>
        /// Purchase an application. Records transaction with the listed price (mock — no real payment).
        /// </summary>
        [HttpPost("purchase")]
        public async Task<IActionResult> Purchase([FromBody] PurchaseRequest request)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null) return Unauthorized(new { error = "Not authenticated" });

                var result = await _transactionService.PurchaseAsync(tokenInfo.UserId, request.UserApplicationId);
                if (!result.Success)
                    return BadRequest(new { success = false, error = result.Error });

                return Ok(new { success = true, transactionId = result.TransactionId });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error during purchase." });
            }
        }

        /// <summary>
        /// Get all purchases for the current user. Supports sort param: Latest, A-Z, Z-A, Popular.
        /// </summary>
        [HttpGet("my-purchases")]
        public async Task<IActionResult> GetMyPurchases([FromQuery] string? sort)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null) return Unauthorized(new { error = "Not authenticated" });

                var items = await _transactionService.GetMyPurchasesAsync(tokenInfo.UserId, sort ?? "Latest");
                return Ok(new { success = true, purchases = items });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading purchases." });
            }
        }

        /// <summary>
        /// Check if the current user owns or has already purchased a specific app.
        /// Used by the Store detail modal to show the correct button state.
        /// </summary>
        [HttpGet("check-status/{appId:guid}")]
        public async Task<IActionResult> CheckPurchaseStatus([FromRoute] Guid appId)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null)
                    return Ok(new { success = true, isOwnApp = false, alreadyPurchased = false });

                var result = await _transactionService.CheckPurchaseStatusAsync(tokenInfo.UserId, appId);
                return Ok(new
                {
                    success = true,
                    isOwnApp = result.IsOwnApp,
                    alreadyPurchased = result.AlreadyPurchased,
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return Ok(new { success = true, isOwnApp = false, alreadyPurchased = false });
            }
        }

        /// <summary>
        /// Request a refund for a purchase.
        /// </summary>
        [HttpPost("request-refund/{transactionId:guid}")]
        public async Task<IActionResult> RequestRefund([FromRoute] Guid transactionId)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null) return Unauthorized(new { error = "Not authenticated" });

                var (success, error) = await _transactionService.RequestRefundAsync(tokenInfo.UserId, transactionId);
                if (!success)
                    return BadRequest(new { success = false, error });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error processing refund request." });
            }
        }

        /// <summary>
        /// Report an issue with a purchase.
        /// </summary>
        [HttpPost("report-issue/{transactionId:guid}")]
        public async Task<IActionResult> ReportIssue([FromRoute] Guid transactionId)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null) return Unauthorized(new { error = "Not authenticated" });

                var (success, error) = await _transactionService.ReportIssueAsync(tokenInfo.UserId, transactionId);
                if (!success)
                    return BadRequest(new { success = false, error });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error reporting issue." });
            }
        }

        /// <summary>
        /// Download the ZIP file for a purchased app. Verifies the buyer owns the purchase.
        /// </summary>
        [HttpGet("download/{appId:guid}")]
        public async Task<IActionResult> DownloadPurchasedApp([FromRoute] Guid appId)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null) return Unauthorized(new { error = "Not authenticated" });

                var (fileStream, fileName, error) = await _transactionService.GetPurchasedZipAsync(tokenInfo.UserId, appId);
                if (fileStream == null)
                    return NotFound(new { success = false, error = error ?? "File not found." });

                // Set a clean, simple Content-Disposition header (no UTF-8 encoding prefix)
                Response.Headers["Content-Disposition"] = $"attachment; filename=\"{fileName}\"";
                return File(fileStream, "application/zip");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error during download." });
            }
        }
    }
}