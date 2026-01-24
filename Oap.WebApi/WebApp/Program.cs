using WebApp.Interfaces;
using WebApp.Services;
using WebApp.Utilities;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseCors("DevCorsPolicy");
}

app.UseRouting();

app.UseMiddleware<WebApp.Middleware.AuthTokenMiddleware>();

app.MapControllers();
app.Run();
