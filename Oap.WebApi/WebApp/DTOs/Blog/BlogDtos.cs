namespace Oap.WebApp.DTOs.Blog
{
    public class CreateBlogRequest
    {
        public string Title { get; set; } = "";
        public string Tag { get; set; } = "";
        public bool IsPublished { get; set; }
        public bool IsFeatured { get; set; }
        public string? Section1Text { get; set; }
        public string? Section2Heading { get; set; }
        public string? Section2Text { get; set; }
        public IFormFile? HeroImage { get; set; }
        public IFormFile? Image2 { get; set; }
        public IFormFile? Image3 { get; set; }
        public IFormFile? Image4 { get; set; }
    }

    public class UpdateBlogRequest
    {
        public string Title { get; set; } = "";
        public string Tag { get; set; } = "";
        public bool IsPublished { get; set; }
        public bool IsFeatured { get; set; }
        public string? Section1Text { get; set; }
        public string? Section2Heading { get; set; }
        public string? Section2Text { get; set; }
        public IFormFile? HeroImage { get; set; }
        public IFormFile? Image2 { get; set; }
        public IFormFile? Image3 { get; set; }
        public IFormFile? Image4 { get; set; }
        public bool RemoveHeroImage { get; set; }
        public bool RemoveImage2 { get; set; }
        public bool RemoveImage3 { get; set; }
        public bool RemoveImage4 { get; set; }
    }

    public class BlogCardDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = "";
        public string Tag { get; set; } = "";
        public string Slug { get; set; } = "";
        public string? Description { get; set; }
        public string HeroImageUrl { get; set; } = "";
        public DateTimeOffset? PublishedAt { get; set; }
        public int ViewCount { get; set; }
        public bool IsPublished { get; set; }
        public bool IsFeatured { get; set; }
    }

    public class BlogDetailDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = "";
        public string Tag { get; set; } = "";
        public string Slug { get; set; } = "";
        public DateTimeOffset? PublishedAt { get; set; }
        public int ViewCount { get; set; }
        public bool IsPublished { get; set; }
        public bool IsFeatured { get; set; }
        public List<BlogSectionDto> Sections { get; set; } = new();
    }

    public class BlogSectionDto
    {
        public int SectionIndex { get; set; }
        public int SectionType { get; set; }
        public string? TextContent { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class AdminBlogCardDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = "";
        public string Tag { get; set; } = "";
        public string Slug { get; set; } = "";
        public string HeroImageUrl { get; set; } = "";
        public DateTimeOffset? PublishedAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public int ViewCount { get; set; }
        public bool IsPublished { get; set; }
        public bool IsFeatured { get; set; }
    }
}