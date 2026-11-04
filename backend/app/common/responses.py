from typing import Any

from fastapi.responses import JSONResponse


def ok(data: Any = None, message: str = "OK") -> JSONResponse:
    return JSONResponse({"status": "ok", "message": message, "data": data})


def created(data: Any = None) -> JSONResponse:
    return JSONResponse({"status": "created", "data": data}, status_code=201)

