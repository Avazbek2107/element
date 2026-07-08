from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, timedelta
import os, json

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.group import Group
from app.models.attendance import Attendance, AttendanceStatus
from app.utils.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _client():
    key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY sozlanmagan")
    try:
        import anthropic
        return anthropic.Anthropic(api_key=key)
    except ImportError:
        raise HTTPException(status_code=503, detail="anthropic paketi o'rnatilmagan")


def _call(client, system: str, user_msg: str, history: list = [], max_tokens=1024):
    messages = []
    for h in history[-6:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_msg})
    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    return resp.content[0].text


# ── 1. Test savollari generatsiyasi ─────────────────────────────────

class GenQuestionsReq(BaseModel):
    topic: str
    count: int = 10
    subject: Optional[str] = None
    difficulty: str = "medium"   # easy | medium | hard


@router.post("/generate-questions")
def generate_questions(
    body: GenQuestionsReq,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.teacher)),
):
    client = _client()
    diff = {"easy": "oson", "medium": "o'rta", "hard": "qiyin"}.get(body.difficulty, "o'rta")
    subject_line = f"Fan: {body.subject}\n" if body.subject else ""

    prompt = f"""Sen o'zbek tilidagi ta'lim platformasi uchun test savollari yaratyapsan.

Mavzu: {body.topic}
{subject_line}Savollar soni: {body.count}
Qiyinlik darajasi: {diff}

Faqat quyidagi JSON formatni qaytargin (boshqa matn yo'q):

{{
  "questions": [
    {{
      "question_text": "Savol matni bu yerda",
      "option_a": "Birinchi variant",
      "option_b": "Ikkinchi variant",
      "option_c": "Uchinchi variant",
      "option_d": "To'rtinchi variant",
      "correct_answer": "A",
      "points": 1
    }}
  ]
}}

Talablar:
- Barcha savollar o'zbek tilida bo'lsin
- correct_answer faqat A, B, C yoki D bo'lsin
- Savollar mavzuga mos, mantiqiy va aniq bo'lsin
- Variantlar bir-biridan farqli bo'lsin"""

    text = _call(client, "Siz test savollari generatsiya qiluvchi AI assistantsiz.", prompt, max_tokens=4096)
    # JSON tozalash
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI javobini tahlil qilishda xato. Qayta urinib ko'ring.")


# ── 2. Hisobot tahlili ───────────────────────────────────────────────

class AnalyzeReportReq(BaseModel):
    group_name: str
    teacher_name: Optional[str] = None
    period: dict
    summary: dict
    students: list


@router.post("/analyze-report")
def analyze_report(
    body: AnalyzeReportReq,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.teacher, module="ai")),
):
    client = _client()
    s = body.summary

    at_risk = [
        st for st in body.students
        if st.get("absent", 0) >= 3
        or (st.get("attend_rate") is not None and st["attend_rate"] < 70)
        or (st.get("avg_test_pct") is not None and st["avg_test_pct"] < 50)
    ]

    risk_text = ""
    if at_risk:
        risk_text = f"\nE'tibor talab etadigan {len(at_risk)} ta o'quvchi:\n"
        for st in at_risk[:8]:
            parts = []
            if st.get("absent", 0) >= 3:
                parts.append(f"{st['absent']} dars qoldirgan")
            if st.get("attend_rate") is not None and st["attend_rate"] < 70:
                parts.append(f"davomat {st['attend_rate']}%")
            if st.get("avg_test_pct") is not None and st["avg_test_pct"] < 50:
                parts.append(f"test {st['avg_test_pct']}%")
            risk_text += f"- {st['name']}: {', '.join(parts)}\n"

    prompt = f"""Guruh: {body.group_name}
{f"O'qituvchi: {body.teacher_name}" if body.teacher_name else ""}
Davr: {body.period.get('date_from')} – {body.period.get('date_to')}

Statistika:
• O'quvchilar: {s.get('student_count', 0)} ta
• O'tilgan darslar: {s.get('total_lessons', 0)} ta
• Davomat: {s.get('attend_rate', 0)}% (keldi: {s.get('total_present',0)}, kelmadi: {s.get('total_absent',0)}, kech: {s.get('total_late',0)}, sababli: {s.get('total_excused',0)})
• Testlar: {s.get('total_tests', 0)} ta, topshirildi: {s.get('test_submissions', 0)} ta
• Test o'rtacha bali: {s.get('avg_test_pct') if s.get('avg_test_pct') is not None else "ma'lumot yo'q"}%
{risk_text}

Quyidagi tartibda o'zbek tilida tahlil yoz:

**Umumiy holat**
(2-3 jumla: davomat va test ko'rsatkichlari yaxshi yoki yomonligini baholash)

**Asosiy muammolar**
(Aniq raqamlar bilan: qaysi muammolar bor)

**Tavsiyalar**
(3-4 ta konkret tavsiya, o'qituvchi uchun)

**Xulosa**
(1 jumla)

Rasmiy lekin tushunarli tilda yoz. Soxta gap ishlatma."""

    text = _call(
        client,
        "Siz o'zbek ta'lim markazi uchun hisobot tahlili qiluvchi AI assistantsiz. O'zbek tilida aniq va foydali tahlil bering.",
        prompt,
        max_tokens=1024,
    )
    return {"analysis": text}


