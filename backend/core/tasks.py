import logging
from backend.database import SessionLocal
from backend.models.application import Application
from backend.models.notification import Notification

logger = logging.getLogger("placement_portal.background_tasks")


def notify_students_on_job_deletion(job_id: int, job_title: str, company_name: str) -> None:
    """
    Observer process executed asynchronously via FastAPI BackgroundTasks.
    Iterates through all students in the archived job's applicant pool and
    dispatches automated notification records without blocking the API thread.
    """
    db = SessionLocal()
    try:
        applications = db.query(Application).filter(Application.job_id == job_id).all()
        student_ids = [app.student_id for app in applications]

        if not student_ids:
            logger.info(f"BackgroundTasks: No applicants found for soft-deleted job {job_id}.")
            return

        notifications = [
            Notification(
                student_id=s_id,
                job_id=job_id,
                title=f"Notice: Job Archived ({job_title})",
                message=(
                    f"The position '{job_title}' posted by '{company_name}' has been archived by the recruiter. "
                    "Your historical application record remains safely preserved for platform reporting."
                ),
            )
            for s_id in student_ids
        ]

        db.bulk_save_objects(notifications)
        db.commit()
        logger.info(
            f"BackgroundTasks: Successfully dispatched {len(notifications)} notification(s) "
            f"for archived job {job_id} ({job_title})."
        )
    except Exception as e:
        db.rollback()
        logger.error(f"BackgroundTasks: Error dispatching job deletion notifications: {e}", exc_info=True)
    finally:
        db.close()
