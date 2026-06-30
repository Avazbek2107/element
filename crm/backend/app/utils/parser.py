"""
Word (.docx) va PDF fayllardan test savollarini parse qilish.

Qo'llab-quvvatlanadigan format:
    1. Savol matni?
    A) Variant A
    B) Variant B
    C) Variant C
    D) Variant D
    Javob: B

    yoki

    1-savol. Savol matni?
    A. Variant A
    B. Variant B
    C. Variant C
    D. Variant D
    To'g'ri javob: C
"""
import re
from typing import IO


def _parse_text(text: str) -> list[dict]:
    """Matndan savollar ro'yxatini ajratib oladi."""
    # Satrlarga ajratib, bo'sh satrlarni tozalaymiz
    lines = [ln.strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]

    questions = []
    current: dict | None = None

    # Savol boshi: "1.", "1)", "1-savol.", "Savol 1."
    q_start = re.compile(
        r'^(?:\d+[\.\-](?:savol)?\.?|\d+\))\s+(.+)', re.IGNORECASE
    )
    # Variantlar: "A)", "A.", "a)", "a."
    opt = re.compile(r'^([ABCDabcd])[\.)\-]\s+(.+)')
    # Javob satri: "Javob: B", "To'g'ri javob: A", "Answer: C"
    ans = re.compile(
        r"(?:to['']?g['']?ri\s+)?javob\s*[:=\-]\s*([ABCDabcd])",
        re.IGNORECASE
    )

    for line in lines:
        m = q_start.match(line)
        if m:
            if current and _is_complete(current):
                questions.append(current)
            current = {
                'question_text': m.group(1).strip(),
                'option_a': '',
                'option_b': '',
                'option_c': '',
                'option_d': '',
                'correct_answer': 'A',
                'points': 1,
            }
            continue

        if current is None:
            continue

        m = opt.match(line)
        if m:
            letter = m.group(1).upper()
            value = m.group(2).strip()
            key = f'option_{letter.lower()}'
            current[key] = value
            continue

        m = ans.search(line)
        if m:
            current['correct_answer'] = m.group(1).upper()
            continue

        # Savol matni ko'p satrda bo'lsa qo'shamiz
        if (
            not current.get('option_a')
            and not line[0:2].upper() in ('A)', 'A.', 'B)', 'B.')
        ):
            current['question_text'] += ' ' + line

    if current and _is_complete(current):
        questions.append(current)

    return questions


def _is_complete(q: dict) -> bool:
    return all([
        q.get('question_text'),
        q.get('option_a'),
        q.get('option_b'),
        q.get('option_c'),
        q.get('option_d'),
    ])


def parse_docx(file: IO[bytes]) -> list[dict]:
    from docx import Document
    doc = Document(file)
    text = '\n'.join(p.text for p in doc.paragraphs)
    return _parse_text(text)


def parse_pdf(file: IO[bytes]) -> list[dict]:
    import pdfplumber
    text_parts = []
    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
    return _parse_text('\n'.join(text_parts))
