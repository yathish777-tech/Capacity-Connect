import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    trainer = "trainer"
    trainee = "trainee"


class UserStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class CourseStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class AssignmentStatus(str, enum.Enum):
    unassigned = "unassigned"
    requested = "requested"
    accepted = "accepted"
    declined = "declined"


class MaterialType(str, enum.Enum):
    pdf = "pdf"
    ppt = "ppt"
    video = "video"
    document = "document"


class MaterialStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class EnrollmentStatus(str, enum.Enum):
    enrolled = "enrolled"
    completed = "completed"


class AttemptStatus(str, enum.Enum):
    in_progress = "in_progress"
    submitted = "submitted"
    auto_submitted = "auto_submitted"


class ReAttemptStatus(str, enum.Enum):
    requested = "requested"
    approved = "approved"
    rejected = "rejected"


class ViolationType(str, enum.Enum):
    tab_switch = "tab_switch"
    window_blur = "window_blur"
    fullscreen_exit = "fullscreen_exit"


class CertificateStatus(str, enum.Enum):
    requested = "requested"
    issued = "issued"
    rejected = "rejected"


class AnnouncementCategory(str, enum.Enum):
    course = "course"
    staff = "staff"
    assessment = "assessment"
    achievement = "achievement"


class OptionLetter(str, enum.Enum):
    a = "a"
    b = "b"
    c = "c"
    d = "d"