# ── 3. AI Chat ──────────────────────────────────────────────────────

class ChatReq(BaseModel):
    message: str
    history: Optional[List[dict]] = []


@router.post("/chat")
def ai_chat(
    body: ChatReq,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.teacher, module="ai")),
):
    client = _client()
    today = date.today()

    total_students = db.query(StudentProfile).count()
    total_groups   = db.query(Group).filter(Group.is_active == True).count()

    today_att = db.query(Attendance).filter(Attendance.date == today).all()
    today_present = sum(1 for a in today_att if a.status == AttendanceStatus.present)
    today_absent  = sum(1 for a in today_att if a.status == AttendanceStatus.absent)
    today_late    = sum(1 for a in today_att if a.status == AttendanceStatus.late)

    # Oxirgi 30 kunda eng ko'p dars qoldirgan o'quvchilar
    month_ago = today - timedelta(days=30)
    month_att = db.query(Attendance).filter(
        Attendance.date >= month_ago,
        Attendance.status == AttendanceStatus.absent,
    ).all()
    absent_count: dict = {}
    for a in month_att:
        absent_count[a.student_id] = absent_count.get(a.student_id, 0) + 1
    top_absent_ids = sorted(absent_count, key=lambda x: -absent_count[x])[:5]
    top_absent_info = []
    for sid in top_absent_ids:
        sp = db.query(StudentProfile).filter(StudentProfile.id == sid).first()
        if sp and sp.user:
            top_absent_info.append(f"{sp.user.first_name} {sp.user.last_name}: {absent_count[sid]} marta")

    system = f"""Sen "element" o'quv markazining AI yordamchisisisan. Faqat o'zbek tilida qisqa va aniq javob ber.

Hozirgi holat ({today}):
- Jami o'quvchilar: {total_students} ta
- Faol guruhlar: {total_groups} ta
- Bugun keldi: {today_present}, kelmadi: {today_absent}, kech qoldi: {today_late}
- Oxirgi 30 kunda ko'p dars qoldirganlar: {', '.join(top_absent_info) if top_absent_info else "ma'lumot yo'q"}
- Foydalanuvchi: {current_user.first_name} {current_user.last_name} ({current_user.role})

Qoidalar:
- Faqat platforma haqidagi savollarga javob ber
- 2-4 jumlada javob ber
- Raqamlarni aniq ko'rsat
- Boshqa mavzularda: "Bu savolga javob bera olmayman, platformaga oid savollar bering" de"""

    reply = _call(client, system, body.message, body.history or [], max_tokens=400)
    return {"reply": reply}
