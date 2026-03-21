using Microsoft.Extensions.Caching.Memory;
using Oap.WebApp.Interfaces;

namespace Oap.WebApp.Services
{
    public partial class StoreApplicationService : IStoreApplication
    {
        private readonly string _connectionString;
        private readonly IMemoryCache _cache;
        private readonly IApplicationAnalytics _analytics;
        private const string StoreTechCachePrefix = "ua_tech_v_";

        public StoreApplicationService(IConfiguration configuration, IMemoryCache cache, IApplicationAnalytics analytics)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
            _cache = cache;
            _analytics = analytics;
        }
    }
}