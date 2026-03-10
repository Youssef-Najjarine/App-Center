using Microsoft.Extensions.Caching.Memory;
using Oap.WebApp.Interfaces;

namespace Oap.WebApp.Services
{
    public partial class ProfileApplicationService : IProfileApplication
    {
        private readonly string _connectionString;
        private readonly IMemoryCache _cache;
        private readonly IServiceScopeFactory _scopeFactory;
        private const string AppMetadataPath = "oap.app.json";
        private const string TechCachePrefix = "ua_tech_v_";
        private const int ThumbnailCategory = 4;

        public ProfileApplicationService(IConfiguration configuration, IMemoryCache cache, IServiceScopeFactory scopeFactory)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
            _cache = cache;
            _scopeFactory = scopeFactory;
        }
    }
}