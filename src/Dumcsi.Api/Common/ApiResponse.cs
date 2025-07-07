namespace Dumcsi.Api.Common;

// Ezt az új belső osztályt adjuk hozzá
public class ErrorPayload
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class ApiResponse
{
    public bool IsSuccess { get; }
    public string? Message { get; }

    // Új property a hiba objektumnak
    public ErrorPayload? Error { get; }

    // Módosított konstruktor
    protected ApiResponse(bool isSuccess, string? message = null, ErrorPayload? error = null)
    {
        IsSuccess = isSuccess;
        Message = message;
        Error = error;
    }

    public static ApiResponse Success(string? message = null) => new(true, message);
    
    // Új Fail metódus hibakóddal
    public static ApiResponse Fail(string code, string message) => new(false, null, new ErrorPayload { Code = code, Message = message });
}

public class ApiResponse<T> : ApiResponse
{
    public T? Data { get; }

    private ApiResponse(T? data, bool isSuccess, string? message = null, ErrorPayload? error = null) 
        : base(isSuccess, message, error)
    {
        Data = data;
    }

    public static ApiResponse<T> Success(T data, string? message = null) => new(data, true, message, null);
    
    // Típusos Fail metódus is kell
    public static new ApiResponse<T> Fail(string code, string message) => new(default, false, null, new ErrorPayload { Code = code, Message = message });
}