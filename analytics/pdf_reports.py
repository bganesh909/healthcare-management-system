"""
Shared PDF generation utilities for the healthcare project.
Uses reportlab to create professional hospital documents.
"""

from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

HOSPITAL_NAME = "City General Hospital"
HOSPITAL_ADDRESS = "123 Healthcare Avenue, Medical District, Metro City - 500001"
HOSPITAL_PHONE = "+91-40-2345-6789"
HOSPITAL_EMAIL = "info@citygeneralhospital.com"

# Colour palette
PRIMARY_COLOR = colors.HexColor("#1a5276")
HEADER_BG = colors.HexColor("#2c3e50")
LIGHT_BG = colors.HexColor("#ecf0f1")
ACCENT_COLOR = colors.HexColor("#2980b9")


def _get_styles():
    """Return a dictionary of reusable paragraph styles."""
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "PDFTitle",
            parent=base["Title"],
            fontSize=18,
            textColor=PRIMARY_COLOR,
            spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "PDFSubtitle",
            parent=base["Normal"],
            fontSize=10,
            textColor=colors.grey,
            spaceAfter=12,
        ),
        "heading": ParagraphStyle(
            "PDFHeading",
            parent=base["Heading2"],
            fontSize=12,
            textColor=PRIMARY_COLOR,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "normal": base["Normal"],
        "bold": ParagraphStyle(
            "PDFBold",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
        ),
        "small": ParagraphStyle(
            "PDFSmall",
            parent=base["Normal"],
            fontSize=8,
            textColor=colors.grey,
        ),
    }
    return styles


def _build_header(styles):
    """Return flowable elements for the hospital header."""
    elements = []
    elements.append(Paragraph(HOSPITAL_NAME, styles["title"]))
    elements.append(Paragraph(HOSPITAL_ADDRESS, styles["subtitle"]))
    elements.append(
        Paragraph(
            f"Phone: {HOSPITAL_PHONE} | Email: {HOSPITAL_EMAIL}",
            styles["subtitle"],
        )
    )
    elements.append(HRFlowable(width="100%", thickness=2, color=PRIMARY_COLOR))
    elements.append(Spacer(1, 12))
    return elements


def _build_footer_text():
    return f"This is a computer-generated document from {HOSPITAL_NAME}. No signature is required."


def _info_table(data, col_widths=None):
    """Create a borderless two-column info table."""
    if col_widths is None:
        col_widths = [2 * inch, 4 * inch]
    table = Table(data, colWidths=col_widths)
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return table


def _items_table(headers, rows, col_widths=None):
    """Create a bordered data table with header row."""
    data = [headers] + rows
    table = Table(data, colWidths=col_widths, repeatRows=1)
    style = TableStyle(
        [
            # Header
            ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("TOPPADDING", (0, 0), (-1, 0), 8),
            # Body
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
            ("TOPPADDING", (0, 1), (-1, -1), 6),
            # Grid
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            # Alternating row colors
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]
    )
    for i in range(1, len(data)):
        if i % 2 == 0:
            style.add("BACKGROUND", (0, i), (-1, i), LIGHT_BG)
    table.setStyle(style)
    return table


def build_pdf(elements_fn):
    """
    Generic PDF builder.  *elements_fn* receives (buffer, styles) and should
    return a list of Platypus flowable objects.  Returns the PDF bytes.
    """
    buf = BytesIO()
    styles = _get_styles()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=15 * mm,
        bottomMargin=20 * mm,
    )

    flowables = _build_header(styles)
    flowables.extend(elements_fn(styles))

    # Footer note
    flowables.append(Spacer(1, 24))
    flowables.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
    flowables.append(Spacer(1, 6))
    flowables.append(Paragraph(_build_footer_text(), styles["small"]))

    doc.build(flowables)
    return buf.getvalue()
