"""
Generates two fictional, dummy sample resume PDFs for demo purposes:
  - sample_resume_REJECTED_John_Carter.pdf  (deliberately weak resume)
  - sample_resume_ACCEPTED_Sarah_Nguyen.pdf (deliberately strong resume)

Both people are entirely fictional. Run once:
    python generate_samples.py
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
from reportlab.lib.enums import TA_LEFT

styles = getSampleStyleSheet()

name_style = ParagraphStyle("Name", parent=styles["Title"], fontSize=20, spaceAfter=2, alignment=TA_LEFT)
contact_style = ParagraphStyle("Contact", parent=styles["Normal"], fontSize=9.5, textColor=colors.HexColor("#333333"), spaceAfter=12)
h2_style = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=12, spaceBefore=12, spaceAfter=4, textColor=colors.HexColor("#1a1a1a"))
body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=14)
role_style = ParagraphStyle("Role", parent=styles["Normal"], fontSize=10.5, leading=14, spaceBefore=6, fontName="Helvetica-Bold")
sub_style = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=9.5, leading=13, textColor=colors.HexColor("#555555"), spaceAfter=2)
bullet_style = ParagraphStyle("Bullet", parent=styles["Normal"], fontSize=10, leading=14)


def make_bullets(items):
    # Use a literal "-" text bullet rather than reportlab's ListFlowable bullet glyph.
    # ListFlowable's symbol-font bullet does not survive PDF text extraction cleanly
    # (it round-trips as a "(cid:127)" artifact), which would make these sample PDFs
    # behave differently from real-world resumes when parsed by pdfplumber/ATS tools.
    flowables = []
    for t in items:
        flowables.append(Paragraph(f"- {t}", bullet_style))
        flowables.append(Spacer(1, 3))
    return flowables


# =========================================================
# WEAK RESUME — designed to score poorly
# =========================================================
def build_rejected():
    doc = SimpleDocTemplate(
        "sample_resume_REJECTED_John_Carter.pdf",
        pagesize=letter,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
    )
    story = []

    story.append(Paragraph("John Carter", name_style))
    story.append(Paragraph("coolguy1999@example.com &nbsp;|&nbsp; 555-0192", contact_style))

    story.append(Paragraph("OBJECTIVE", h2_style))
    story.append(Paragraph(
        "Seeking a challenging position where I can grow and utilize my skills to help the company "
        "succeed and further my career in a dynamic environment.", body_style))

    story.append(Paragraph("EXPERIENCE", h2_style))

    story.append(Paragraph("Marketing Coordinator — Brightway Solutions", role_style))
    story.append(Paragraph("2021 - Present", sub_style))
    story.extend(make_bullets([
        "Responsible for managing social media accounts.",
        "Helped with email marketing campaigns.",
        "Worked on Excel spreadsheets for reporting.",
        "In charge of scheduling meetings for the team.",
    ]))

    story.append(Paragraph("Marketing Assistant — Dalton Retail Group", role_style))
    story.append(Paragraph("2019 - 2021", sub_style))
    story.extend(make_bullets([
        "Was tasked with updating the company website.",
        "Helped with organizing promotional events.",
        "Responsible for customer emails.",
    ]))

    story.append(Paragraph("Sales Associate — QuickMart", role_style))
    story.append(Paragraph("2016 - 2018", sub_style))
    story.extend(make_bullets([
        "Worked on the sales floor.",
        "Helped with inventory.",
    ]))
    story.append(Paragraph(
        "<i>(Note: an unexplained gap exists between 2018 and 2019 with no context given.)</i>",
        sub_style))

    story.append(Paragraph("SKILLS", h2_style))
    story.append(Paragraph(
        "Microsoft Office, Excel, Word, PowerPoint, Social Media, Team Player, Hardworking, "
        "Detail-Oriented, Communication, Photoshop, Marketing, Sales, Customer Service, "
        "Go-Getter, Fast Learner, Passionate, Flash, Multi-tasking", body_style))

    story.append(Paragraph("EDUCATION", h2_style))
    story.append(Paragraph("Riverside Community College — General Studies (no graduation year listed)", body_style))
    story.append(Paragraph("Lincoln High School — Diploma, 2014", body_style))

    story.append(Paragraph("INTERESTS", h2_style))
    story.append(Paragraph("Watching movies, hanging out with friends, video games.", body_style))

    doc.build(story)
    print("Built sample_resume_REJECTED_John_Carter.pdf")


# =========================================================
# STRONG RESUME — designed to score well
# =========================================================
def build_accepted():
    doc = SimpleDocTemplate(
        "sample_resume_ACCEPTED_Sarah_Nguyen.pdf",
        pagesize=letter,
        topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
    )
    story = []

    story.append(Paragraph("Sarah Nguyen", name_style))
    story.append(Paragraph(
        "sarah.nguyen@email.com &nbsp;|&nbsp; (555) 014-7788 &nbsp;|&nbsp; Austin, TX &nbsp;|&nbsp; "
        "linkedin.com/in/sarahnguyen-dev &nbsp;|&nbsp; github.com/snguyen-dev",
        contact_style))

    story.append(Paragraph("SUMMARY", h2_style))
    story.append(Paragraph(
        "Backend-focused software engineer with 6 years of experience building and scaling distributed "
        "systems in fintech. Specializes in reducing infrastructure cost and latency without sacrificing "
        "reliability. Led two production migrations with zero downtime.", body_style))

    story.append(Paragraph("EXPERIENCE", h2_style))

    story.append(Paragraph("Senior Software Engineer — Ledgerly Inc.", role_style))
    story.append(Paragraph("Jun 2022 - Present  |  Austin, TX", sub_style))
    story.extend(make_bullets([
        "Led migration of the payments service from a monolith to microservices, reducing p95 latency by 42% and cutting monthly infrastructure cost by $120,000.",
        "Designed and shipped a real-time fraud-detection pipeline processing 3.2M transactions/day with 99.98% uptime.",
        "Mentored 4 junior engineers; 3 were promoted within 18 months under a structured growth plan I built.",
        "Reduced average CI/CD pipeline time from 26 minutes to 9 minutes by restructuring the test suite and enabling parallelized builds.",
    ]))

    story.append(Paragraph("Software Engineer — Northbridge Analytics", role_style))
    story.append(Paragraph("Aug 2019 - May 2022  |  Remote", sub_style))
    story.extend(make_bullets([
        "Built an internal reporting API adopted by 8 teams company-wide, replacing manual spreadsheet reporting and saving an estimated 15 hours/week across teams.",
        "Optimized core PostgreSQL queries, reducing average dashboard load time from 4.1s to 0.8s.",
        "Owned on-call rotation for a service with 99.95% SLA; authored the incident runbook still in use today.",
    ]))

    story.append(Paragraph("Software Engineer Intern — Northbridge Analytics", role_style))
    story.append(Paragraph("May 2018 - Aug 2018  |  Remote", sub_style))
    story.extend(make_bullets([
        "Built a Python ETL script that automated a previously manual weekly data-cleaning task, saving 6 hours/week.",
    ]))

    story.append(Paragraph("SKILLS", h2_style))
    story.append(Paragraph("<b>Languages:</b> Python, Go, TypeScript, SQL", body_style))
    story.append(Paragraph("<b>Backend / Infra:</b> FastAPI, Django, gRPC, Kafka, Docker, Kubernetes, AWS (EKS, RDS, S3)", body_style))
    story.append(Paragraph("<b>Data:</b> PostgreSQL, Redis, Elasticsearch", body_style))
    story.append(Paragraph("<b>Practices:</b> CI/CD, TDD, on-call incident response, system design", body_style))

    story.append(Paragraph("PROJECTS", h2_style))
    story.extend(make_bullets([
        "<b>openledger-cli</b> (github.com/snguyen-dev/openledger-cli) — open-source CLI for reconciling ledger exports; 340+ GitHub stars, 12 external contributors.",
    ]))

    story.append(Paragraph("EDUCATION", h2_style))
    story.append(Paragraph("B.S. in Computer Science — University of Texas at Austin, 2019", body_style))

    doc.build(story)
    print("Built sample_resume_ACCEPTED_Sarah_Nguyen.pdf")


if __name__ == "__main__":
    build_rejected()
    build_accepted()
