namespace Dumcsi.Api.Common;

// Sikeres válasz adat nélkül
public class ApiResponse
{
    public bool IsSuccess { get; }
    public string? Message { get; }

    protected ApiResponse(bool isSuccess, string? message = null)
    {
        IsSuccess = isSuccess;
        Message = message;
    }

    public static ApiResponse Success(string? message = null) => new(true, message);
    public static ApiResponse Fail(string message) => new(false, message);
}

// Sikeres válasz adatokkal
public class ApiResponse<T> : ApiResponse
{
    public T? Data { get; }

    private ApiResponse(T data, bool isSuccess, string? message = null) : base(isSuccess, message)
    {
        Data = data;
    }

    public static ApiResponse<T> Success(T data, string? message = null) => new(data, true, message);
}