from app.services.ocr_processing import chunk_text


def test_chunk_text_empty_returns_no_chunks():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_chunk_text_short_text_is_a_single_chunk():
    text = "IMD trains meteorologists on radar and AWS sensor calibration."
    assert chunk_text(text, chunk_size=1000) == [text]


def test_chunk_text_splits_long_text_with_overlap():
    paragraph = "Radar calibration requires periodic verification. " * 40  # ~2080 chars
    chunks = chunk_text(paragraph, chunk_size=500, overlap=50)
    assert len(chunks) > 1
    # every chunk should stay close to the requested size (never wildly over)
    assert all(len(c) <= 550 for c in chunks)
    # progress must always be made - no infinite loop / empty output
    assert all(c.strip() for c in chunks)
