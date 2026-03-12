using Microsoft.Extensions.Caching.Memory;
using Oap.WebApp.Interfaces;

namespace Oap.WebApp.Services
{
    public partial class StoreApplicationService : IStoreApplication
    {
        private readonly string _connectionString;
        private readonly IMemoryCache _cache;
        private const string StoreTechCachePrefix = "ua_tech_v_";

        public StoreApplicationService(IConfiguration configuration, IMemoryCache cache)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
            _cache = cache;
        }
    }
}