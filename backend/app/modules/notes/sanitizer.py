import re

import bleach
from bleach.css_sanitizer import CSSSanitizer
from fastapi import HTTPException, status

from app.core.config import settings

ALLOWED_TAGS = {
    "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
    "h1", "h2", "h3", "ul", "ol", "li", "code", "mark", "span", "img"
}
ALLOWED_STYLES = [
    "color", "background-color", "font-size", "font-family"
]
_css_sanitizer = CSSSanitizer(allowed_css_properties=ALLOWED_STYLES)
IMAGE_ID_RE = re.compile(r"/uploads/images/([0-9a-fA-F-]{36})(?:$|[?#])")
MAX_NOTE_CHARACTERS = 20000


def _attributes(tag: str, name: str, value: str) -> bool:
    if tag == "img":
        if name == "alt":
            return True
        if name == "width":
            return value.isdigit() and 120 <= int(value) <= 1600
        if name == "data-align":
            return value in {"left", "center", "right"}
        return name == "src" and bool(IMAGE_ID_RE.search(value))
    if tag == "mark" and name in {"data-color", "style"}:
        return True
    if tag == "span" and name == "style":
        return True
    return False


def sanitize_html(content: str) -> str:
    if len(content) > MAX_NOTE_CHARACTERS or len(content.encode("utf-8")) > settings.MAX_NOTE_HTML_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Note content exceeds the limit of 20,000 characters"
        )
    return bleach.clean(
        content,
        tags=ALLOWED_TAGS,
        attributes=_attributes,
        css_sanitizer=_css_sanitizer,
        strip=True,
        strip_comments=True
    )


def image_ids(content: str) -> set[str]:
    return set(IMAGE_ID_RE.findall(content))
