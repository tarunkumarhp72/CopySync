from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found",
        )


class ForbiddenError(HTTPException):
    def __init__(self, detail: str = "Access denied"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ConflictError(HTTPException):
    def __init__(self, current_version: int | None = None):
        detail: dict = {"message": "Version conflict — note was modified by another device"}
        if current_version is not None:
            detail["current_version"] = current_version
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class SessionNotAvailableError(HTTPException):
    def __init__(self, reason: str = "Session not available"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=reason)


class ClipboardPayloadTooLargeError(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Clipboard payload exceeds the maximum allowed size",
        )


class RateLimitError(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests — please slow down",
        )


class QuotaExceededError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)

