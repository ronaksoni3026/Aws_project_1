import datetime
from typing import Tuple, List
from backend.models.student import Student
from backend.models.job import Job


def evaluate_eligibility(student: Student, job: Job) -> Tuple[bool, List[str]]:
    """
    Centralized Server-Side Eligibility Engine.
    Performs deterministic mathematical and categorical comparisons between
    the student's live academic profile and the job's hard criteria,
    including application deadlines.

    Returns:
        (is_eligible, reasons_for_ineligibility)
    """
    reasons: List[str] = []

    # 1. Mathematical CGPA comparison
    if job.min_cgpa > 0.0:
        if student.cgpa < job.min_cgpa:
            reasons.append(
                f"Minimum CGPA required is {job.min_cgpa:.2f}, but student profile has {student.cgpa:.2f}"
            )

    # 2. Categorical Branch / Department comparison
    if job.allowed_branches:
        normalized_allowed = [b.strip().upper() for b in job.allowed_branches if b.strip()]
        student_branch = (student.branch or "").strip().upper()
        if student_branch not in normalized_allowed:
            allowed_str = ", ".join(job.allowed_branches)
            reasons.append(
                f"Student branch '{student.branch or 'N/A'}' is not included in eligible departments: [{allowed_str}]"
            )

    # 3. Categorical Graduation Year comparison
    if job.allowed_graduation_years:
        if student.graduation_year not in job.allowed_graduation_years:
            allowed_years_str = ", ".join(str(y) for y in job.allowed_graduation_years)
            reasons.append(
                f"Graduation year {student.graduation_year} does not match eligible graduating batches: [{allowed_years_str}]"
            )

    # 4. Resume verification check
    if not student.resume_url or not student.resume_url.strip():
        reasons.append("A validated resume must be uploaded or linked to student profile before applying")

    # 5. Application deadline check
    if job.deadline:
        now = datetime.datetime.utcnow()
        if now > job.deadline:
            reasons.append(
                f"Application deadline ({job.deadline.strftime('%Y-%m-%d %H:%M')}) has passed"
            )

    is_eligible = len(reasons) == 0
    return is_eligible, reasons
