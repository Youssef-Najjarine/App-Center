using Microsoft.Data.SqlClient;
using Oap.WebApp.DTOs.Blog;
using Oap.WebApp.Interfaces;
using System.Data;
using System.Text.RegularExpressions;

namespace Oap.WebApp.Services
{
    public class BlogService : IBlog
    {
        private readonly string _connectionString;

        public BlogService(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }

        private static string GenerateSlug(string title)
        {
            var slug = title.ToLowerInvariant().Trim();
            slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
            slug = Regex.Replace(slug, @"\s+", "-");
            slug = Regex.Replace(slug, @"-{2,}", "-").Trim('-');
            if (slug.Length > 200) slug = slug[..200].TrimEnd('-');
            return slug;
        }

        private static async Task<Guid> SaveFileAsync(SqlConnection conn, SqlTransaction tx, IFormFile file)
        {
            var fileId = Guid.NewGuid();
            await using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var bytes = ms.ToArray();

            const string sql = "INSERT INTO dbo.[File] (Id, ContentType, FileContents) VALUES (@Id, @ContentType, @FileContents);";
            await using var cmd = new SqlCommand(sql, conn, tx);
            cmd.Parameters.Add("@Id", SqlDbType.UniqueIdentifier).Value = fileId;
            cmd.Parameters.Add("@ContentType", SqlDbType.VarChar, 50).Value = file.ContentType ?? "application/octet-stream";
            cmd.Parameters.Add("@FileContents", SqlDbType.VarBinary, -1).Value = bytes;
            await cmd.ExecuteNonQueryAsync();

            return fileId;
        }

        private static async Task DeleteFileIfOrphanedAsync(SqlConnection conn, SqlTransaction tx, Guid fileId)
        {
            const string sql = @"
DELETE FROM dbo.[File] WHERE Id = @FileId
AND NOT EXISTS (SELECT 1 FROM dbo.BlogFile WHERE FileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.BlogSection WHERE ImageFileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.UserApplicationVersionFile WHERE FileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.UserProfileFile WHERE FileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.ApplicationTransaction WHERE ZipFileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.ApplicationTransaction WHERE PresentationFileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.ApplicationTransaction WHERE ThumbnailFileId = @FileId)
AND NOT EXISTS (SELECT 1 FROM dbo.ApplicationTransaction WHERE PresentationFilesJson LIKE '%' + CONVERT(NVARCHAR(36), @FileId) + '%');";
            await using var cmd = new SqlCommand(sql, conn, tx);
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<(bool success, string? error, Guid blogId)> CreateBlogAsync(Guid adminId, CreateBlogRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return (false, "Title is required.", Guid.Empty);

            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();

            try
            {
                var blogId = Guid.NewGuid();
                var baseSlug = GenerateSlug(request.Title);
                var slug = baseSlug;
                int suffix = 1;

                while (true)
                {
                    const string checkSlug = "SELECT COUNT(1) FROM dbo.Blog WHERE Slug = @Slug;";
                    await using var checkCmd = new SqlCommand(checkSlug, conn, tx);
                    checkCmd.Parameters.Add("@Slug", SqlDbType.NVarChar, 500).Value = slug;
                    var exists = (int)await checkCmd.ExecuteScalarAsync() > 0;
                    if (!exists) break;
                    slug = $"{baseSlug}-{suffix++}";
                }

                if (request.IsFeatured)
                {
                    const string clearFeatured = "UPDATE dbo.Blog SET IsFeatured = 0 WHERE IsFeatured = 1;";
                    await using var clearCmd = new SqlCommand(clearFeatured, conn, tx);
                    await clearCmd.ExecuteNonQueryAsync();
                }

                const string insertBlog = @"
INSERT INTO dbo.Blog (Id, AdminAccountId, Title, Tag, Slug, IsPublished, IsFeatured, PublishedAtUtc, CreatedAtUtc)
VALUES (@Id, @AdminId, @Title, @Tag, @Slug, @IsPublished, @IsFeatured, @PublishedAt, SYSUTCDATETIME());";

                await using (var cmd = new SqlCommand(insertBlog, conn, tx))
                {
                    cmd.Parameters.Add("@Id", SqlDbType.UniqueIdentifier).Value = blogId;
                    cmd.Parameters.Add("@AdminId", SqlDbType.UniqueIdentifier).Value = adminId;
                    cmd.Parameters.Add("@Title", SqlDbType.NVarChar, 500).Value = request.Title.Trim();
                    cmd.Parameters.Add("@Tag", SqlDbType.NVarChar, 100).Value = (request.Tag ?? "").Trim();
                    cmd.Parameters.Add("@Slug", SqlDbType.NVarChar, 500).Value = slug;
                    cmd.Parameters.Add("@IsPublished", SqlDbType.Bit).Value = request.IsPublished;
                    cmd.Parameters.Add("@IsFeatured", SqlDbType.Bit).Value = request.IsFeatured;
                    cmd.Parameters.Add("@PublishedAt", SqlDbType.DateTime2).Value = request.IsPublished ? DateTime.UtcNow : (object)DBNull.Value;
                    await cmd.ExecuteNonQueryAsync();
                }

                int sectionIndex = 0;

                if (request.HeroImage != null)
                {
                    var heroFileId = await SaveFileAsync(conn, tx, request.HeroImage);
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 1, null, heroFileId);
                    await InsertBlogFileAsync(conn, tx, blogId, heroFileId, 1, 0);
                }

                if (!string.IsNullOrWhiteSpace(request.Section1Text))
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 0, request.Section1Text.Trim(), null);

                if (request.Image2 != null)
                {
                    var img2FileId = await SaveFileAsync(conn, tx, request.Image2);
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 1, null, img2FileId);
                    await InsertBlogFileAsync(conn, tx, blogId, img2FileId, 2, 1);
                }

