using Oap.WebApp.DTOs.Blog;

namespace Oap.WebApp.Interfaces
{
    public interface IBlog
    {
        Task<(bool success, string? error, Guid blogId)> CreateBlogAsync(Guid adminId, CreateBlogRequest request);
        Task<(bool success, string? error)> UpdateBlogAsync(Guid adminId, Guid blogId, UpdateBlogRequest request);
        Task<(bool success, string? error)> DeleteBlogAsync(Guid adminId, Guid blogId);
        Task<List<AdminBlogCardDto>> GetAdminBlogsAsync(Guid adminId, string? query, string? sort);
        Task<BlogDetailDto?> GetAdminBlogDetailAsync(Guid adminId, Guid blogId);
        Task<List<BlogCardDto>> GetPublicBlogsAsync(string? query, int page, int pageSize);
        Task<int> GetPublicBlogCountAsync(string? query);
        Task<BlogDetailDto?> GetPublicBlogBySlugAsync(string slug);
        Task<List<BlogCardDto>> GetTrendingBlogsAsync(int count);
        Task<List<BlogCardDto>> GetRelatedBlogsAsync(string slug, int count);
        Task<BlogCardDto?> GetFeaturedBlogAsync();
    }
}