using Microsoft.AspNetCore.Http.Features;
using Oap.WebApp.Interfaces;
using Oap.WebApp.Services;
using Oap.WebApp.Utilities;

var builder = WebApplication.CreateBuilder(args);

const long FourGb = 4L * 1024 * 1024 * 1024;

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = FourGb;
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = FourGb;
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartBoundaryLengthLimit = 256;
    options.ValueCountLimit = 4096;
    options.BufferBodyLengthLimit = FourGb;
    options.MemoryBufferThreshold = int.MaxValue;
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddMemoryCache();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:8080")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddScoped<TrustedDeviceService>();
builder.Services.AddScoped<IUserAccount, UserAccountService>();
builder.Services.AddScoped<IVerificationUserAccount, VerificationUserAccountService>();
builder.Services.AddScoped<AuthCookieService>();
builder.Services.AddScoped<AuthCookieIssuerService>();
builder.Services.AddSingleton<EmailService>();
builder.Services.AddScoped<IProfileApplication, ProfileApplicationService>();
builder.Services.AddScoped<IStoreApplication, StoreApplicationService>();
builder.Services.AddScoped<IApplicationAnalytics, ApplicationAnalyticsService>();
builder.Services.AddScoped<IApplicationManagement, ApplicationManagementService>();
builder.Services.AddScoped<IApplicationTransaction, ApplicationTransactionService>();
builder.Services.AddScoped<IApplicationHistory, ApplicationHistoryService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseCors("DevCorsPolicy");
}

app.UseRouting();

app.UseMiddleware<Oap.WebApp.Middleware.AuthTokenMiddleware>();

app.MapControllers();
app.Run();