                if (!string.IsNullOrWhiteSpace(request.Section2Heading))
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 2, request.Section2Heading.Trim(), null);

                if (!string.IsNullOrWhiteSpace(request.Section2Text))
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 0, request.Section2Text.Trim(), null);

                if (request.Image3 != null)
                {
                    var img3FileId = await SaveFileAsync(conn, tx, request.Image3);
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 1, null, img3FileId);
                    await InsertBlogFileAsync(conn, tx, blogId, img3FileId, 2, 2);
                }

                if (request.Image4 != null)
                {
                    var img4FileId = await SaveFileAsync(conn, tx, request.Image4);
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 1, null, img4FileId);
                    await InsertBlogFileAsync(conn, tx, blogId, img4FileId, 2, 3);
                }

                await tx.CommitAsync();
                return (true, null, blogId);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                Console.Error.WriteLine($"CreateBlog failed: {ex}");
                return (false, "An error occurred while creating the blog.", Guid.Empty);
            }
        }

        public async Task<(bool success, string? error)> UpdateBlogAsync(Guid adminId, Guid blogId, UpdateBlogRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return (false, "Title is required.");

            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();

            try
            {
                const string ownerCheck = "SELECT COUNT(1) FROM dbo.Blog WHERE Id = @BlogId AND AdminAccountId = @AdminId;";
                await using (var cmd = new SqlCommand(ownerCheck, conn, tx))
                {
                    cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
                    cmd.Parameters.Add("@AdminId", SqlDbType.UniqueIdentifier).Value = adminId;
                    if ((int)await cmd.ExecuteScalarAsync() == 0)
                        return (false, "Blog not found.");
                }

                if (request.IsFeatured)
                {
                    const string clearFeatured = "UPDATE dbo.Blog SET IsFeatured = 0 WHERE IsFeatured = 1 AND Id <> @BlogId;";
                    await using var clearCmd = new SqlCommand(clearFeatured, conn, tx);
                    clearCmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
                    await clearCmd.ExecuteNonQueryAsync();
                }

                const string getPublished = "SELECT IsPublished, PublishedAtUtc FROM dbo.Blog WHERE Id = @BlogId;";
                bool wasPublished = false;
                await using (var cmd = new SqlCommand(getPublished, conn, tx))
                {
                    cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
                    await using var reader = await cmd.ExecuteReaderAsync();
                    if (await reader.ReadAsync()) wasPublished = reader.GetBoolean(0);
                }

                var publishedAt = request.IsPublished && !wasPublished ? DateTime.UtcNow : (DateTime?)null;

                const string updateBlog = @"
UPDATE dbo.Blog
SET Title = @Title, Tag = @Tag, IsPublished = @IsPublished, IsFeatured = @IsFeatured,
    PublishedAtUtc = CASE WHEN @SetPublishedAt = 1 THEN @PublishedAt ELSE PublishedAtUtc END
WHERE Id = @BlogId;";

                await using (var cmd = new SqlCommand(updateBlog, conn, tx))
                {
                    cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
                    cmd.Parameters.Add("@Title", SqlDbType.NVarChar, 500).Value = request.Title.Trim();
                    cmd.Parameters.Add("@Tag", SqlDbType.NVarChar, 100).Value = (request.Tag ?? "").Trim();
                    cmd.Parameters.Add("@IsPublished", SqlDbType.Bit).Value = request.IsPublished;
                    cmd.Parameters.Add("@IsFeatured", SqlDbType.Bit).Value = request.IsFeatured;
                    cmd.Parameters.Add("@SetPublishedAt", SqlDbType.Bit).Value = publishedAt.HasValue;
                    cmd.Parameters.Add("@PublishedAt", SqlDbType.DateTime2).Value = publishedAt.HasValue ? publishedAt.Value : (object)DBNull.Value;
                    await cmd.ExecuteNonQueryAsync();
                }

                var oldFileIds = new List<Guid>();
                const string getOldFiles = "SELECT FileId FROM dbo.BlogFile WHERE BlogId = @BlogId;";
                await using (var cmd = new SqlCommand(getOldFiles, conn, tx))
                {
                    cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync()) oldFileIds.Add(reader.GetGuid(0));
                }

                await using (var cmd = new SqlCommand("DELETE FROM dbo.BlogSection WHERE BlogId = @BlogId;", conn, tx))
                {
                    cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
                    await cmd.ExecuteNonQueryAsync();
                }

                await using (var cmd = new SqlCommand("DELETE FROM dbo.BlogFile WHERE BlogId = @BlogId;", conn, tx))
                {
                    cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
                    await cmd.ExecuteNonQueryAsync();
                }

                int sectionIndex = 0;
                var keepFileIds = new HashSet<Guid>();

                if (request.HeroImage != null)
                {
                    var heroFileId = await SaveFileAsync(conn, tx, request.HeroImage);
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 1, null, heroFileId);
                    await InsertBlogFileAsync(conn, tx, blogId, heroFileId, 1, 0);
                    keepFileIds.Add(heroFileId);
                }
                else if (!request.RemoveHeroImage)
                {
                    var existingHero = oldFileIds.Count > 0 ? await GetBlogFileIdByCategoryAsync(conn, tx, blogId, oldFileIds, 1, 0) : (Guid?)null;
                    if (existingHero.HasValue)
                    {
                        await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 1, null, existingHero.Value);
                        await InsertBlogFileAsync(conn, tx, blogId, existingHero.Value, 1, 0);
                        keepFileIds.Add(existingHero.Value);
                    }
                }

                if (!string.IsNullOrWhiteSpace(request.Section1Text))
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 0, request.Section1Text.Trim(), null);

                if (request.Image2 != null)
                {
                    var img2FileId = await SaveFileAsync(conn, tx, request.Image2);
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 1, null, img2FileId);
                    await InsertBlogFileAsync(conn, tx, blogId, img2FileId, 2, 1);
                    keepFileIds.Add(img2FileId);
                }
                else if (!request.RemoveImage2)
                {
                    var existing = oldFileIds.Count > 0 ? await GetOldFileByOrderAsync(conn, oldFileIds, 1) : (Guid?)null;
                    if (existing.HasValue)
                    {
                        await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 1, null, existing.Value);
                        await InsertBlogFileAsync(conn, tx, blogId, existing.Value, 2, 1);
                        keepFileIds.Add(existing.Value);
                    }
                }

                if (!string.IsNullOrWhiteSpace(request.Section2Heading))
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 2, request.Section2Heading.Trim(), null);

                if (!string.IsNullOrWhiteSpace(request.Section2Text))
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 0, request.Section2Text.Trim(), null);

                if (request.Image3 != null)
                {
                    var img3FileId = await SaveFileAsync(conn, tx, request.Image3);
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 1, null, img3FileId);
                    await InsertBlogFileAsync(conn, tx, blogId, img3FileId, 2, 2);
                    keepFileIds.Add(img3FileId);
                }
                else if (!request.RemoveImage3)
                {
                    var existing = oldFileIds.Count > 0 ? await GetOldFileByOrderAsync(conn, oldFileIds, 2) : (Guid?)null;
                    if (existing.HasValue)
                    {
                        await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 1, null, existing.Value);
                        await InsertBlogFileAsync(conn, tx, blogId, existing.Value, 2, 2);
                        keepFileIds.Add(existing.Value);
                    }
                }

                if (request.Image4 != null)
                {
                    var img4FileId = await SaveFileAsync(conn, tx, request.Image4);
                    await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 1, null, img4FileId);
                    await InsertBlogFileAsync(conn, tx, blogId, img4FileId, 2, 3);
                    keepFileIds.Add(img4FileId);
                }
                else if (!request.RemoveImage4)
                {
                    var existing = oldFileIds.Count > 0 ? await GetOldFileByOrderAsync(conn, oldFileIds, 3) : (Guid?)null;
                    if (existing.HasValue)
                    {
                        await InsertBlogSectionAsync(conn, tx, blogId, sectionIndex++, 1, null, existing.Value);
                        await InsertBlogFileAsync(conn, tx, blogId, existing.Value, 2, 3);
                        keepFileIds.Add(existing.Value);
                    }
                }

                foreach (var oldId in oldFileIds.Where(id => !keepFileIds.Contains(id)))
                    await DeleteFileIfOrphanedAsync(conn, tx, oldId);

                await tx.CommitAsync();
                return (true, null);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                Console.Error.WriteLine($"UpdateBlog failed: {ex}");
                return (false, "An error occurred while updating the blog.");
            }
        }

        public async Task<(bool success, string? error)> DeleteBlogAsync(Guid adminId, Guid blogId)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var tx = (SqlTransaction)await conn.BeginTransactionAsync();

            try
            {
                var fileIds = new List<Guid>();
                const string getFiles = "SELECT FileId FROM dbo.BlogFile WHERE BlogId = @BlogId;";
                await using (var cmd = new SqlCommand(getFiles, conn, tx))
                {
                    cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
                    await using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync()) fileIds.Add(reader.GetGuid(0));
                }

                const string deleteBlog = "DELETE FROM dbo.Blog WHERE Id = @BlogId AND AdminAccountId = @AdminId;";
                await using (var cmd = new SqlCommand(deleteBlog, conn, tx))
                {
                    cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
                    cmd.Parameters.Add("@AdminId", SqlDbType.UniqueIdentifier).Value = adminId;
                    var rows = await cmd.ExecuteNonQueryAsync();
                    if (rows == 0) { await tx.RollbackAsync(); return (false, "Blog not found."); }
                }

                foreach (var fId in fileIds)
                    await DeleteFileIfOrphanedAsync(conn, tx, fId);

                await tx.CommitAsync();
                return (true, null);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                Console.Error.WriteLine($"DeleteBlog failed: {ex}");
                return (false, "An error occurred while deleting the blog.");
            }
        }

        public async Task<List<AdminBlogCardDto>> GetAdminBlogsAsync(Guid adminId, string? query, string? sort)
        {
            var orderBy = sort?.ToUpperInvariant() switch
            {
                "A-Z" => "b.Title ASC",
                "Z-A" => "b.Title DESC",
                "POPULAR" => "b.ViewCount DESC, b.CreatedAtUtc DESC",
                _ => "b.CreatedAtUtc DESC",
            };

            var hasQuery = !string.IsNullOrWhiteSpace(query);

            var sql = $@"
SELECT b.Id, b.Title, b.Tag, b.Slug, b.IsPublished, b.IsFeatured,
       b.PublishedAtUtc, b.CreatedAtUtc, b.ViewCount,
       hero.FileId AS HeroFileId
FROM dbo.Blog b
OUTER APPLY (
    SELECT TOP 1 bf.FileId FROM dbo.BlogFile bf
    WHERE bf.BlogId = b.Id AND bf.FileCategory = 1
) hero
WHERE b.AdminAccountId = @AdminId
{(hasQuery ? "AND (b.Title LIKE @Query OR b.Tag LIKE @Query)" : "")}
ORDER BY {orderBy};";

            var results = new List<AdminBlogCardDto>();
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@AdminId", SqlDbType.UniqueIdentifier).Value = adminId;
            if (hasQuery) cmd.Parameters.Add("@Query", SqlDbType.NVarChar, 1000).Value = $"%{query}%";

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var heroFileId = reader.IsDBNull(reader.GetOrdinal("HeroFileId"))
                    ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("HeroFileId"));

                results.Add(new AdminBlogCardDto
                {
                    Id = reader.GetGuid(reader.GetOrdinal("Id")),
                    Title = reader.GetString(reader.GetOrdinal("Title")),
                    Tag = reader.GetString(reader.GetOrdinal("Tag")),
                    Slug = reader.GetString(reader.GetOrdinal("Slug")),
                    IsPublished = reader.GetBoolean(reader.GetOrdinal("IsPublished")),
                    IsFeatured = reader.GetBoolean(reader.GetOrdinal("IsFeatured")),
                    PublishedAt = reader.IsDBNull(reader.GetOrdinal("PublishedAtUtc")) ? null : new DateTimeOffset(reader.GetDateTime(reader.GetOrdinal("PublishedAtUtc")), TimeSpan.Zero),
                    CreatedAt = new DateTimeOffset(reader.GetDateTime(reader.GetOrdinal("CreatedAtUtc")), TimeSpan.Zero),
                    ViewCount = reader.GetInt32(reader.GetOrdinal("ViewCount")),
                    HeroImageUrl = heroFileId == Guid.Empty ? "" : $"/api/blog/file/{heroFileId}",
                });
            }

            return results;
        }

        public async Task<BlogDetailDto?> GetAdminBlogDetailAsync(Guid adminId, Guid blogId)
        {
            return await GetBlogDetailCoreAsync(blogId, adminId, incrementView: false);
        }

        public async Task<List<BlogCardDto>> GetPublicBlogsAsync(string? query, int page, int pageSize)
        {
            var hasQuery = !string.IsNullOrWhiteSpace(query);
            var offset = Math.Max(0, (page - 1) * pageSize);

            var sql = $@"
SELECT b.Id, b.Title, b.Tag, b.Slug, b.PublishedAtUtc, b.ViewCount,
       b.IsPublished, b.IsFeatured,
       hero.FileId AS HeroFileId,
       LEFT(sec.TextContent, 2000) AS Description
FROM dbo.Blog b
OUTER APPLY (
    SELECT TOP 1 bf.FileId FROM dbo.BlogFile bf WHERE bf.BlogId = b.Id AND bf.FileCategory = 1
) hero
OUTER APPLY (
    SELECT TOP 1 bs.TextContent FROM dbo.BlogSection bs
    WHERE bs.BlogId = b.Id AND bs.SectionType = 0 ORDER BY bs.SectionIndex ASC
) sec
WHERE b.IsPublished = 1
{(hasQuery ? "AND (b.Title LIKE @Query OR b.Tag LIKE @Query)" : "")}
ORDER BY b.PublishedAtUtc DESC
OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;";

            var results = new List<BlogCardDto>();
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            if (hasQuery) cmd.Parameters.Add("@Query", SqlDbType.NVarChar, 1000).Value = $"%{query}%";
            cmd.Parameters.Add("@Offset", SqlDbType.Int).Value = offset;
            cmd.Parameters.Add("@PageSize", SqlDbType.Int).Value = pageSize;

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                results.Add(ReadBlogCard(reader));

            return results;
        }

        public async Task<int> GetPublicBlogCountAsync(string? query)
        {
            var hasQuery = !string.IsNullOrWhiteSpace(query);
            var sql = $@"
SELECT COUNT(*) FROM dbo.Blog WHERE IsPublished = 1
{(hasQuery ? "AND (Title LIKE @Query OR Tag LIKE @Query)" : "")};";

            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            if (hasQuery) cmd.Parameters.Add("@Query", SqlDbType.NVarChar, 1000).Value = $"%{query}%";
            return (int)await cmd.ExecuteScalarAsync();
        }

        public async Task<BlogDetailDto?> GetPublicBlogBySlugAsync(string slug)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            const string getIdSql = "SELECT Id FROM dbo.Blog WHERE Slug = @Slug AND IsPublished = 1;";
            Guid blogId;
            await using (var cmd = new SqlCommand(getIdSql, conn))
            {
                cmd.Parameters.Add("@Slug", SqlDbType.NVarChar, 500).Value = slug;
                var obj = await cmd.ExecuteScalarAsync();
                if (obj == null) return null;
                blogId = (Guid)obj;
            }

            const string incrementSql = "UPDATE dbo.Blog SET ViewCount = ViewCount + 1 WHERE Id = @BlogId;";
            await using (var cmd = new SqlCommand(incrementSql, conn))
            {
                cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
                await cmd.ExecuteNonQueryAsync();
            }

            return await GetBlogDetailCoreAsync(blogId, null, incrementView: false);
        }

        public async Task<List<BlogCardDto>> GetTrendingBlogsAsync(int count)
        {
            var sql = $@"
SELECT TOP (@Count) b.Id, b.Title, b.Tag, b.Slug, b.PublishedAtUtc, b.ViewCount,
       b.IsPublished, b.IsFeatured,
       hero.FileId AS HeroFileId,
       LEFT(sec.TextContent, 2000) AS Description
FROM dbo.Blog b
OUTER APPLY (
    SELECT TOP 1 bf.FileId FROM dbo.BlogFile bf WHERE bf.BlogId = b.Id AND bf.FileCategory = 1
) hero
OUTER APPLY (
    SELECT TOP 1 bs.TextContent FROM dbo.BlogSection bs
    WHERE bs.BlogId = b.Id AND bs.SectionType = 0 ORDER BY bs.SectionIndex ASC
) sec
WHERE b.IsPublished = 1
ORDER BY b.ViewCount DESC, b.PublishedAtUtc DESC;";

            var results = new List<BlogCardDto>();
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@Count", SqlDbType.Int).Value = count;

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                results.Add(ReadBlogCard(reader));

            return results;
        }

        public async Task<List<BlogCardDto>> GetRelatedBlogsAsync(string slug, int count)
        {
            var sql = $@"
SELECT TOP (@Count) b.Id, b.Title, b.Tag, b.Slug, b.PublishedAtUtc, b.ViewCount,
       b.IsPublished, b.IsFeatured,
       hero.FileId AS HeroFileId,
       LEFT(sec.TextContent, 2000) AS Description
FROM dbo.Blog b
OUTER APPLY (
    SELECT TOP 1 bf.FileId FROM dbo.BlogFile bf WHERE bf.BlogId = b.Id AND bf.FileCategory = 1
) hero
OUTER APPLY (
    SELECT TOP 1 bs.TextContent FROM dbo.BlogSection bs
    WHERE bs.BlogId = b.Id AND bs.SectionType = 0 ORDER BY bs.SectionIndex ASC
) sec
WHERE b.IsPublished = 1 AND b.Slug <> @Slug
  AND b.Tag = (SELECT TOP 1 Tag FROM dbo.Blog WHERE Slug = @Slug)
ORDER BY b.PublishedAtUtc DESC;";

            var results = new List<BlogCardDto>();
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            cmd.Parameters.Add("@Slug", SqlDbType.NVarChar, 500).Value = slug;
            cmd.Parameters.Add("@Count", SqlDbType.Int).Value = count;

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                results.Add(ReadBlogCard(reader));

            return results;
        }

        public async Task<BlogCardDto?> GetFeaturedBlogAsync()
        {
            const string sql = @"
SELECT TOP 1 b.Id, b.Title, b.Tag, b.Slug, b.PublishedAtUtc, b.ViewCount,
       b.IsPublished, b.IsFeatured,
       hero.FileId AS HeroFileId,
       LEFT(sec.TextContent, 2000) AS Description
FROM dbo.Blog b
OUTER APPLY (
    SELECT TOP 1 bf.FileId FROM dbo.BlogFile bf WHERE bf.BlogId = b.Id AND bf.FileCategory = 1
) hero
OUTER APPLY (
    SELECT TOP 1 bs.TextContent FROM dbo.BlogSection bs
    WHERE bs.BlogId = b.Id AND bs.SectionType = 0 ORDER BY bs.SectionIndex ASC
) sec
WHERE b.IsPublished = 1 AND b.IsFeatured = 1
ORDER BY b.PublishedAtUtc DESC;";

            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(sql, conn);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync()) return ReadBlogCard(reader);

            return null;
        }

        private async Task<BlogDetailDto?> GetBlogDetailCoreAsync(Guid blogId, Guid? adminId, bool incrementView)
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            var blogSql = adminId.HasValue
                ? "SELECT Id, Title, Tag, Slug, IsPublished, IsFeatured, PublishedAtUtc, ViewCount FROM dbo.Blog WHERE Id = @BlogId AND AdminAccountId = @AdminId;"
                : "SELECT Id, Title, Tag, Slug, IsPublished, IsFeatured, PublishedAtUtc, ViewCount FROM dbo.Blog WHERE Id = @BlogId;";

            BlogDetailDto? dto = null;
            await using (var cmd = new SqlCommand(blogSql, conn))
            {
                cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
                if (adminId.HasValue) cmd.Parameters.Add("@AdminId", SqlDbType.UniqueIdentifier).Value = adminId.Value;
                await using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync()) return null;
                dto = new BlogDetailDto
                {
                    Id = reader.GetGuid(0),
                    Title = reader.GetString(1),
                    Tag = reader.GetString(2),
                    Slug = reader.GetString(3),
                    IsPublished = reader.GetBoolean(4),
                    IsFeatured = reader.GetBoolean(5),
                    PublishedAt = reader.IsDBNull(6) ? null : new DateTimeOffset(reader.GetDateTime(6), TimeSpan.Zero),
                    ViewCount = reader.GetInt32(7),
                };
            }

            const string sectionsSql = @"
