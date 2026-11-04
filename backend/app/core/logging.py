import logging
import sys
from typing import Any


REDACTED_KEYS = frozenset(
    {"token", "token_hash", "raw_token", "access_token", "content", "authorization", "password"}
)


class SensitiveDataFilter(logging.Filter):
    """Strip sensitive keys from log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, dict):
            record.args = {
                k: "[REDACTED]" if k.lower() in REDACTED_KEYS else v
                for k, v in record.args.items()
            }
        return True


def setup_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(SensitiveDataFilter())

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        handlers=[handler],
    )

    # Silence noisy libraries in production
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)

