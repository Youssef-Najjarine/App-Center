using Oap.WebApp.DTOs;

namespace Oap.WebApp.Interfaces
{
    public interface IVerificationUserAccount
    {
        Task<bool> VerifyCodeAsync(string email, string code);
        Task<VerifyResetCodeResultRequest> VerifyResetCodeAsync(string email, string code);
        Task<bool> ResendCodeAsync(string email);
        Task GenerateAndSendCodeAsync(Guid userId, string email);
    }
}
