using Microsoft.AspNetCore.Http;
using System.Text;

namespace Oap.WebApp.Utilities
{
    public static class MediaTypeDetector
    {
        public static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/png", "image/webp"
        };

        public static readonly HashSet<string> AllowedVideoTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "video/mp4", "video/webm", "video/quicktime"
        };

        public static bool IsAllowedImage(string contentType)
            => !string.IsNullOrWhiteSpace(contentType) && AllowedImageTypes.Contains(contentType);

        public static bool IsAllowedVideo(string contentType)
            => !string.IsNullOrWhiteSpace(contentType) && AllowedVideoTypes.Contains(contentType);

        public static string DetectContentType(IFormFile file)
        {
            try
            {
                using var s = file.OpenReadStream();
                if (s.CanSeek) s.Seek(0, SeekOrigin.Begin);

                Span<byte> header = stackalloc byte[64];
                var read = s.Read(header);
                if (read <= 0) return "";

                var h = header.Slice(0, read);

                // GIF
                if (h.Length >= 6)
                {
                    var sig = Encoding.ASCII.GetString(h.Slice(0, 6));
                    if (sig == "GIF87a" || sig == "GIF89a") return "image/gif";
                }

                // JPEG
                if (h.Length >= 3 && h[0] == 0xFF && h[1] == 0xD8 && h[2] == 0xFF)
                    return "image/jpeg";

                // PNG
                if (h.Length >= 8 &&
                    h[0] == 0x89 && h[1] == 0x50 && h[2] == 0x4E && h[3] == 0x47 &&
                    h[4] == 0x0D && h[5] == 0x0A && h[6] == 0x1A && h[7] == 0x0A)
                    return "image/png";

                // WebP
                if (h.Length >= 12)
                {
                    var riff = Encoding.ASCII.GetString(h.Slice(0, 4));
                    var webp = Encoding.ASCII.GetString(h.Slice(8, 4));
                    if (riff == "RIFF" && webp == "WEBP") return "image/webp";
                }

                // WebM
                if (h.Length >= 4 && h[0] == 0x1A && h[1] == 0x45 && h[2] == 0xDF && h[3] == 0xA3)
                    return "video/webm";

                // MP4 / QuickTime (ftyp box)
                if (h.Length >= 12)
                {
                    var ftyp = Encoding.ASCII.GetString(h.Slice(4, 4));
                    if (ftyp == "ftyp")
                    {
                        var brand = Encoding.ASCII.GetString(h.Slice(8, 4));
                        if (brand == "qt  ") return "video/quicktime";
                        return "video/mp4";
                    }
                }

                return "";
            }
            catch
            {
                return "";
            }
        }
    }
}