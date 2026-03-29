using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Oap.WebApp.DTOs.ApplicationTransaction;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Models;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;
using System.Data;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/transaction")]
    public class ApplicationTransactionController : ControllerBase
    {
        private readonly AuthCookieService _authCookieService;
        private readonly IApplicationTransaction _transactionService;
        private readonly string _connectionString;

        public ApplicationTransactionController(
            AuthCookieService authCookieService,
            IApplicationTransaction transactionService,
            IConfiguration configuration)
        {
            _authCookieService = authCookieService;
            _transactionService = transactionService;
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
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

                Response.Headers["Content-Disposition"] = $"attachment; filename=\"{fileName}\"";
                return File(fileStream, "application/zip");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error during download." });
            }
        }

        [HttpGet("file/{fileId:guid}")]
        public async Task<IActionResult> GetTransactionFile([FromRoute] Guid fileId)
        {
            try
            {
                var tokenInfo = GetAuthedUser();
                if (tokenInfo == null) return Unauthorized(new { error = "Not authenticated" });

                var userId = tokenInfo.UserId;

                await using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                const string verifySql = @"
SELECT TOP 1 1 FROM dbo.ApplicationTransaction
WHERE (BuyerUserId = @UserId OR SellerUserId = @UserId)
  AND (ZipFileId = @FileId
    OR PresentationFileId = @FileId
    OR ThumbnailFileId = @FileId
    OR PresentationFilesJson LIKE '%' + CONVERT(NVARCHAR(36), @FileId) + '%');";

                await using (var cmd = new SqlCommand(verifySql, conn))
                {
                    cmd.Parameters.Add("@UserId", SqlDbType.UniqueIdentifier).Value = userId;
                    cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
                    if (await cmd.ExecuteScalarAsync() == null)
                        return NotFound();
                }

                const string metaSql = "SELECT ContentType, DATALENGTH(FileContents) AS FileSize FROM dbo.[File] WHERE Id = @FileId;";
                string contentType;
                long totalLength;

                await using (var cmd = new SqlCommand(metaSql, conn))
                {
                    cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
                    await using var reader = await cmd.ExecuteReaderAsync();
                    if (!await reader.ReadAsync()) return NotFound();
                    contentType = reader.GetString(0);
                    totalLength = reader.GetInt64(1);
                }

                Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
                Response.Headers["ETag"] = $"\"{fileId}\"";
                Response.Headers["Accept-Ranges"] = "bytes";

                var ifNoneMatch = Request.Headers["If-None-Match"].ToString();
                if (!string.IsNullOrEmpty(ifNoneMatch) && ifNoneMatch.Contains($"\"{fileId}\""))
                    return StatusCode(304);

                long rangeStart = 0;
                long rangeEnd = totalLength - 1;
                bool isRangeRequest = false;

                var rangeHeader = Request.Headers["Range"].ToString();
                if (!string.IsNullOrEmpty(rangeHeader) && rangeHeader.StartsWith("bytes="))
                {
                    var rangePart = rangeHeader.Substring(6);
                    var dashIdx = rangePart.IndexOf('-');
                    if (dashIdx >= 0)
                    {
                        var startStr = rangePart.Substring(0, dashIdx).Trim();
                        var endStr = rangePart.Substring(dashIdx + 1).Trim();

                        if (!string.IsNullOrEmpty(startStr))
                            rangeStart = long.Parse(startStr);

                        if (!string.IsNullOrEmpty(endStr))
                            rangeEnd = long.Parse(endStr);
                        else
                            rangeEnd = Math.Min(rangeStart + (2L * 1024 * 1024) - 1, totalLength - 1);

                        rangeEnd = Math.Min(rangeEnd, totalLength - 1);
                        isRangeRequest = true;
                    }
                }

                var chunkLength = rangeEnd - rangeStart + 1;

                if (isRangeRequest)
                {
                    Response.StatusCode = 206;
                    Response.Headers["Content-Range"] = $"bytes {rangeStart}-{rangeEnd}/{totalLength}";
                    Response.Headers["Content-Length"] = chunkLength.ToString();
                    Response.ContentType = contentType;
                }
                else
                {
                    Response.StatusCode = 200;
                    Response.Headers["Content-Length"] = totalLength.ToString();
                    Response.ContentType = contentType;
                }

                const string streamSql = @"
SELECT SUBSTRING(FileContents, @Offset, @Length)
FROM dbo.[File] WHERE Id = @FileId;";

                await using var streamCmd = new SqlCommand(streamSql, conn);
                streamCmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
                streamCmd.Parameters.Add("@Offset", SqlDbType.BigInt).Value = rangeStart + 1;
                streamCmd.Parameters.Add("@Length", SqlDbType.BigInt).Value = chunkLength;

                await using var streamReader = await streamCmd.ExecuteReaderAsync(System.Data.CommandBehavior.SequentialAccess);
                if (await streamReader.ReadAsync())
                {
                    var stream = streamReader.GetStream(0);
                    await stream.CopyToAsync(Response.Body, 81920, HttpContext.RequestAborted);
                }

                return new EmptyResult();
            }
            catch (OperationCanceledException)
            {
                return new EmptyResult();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500);
            }
        }
    }
}