SELECT SectionIndex, SectionType, TextContent, ImageFileId
FROM dbo.BlogSection WHERE BlogId = @BlogId ORDER BY SectionIndex ASC;";

            await using (var cmd = new SqlCommand(sectionsSql, conn))
            {
                cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var imageFileId = reader.IsDBNull(3) ? Guid.Empty : reader.GetGuid(3);
                    dto.Sections.Add(new BlogSectionDto
                    {
                        SectionIndex = reader.GetInt32(0),
                        SectionType = reader.GetByte(1),
                        TextContent = reader.IsDBNull(2) ? null : reader.GetString(2),
                        ImageUrl = imageFileId == Guid.Empty ? null : $"/api/blog/file/{imageFileId}",
                    });
                }
            }

            return dto;
        }

        private static BlogCardDto ReadBlogCard(SqlDataReader reader)
        {
            var heroFileId = reader.IsDBNull(reader.GetOrdinal("HeroFileId"))
                ? Guid.Empty : reader.GetGuid(reader.GetOrdinal("HeroFileId"));

            return new BlogCardDto
            {
                Id = reader.GetGuid(reader.GetOrdinal("Id")),
                Title = reader.GetString(reader.GetOrdinal("Title")),
                Tag = reader.GetString(reader.GetOrdinal("Tag")),
                Slug = reader.GetString(reader.GetOrdinal("Slug")),
                PublishedAt = reader.IsDBNull(reader.GetOrdinal("PublishedAtUtc")) ? null : new DateTimeOffset(reader.GetDateTime(reader.GetOrdinal("PublishedAtUtc")), TimeSpan.Zero),
                ViewCount = reader.GetInt32(reader.GetOrdinal("ViewCount")),
                IsPublished = reader.GetBoolean(reader.GetOrdinal("IsPublished")),
                IsFeatured = reader.GetBoolean(reader.GetOrdinal("IsFeatured")),
                Description = reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
                HeroImageUrl = heroFileId == Guid.Empty ? "" : $"/api/blog/file/{heroFileId}",
            };
        }

        private static async Task InsertBlogSectionAsync(SqlConnection conn, SqlTransaction tx, Guid blogId, int sectionIndex, int sectionType, string? textContent, Guid? imageFileId)
        {
            const string sql = @"
INSERT INTO dbo.BlogSection (Id, BlogId, SectionIndex, SectionType, TextContent, ImageFileId)
VALUES (NEWID(), @BlogId, @SectionIndex, @SectionType, @TextContent, @ImageFileId);";

            await using var cmd = new SqlCommand(sql, conn, tx);
            cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
            cmd.Parameters.Add("@SectionIndex", SqlDbType.Int).Value = sectionIndex;
            cmd.Parameters.Add("@SectionType", SqlDbType.TinyInt).Value = (byte)sectionType;
            cmd.Parameters.Add("@TextContent", SqlDbType.NVarChar, -1).Value = (object?)textContent ?? DBNull.Value;
            cmd.Parameters.Add("@ImageFileId", SqlDbType.UniqueIdentifier).Value = (object?)imageFileId ?? DBNull.Value;
            await cmd.ExecuteNonQueryAsync();
        }

        private static async Task InsertBlogFileAsync(SqlConnection conn, SqlTransaction tx, Guid blogId, Guid fileId, int fileCategory, int orderIndex)
        {
            const string sql = "INSERT INTO dbo.BlogFile (BlogId, FileId, FileCategory, OrderIndex) VALUES (@BlogId, @FileId, @FileCategory, @OrderIndex);";
            await using var cmd = new SqlCommand(sql, conn, tx);
            cmd.Parameters.Add("@BlogId", SqlDbType.UniqueIdentifier).Value = blogId;
            cmd.Parameters.Add("@FileId", SqlDbType.UniqueIdentifier).Value = fileId;
            cmd.Parameters.Add("@FileCategory", SqlDbType.Int).Value = fileCategory;
            cmd.Parameters.Add("@OrderIndex", SqlDbType.Int).Value = orderIndex;
            await cmd.ExecuteNonQueryAsync();
        }

        private static async Task<Guid?> GetBlogFileIdByCategoryAsync(SqlConnection conn, SqlTransaction tx, Guid blogId, List<Guid> oldFileIds, int category, int orderIndex)
        {
            _ = blogId;
            _ = tx;
            _ = category;
            _ = orderIndex;
            return oldFileIds.Count > 0 ? oldFileIds[0] : null;
        }

        private static Task<Guid?> GetOldFileByOrderAsync(SqlConnection conn, List<Guid> oldFileIds, int orderIndex)
        {
            _ = conn;
            return Task.FromResult(orderIndex < oldFileIds.Count ? (Guid?)oldFileIds[orderIndex] : null);
        }
    }
}