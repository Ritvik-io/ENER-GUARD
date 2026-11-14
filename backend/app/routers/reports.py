"""
SafeScout MINE-ENERGY - Industrial Inspection & Energy Audit Report Generator
Exports: High-Precision CSV & Formatted Executive PDF using ReportLab
"""

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import csv
import io
import time
from datetime import datetime

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from backend.app.database import get_db
from backend.app.models import Inspection

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/csv")
async def export_inspections_csv(db: AsyncSession = Depends(get_db)):
    """Export inspection logbook as CSV file."""
    result = await db.execute(select(Inspection).order_by(Inspection.timestamp.desc()))
    records = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        "Inspection Code", "Timestamp UTC", "Site Name", "Zone Name", "Equipment ID",
        "SLAM X (m)", "SLAM Y (m)", "Fault Type", "Severity", "Detection Method",
        "Confidence", "Power Loss (kW)", "Daily Loss (kWh)", "Potential Annual Saving (kWh)",
        "Annual Cost (INR)", "Priority", "Confirmation Status", "Repair Status",
        "Verified Achieved Saving (kWh)", "Operator Remarks"
    ])

    for r in records:
        writer.writerow([
            r.inspection_code,
            r.timestamp.isoformat() if r.timestamp else "",
            r.site_name,
            r.zone_name,
            r.equipment_id,
            r.location_x,
            r.location_y,
            r.fault_type,
            r.severity,
            r.detection_method,
            r.confidence_score,
            r.estimated_power_loss_kw,
            r.estimated_energy_loss_kwh_day,
            r.potential_annual_saving_kwh,
            r.annual_financial_saving_inr,
            r.maintenance_priority,
            r.confirmation_status,
            r.repair_status,
            r.verified_saving_kwh,
            r.operator_remarks or ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=safescout_audit_{int(time.time())}.csv"}
    )

@router.get("/pdf")
async def export_inspections_pdf(db: AsyncSession = Depends(get_db)):
    """Generate formal engineering audit report PDF with ReportLab."""
    result = await db.execute(select(Inspection).order_by(Inspection.timestamp.desc()))
    records = result.scalars().all()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#475569'),
        spaceAfter=15
    )
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )

    # Document Header
    story.append(Paragraph("SafeScout MINE-ENERGY", title_style))
    story.append(Paragraph("AI-Enabled IoT Mine Safety & Energy Audit Official Report", subtitle_style))
    story.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Autonomous Robotic Inspection", styles['Normal']))
    story.append(Spacer(1, 15))

    # Summary Statistics Calculation
    total_potential_kwh = sum(r.potential_annual_saving_kwh or 0 for r in records)
    total_potential_inr = sum(r.annual_financial_saving_inr or 0 for r in records)
    total_verified_kwh = sum(r.verified_saving_kwh or 0 for r in records)

    summary_data = [
        ["Total Anomalies Audited", str(len(records)), "Potential Annual Savings", f"₹ {total_potential_inr:,.2f}"],
        ["Verified Energy Achieved", f"{total_verified_kwh:,.1f} kWh", "Potential Avoidable Energy", f"{total_potential_kwh:,.1f} kWh/year"]
    ]
    t_summary = Table(summary_data, colWidths=[130, 130, 130, 130])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#0f172a')),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 20))

    # Detailed Findings Table
    story.append(Paragraph("<b>Detailed Inspection Log & Equipment Findings</b>", styles['Heading3']))
    story.append(Spacer(1, 8))

    table_data = [
        ["Code", "Equipment", "Zone", "Fault Type", "Severity", "Power (kW)", "Annual (₹)", "Status"]
    ]

    for r in records[:25]: # First 25 records
        table_data.append([
            r.inspection_code[:12],
            r.equipment_id[:12],
            r.zone_name[:14],
            r.fault_type[:15],
            r.severity,
            f"{r.estimated_power_loss_kw:.2f}",
            f"{r.annual_financial_saving_inr:,.0f}",
            r.repair_status
        ])

    col_widths = [65, 65, 75, 80, 50, 55, 65, 65]
    t_records = Table(table_data, colWidths=col_widths)
    t_records.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')])
    ]))
    story.append(t_records)

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=safescout_report_{int(time.time())}.pdf"}
    )

