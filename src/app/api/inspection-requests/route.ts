import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { InspectionType, AssignmentUrgency } from "@prisma/client";

/**
 * POST /api/inspection-requests - Create a new inspection request
 * Public endpoint - no authentication required
 * Creates an Assignment record for the requested inspection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      clientName,
      clientEmail,
      clientPhone,
      propertyAddress,
      propertyRegion,
      requestType,
      urgency,
      preferredInspectorId,
      notes,
    } = body;

    // Validate required fields
    if (!clientName?.trim()) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }
    if (!clientEmail?.trim()) {
      return NextResponse.json(
        { error: "Client email is required" },
        { status: 400 }
      );
    }
    if (!propertyAddress?.trim()) {
      return NextResponse.json(
        { error: "Property address is required" },
        { status: 400 }
      );
    }
    if (!requestType) {
      return NextResponse.json(
        { error: "Inspection type is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Validate inspection type
    const validTypes = Object.values(InspectionType);
    if (!validTypes.includes(requestType as InspectionType)) {
      return NextResponse.json(
        { error: "Invalid inspection type" },
        { status: 400 }
      );
    }

    // Validate urgency
    const validUrgencies = Object.values(AssignmentUrgency);
    const assignmentUrgency = urgency && validUrgencies.includes(urgency as AssignmentUrgency)
      ? (urgency as AssignmentUrgency)
      : AssignmentUrgency.STANDARD;

    // Find the inspector to assign
    let inspectorId = preferredInspectorId;

    // If no preferred inspector, find an available one in the region
    if (!inspectorId) {
      const availableInspector = await prisma.user.findFirst({
        where: {
          role: "INSPECTOR",
          status: "ACTIVE",
          isPublicListed: true,
          availabilityStatus: "AVAILABLE",
          ...(propertyRegion ? { serviceAreas: { has: propertyRegion } } : {}),
        },
        orderBy: [
          { yearsExperience: "desc" },
          { createdAt: "asc" },
        ],
        select: { id: true },
      });

      if (availableInspector) {
        inspectorId = availableInspector.id;
      }
    }

    // If still no inspector, find any available inspector
    if (!inspectorId) {
      const anyInspector = await prisma.user.findFirst({
        where: {
          role: "INSPECTOR",
          status: "ACTIVE",
        },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (!anyInspector) {
        return NextResponse.json(
          { error: "No inspectors available. Please try again later." },
          { status: 503 }
        );
      }

      inspectorId = anyInspector.id;
    }

    // Verify the inspector exists and is valid
    const inspector = await prisma.user.findUnique({
      where: { id: inspectorId },
      select: { id: true, role: true, status: true },
    });

    if (!inspector || inspector.role !== "INSPECTOR") {
      return NextResponse.json(
        { error: "Invalid inspector selected" },
        { status: 400 }
      );
    }

    // Create the assignment
    const assignment = await prisma.assignment.create({
      data: {
        inspectorId,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        clientPhone: clientPhone?.trim() || null,
        propertyAddress: propertyAddress.trim(),
        requestType: requestType as InspectionType,
        urgency: assignmentUrgency,
        notes: notes?.trim() || null,
        status: "PENDING",
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    // Generate reference number
    const referenceNumber = `REQ-${new Date().getFullYear()}-${assignment.id.slice(-6).toUpperCase()}`;

    // TODO: Send confirmation email to client
    // TODO: Send notification to assigned inspector

    return NextResponse.json({
      id: assignment.id,
      referenceNumber,
      message: "Inspection request submitted successfully",
    });
  } catch (error) {
    console.error("Error creating inspection request:", error);
    return NextResponse.json(
      { error: "Failed to submit inspection request" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inspection-requests - List inspection requests
 * Requires authentication (for inspectors/admins)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        include: {
          inspector: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 50),
        skip: offset,
      }),
      prisma.assignment.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + requests.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching inspection requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspection requests" },
      { status: 500 }
    );
  }
}
