namespace Oap.WebApp.DTOs.UserApplication
{
    public class CreateUserApplicationFormRequest
    {
        public string Name { get; set; } = "";
        public decimal? Price { get; set; }
        public string? Description { get; set; }
        public string? RepositoryUrl { get; set; }
        public bool IsDraft { get; set; }
        public List<string> Technologies { get; set; } = new();
        public IFormFile? ZipFile { get; set; }
        public List<IFormFile> Media { get; set; } = new();
        public int PresentationIndex { get; set; } = 0;
    }
}