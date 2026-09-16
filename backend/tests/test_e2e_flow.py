"""
Integration test covering the primary path through the app: signup ->
pending-gate -> admin approval -> enroll -> competency engine -> take an
MCQ assessment -> integrity violations escalate to auto-submit -> grading.

Run with: pytest tests/test_e2e_flow.py -v
(requires a local Postgres+pgvector - see tests/conftest.py)
"""


def test_pending_account_is_gated_until_admin_approves(client, admin_headers):
    r = client.post(
        "/auth/signup",
        json={
            "email": "pytest.trainee@imd.gov.in",
            "password": "Password123",
            "role": "trainee",
            "full_name": "Pytest Trainee",
            "employee_id": "IMD-PYTEST-001",
        },
    )
    assert r.status_code == 201
    assert r.json()["status"] == "pending"
    trainee_id = r.json()["id"]

    r = client.post("/auth/login", json={"email": "pytest.trainee@imd.gov.in", "password": "Password123"})
    assert r.status_code == 200
    trainee_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    # Pending trainees can authenticate but the dashboard itself stays locked.
    r = client.get("/trainee/enrollments", headers=trainee_headers)
    assert r.status_code == 403

    r = client.post(f"/admin/trainees/{trainee_id}/review", json={"action": "approve"}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "approved"

    r = client.get("/trainee/enrollments", headers=trainee_headers)
    assert r.status_code == 200


def test_competency_engine_ranks_the_matching_trainer(client, admin_headers):
    r = client.get("/admin/courses", headers=admin_headers)
    course = next(c for c in r.json() if c["title"] == "AWS Sensor Calibration")

    r = client.get(f"/admin/courses/{course['id']}/trainer-suggestions", headers=admin_headers)
    assert r.status_code == 200
    suggestions = r.json()
    assert suggestions, "expected at least one ranked trainer"
    assert suggestions[0]["email"] == "trainer.radar@imd.gov.in"
    assert "AWS Sensor Calibration" in suggestions[0]["matched_tags"]


def test_assessment_integrity_auto_submits_after_three_violations(client, admin_headers):
    # Approve + log in a fresh trainee for this test's own attempt.
    client.post(
        "/auth/signup",
        json={
            "email": "pytest.trainee2@imd.gov.in",
            "password": "Password123",
            "role": "trainee",
            "full_name": "Pytest Trainee Two",
            "employee_id": "IMD-PYTEST-002",
        },
    )
    r = client.get("/admin/trainees/pending", headers=admin_headers)
    trainee_id = next(u["id"] for u in r.json() if u["email"] == "pytest.trainee2@imd.gov.in")
    client.post(f"/admin/trainees/{trainee_id}/review", json={"action": "approve"}, headers=admin_headers)

    r = client.post("/auth/login", json={"email": "pytest.trainee2@imd.gov.in", "password": "Password123"})
    trainee_headers = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = client.get("/courses", headers=trainee_headers)
    course = next(c for c in r.json() if c["title"] == "AWS Sensor Calibration")
    client.post(f"/trainee/courses/{course['id']}/enroll", headers=trainee_headers)

    r = client.get(f"/assessments/course/{course['id']}/available", headers=trainee_headers)
    questionnaire_id = r.json()[0]["id"]

    r = client.post(f"/assessments/questionnaires/{questionnaire_id}/start", headers=trainee_headers)
    assert r.status_code == 200
    attempt_id = r.json()["attempt"]["id"]
    questions = r.json()["questionnaire"]["questions"]
    assert "correct_option" not in questions[0]  # answer key must never reach the trainee

    for expected_action in ("warning", "final_warning", "auto_submit"):
        r = client.post(
            f"/assessments/attempts/{attempt_id}/violation",
            json={"violation_type": "tab_switch"},
            headers=trainee_headers,
        )
        assert r.status_code == 200
        assert r.json()["action"] == expected_action

    answers = {str(q["id"]): "a" for q in questions}
    r = client.post(f"/assessments/attempts/{attempt_id}/submit", json={"answers": answers}, headers=trainee_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "auto_submitted"
    assert r.json()["total_marks"] == 4.0
