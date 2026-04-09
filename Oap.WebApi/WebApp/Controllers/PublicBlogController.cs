using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;
using System.Data;

namespace Oap.WebApp.Controllers
{
    [ApiController]
    [Route("api/blog")]
    public class PublicBlogController : ControllerBase
    {
        private readonly IBlog _blogService;
        private readonly string _connectionString;

        public PublicBlogController(IBlog blogService, IConfiguration configuration)
        {
            _blogService = blogService;
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        [HttpGet("list")]
        public async Task<IActionResult> GetPublicBlogs(
            [FromQuery] string? q,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 6)
        {
            try
            {
                if (page < 1) page = 1;
                if (pageSize < 1 || pageSize > 50) pageSize = 6;

                var blogs = await _blogService.GetPublicBlogsAsync(q?.Trim(), page, pageSize);
                var totalCount = await _blogService.GetPublicBlogCountAsync(q?.Trim());

                return Ok(new
                {
                    success = true,
                    blogs,
                    totalCount,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading blogs." });
            }
        }

        [HttpGet("trending")]
        public async Task<IActionResult> GetTrendingBlogs([FromQuery] int count = 10)
        {
            try
            {
                if (count < 1 || count > 20) count = 10;
                var blogs = await _blogService.GetTrendingBlogsAsync(count);
                return Ok(new { success = true, blogs });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading trending blogs." });
            }
        }

        [HttpGet("featured")]
        public async Task<IActionResult> GetFeaturedBlog()
        {
            try
            {
                var blog = await _blogService.GetFeaturedBlogAsync();
                return Ok(new { success = true, blog });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading featured blog." });
            }
        }

        [HttpGet("detail/{slug}")]
        public async Task<IActionResult> GetBlogBySlug([FromRoute] string slug)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(slug))
                    return BadRequest(new { success = false, error = "Slug is required." });

                var blog = await _blogService.GetPublicBlogBySlugAsync(slug.Trim());
                if (blog == null) return NotFound(new { success = false, error = "Blog not found." });

                return Ok(new { success = true, blog });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading blog." });
            }
        }

        [HttpGet("{slug}/related")]
        public async Task<IActionResult> GetRelatedBlogs([FromRoute] string slug, [FromQuery] int count = 10)
        {
            try
            {
                if (count < 1 || count > 20) count = 10;
                var blogs = await _blogService.GetRelatedBlogsAsync(slug.Trim(), count);
                return Ok(new { success = true, blogs });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500, new { success = false, error = "Server error loading related blogs." });
            }
        }

        [HttpGet("file/{fileId:guid}")]
        public async Task<IActionResult> GetBlogFile([FromRoute] Guid fileId)
        {
            try
            {
                await using var conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                const string verifySql = @"
SELECT TOP 1 1 FROM dbo.BlogFile WHERE FileId = @FileId
UNION ALL
SELECT TOP 1 1 FROM dbo.BlogSection WHERE ImageFileId = @FileId;";

                await using (var cmd = new SqlCommand(verifySql, conn))
                {
                    cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
                    if (await cmd.ExecuteScalarAsync() == null) return NotFound();
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
                        if (!string.IsNullOrEmpty(startStr)) rangeStart = long.Parse(startStr);
                        if (!string.IsNullOrEmpty(endStr)) rangeEnd = long.Parse(endStr);
                        else rangeEnd = Math.Min(rangeStart + (2L * 1024 * 1024) - 1, totalLength - 1);
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

                const string streamSql = "SELECT SUBSTRING(FileContents, @Offset, @Length) FROM dbo.[File] WHERE Id = @FileId;";
                await using var streamCmd = new SqlCommand(streamSql, conn);
                streamCmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
                streamCmd.Parameters.Add("@Offset", SqlDbType.BigInt).Value = rangeStart + 1;
                streamCmd.Parameters.Add("@Length", SqlDbType.BigInt).Value = chunkLength;

                await using var streamReader = await streamCmd.ExecuteReaderAsync(CommandBehavior.SequentialAccess);
                if (await streamReader.ReadAsync())
                {
                    var stream = streamReader.GetStream(0);
                    await stream.CopyToAsync(Response.Body, 81920, HttpContext.RequestAborted);
                }

                return new EmptyResult();
            }
            catch (OperationCanceledException) { return new EmptyResult(); }
            catch (SqlException ex) when (SqlExceptionHelper.IsCancellation(ex)) { return new EmptyResult(); }
            catch (Exception ex)
            {
                Console.Error.WriteLine(ex);
                return StatusCode(500);
            }
        }
    }
}