namespace Dumcsi.Domain.Interfaces;

public interface IFileStorageService
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, string bucketName = "dumcsi");
    Task DeleteFileAsync(string fileName, string bucketName = "dumcsi");
}