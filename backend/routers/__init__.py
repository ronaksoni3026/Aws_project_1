from backend.routers.auth import router as auth_router
from backend.routers.students import router as students_router
from backend.routers.recruiters import router as recruiters_router
from backend.routers.admin import router as admin_router

__all__ = [
    "auth_router",
    "students_router",
    "recruiters_router",
    "admin_router",
]
