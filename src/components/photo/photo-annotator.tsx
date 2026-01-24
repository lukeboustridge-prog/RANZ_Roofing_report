"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Circle,
  Square,
  ArrowRight,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Download,
  X,
  Check,
  Minus,
} from "lucide-react";

type Tool = "pen" | "arrow" | "circle" | "rectangle" | "text" | "line";
type Color = string;

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  tool: Tool;
  color: Color;
  strokeWidth: number;
  points?: Point[];
  startPoint?: Point;
  endPoint?: Point;
  text?: string;
}

interface PhotoAnnotatorProps {
  imageUrl: string;
  initialAnnotations?: Annotation[];
  onSave?: (annotations: Annotation[], dataUrl: string) => void;
  onCancel?: () => void;
}

const COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#000000", // Black
  "#ffffff", // White
];

const STROKE_WIDTHS = [2, 4, 6, 8];

export function PhotoAnnotator({
  imageUrl,
  initialAnnotations = [],
  onSave,
  onCancel,
}: PhotoAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<Color>("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [undoStack, setUndoStack] = useState<Annotation[][]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[][]>([]);
  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate canvas scale based on container size
  useEffect(() => {
    if (!image || !containerRef.current) return;

    const container = containerRef.current;
    const maxWidth = container.clientWidth - 48;
    const maxHeight = window.innerHeight - 300;

    const scaleX = maxWidth / image.width;
    const scaleY = maxHeight / image.height;
    const scale = Math.min(scaleX, scaleY, 1);

    setCanvasScale(scale);
  }, [image]);

  // Redraw canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !image) return;

    // Set canvas size
    canvas.width = image.width * canvasScale;
    canvas.height = image.height * canvasScale;

    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw annotations
    const allAnnotations = currentAnnotation
      ? [...annotations, currentAnnotation]
      : annotations;

    allAnnotations.forEach((annotation) => {
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      ctx.lineWidth = annotation.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      switch (annotation.tool) {
        case "pen":
          if (annotation.points && annotation.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(
              annotation.points[0].x * canvasScale,
              annotation.points[0].y * canvasScale
            );
            annotation.points.forEach((point) => {
              ctx.lineTo(point.x * canvasScale, point.y * canvasScale);
            });
            ctx.stroke();
          }
          break;

        case "line":
          if (annotation.startPoint && annotation.endPoint) {
            ctx.beginPath();
            ctx.moveTo(
              annotation.startPoint.x * canvasScale,
              annotation.startPoint.y * canvasScale
            );
            ctx.lineTo(
              annotation.endPoint.x * canvasScale,
              annotation.endPoint.y * canvasScale
            );
            ctx.stroke();
          }
          break;

        case "arrow":
          if (annotation.startPoint && annotation.endPoint) {
            const start = annotation.startPoint;
            const end = annotation.endPoint;

            // Draw line
            ctx.beginPath();
            ctx.moveTo(start.x * canvasScale, start.y * canvasScale);
            ctx.lineTo(end.x * canvasScale, end.y * canvasScale);
            ctx.stroke();

            // Draw arrowhead
            const angle = Math.atan2(
              (end.y - start.y) * canvasScale,
              (end.x - start.x) * canvasScale
            );
            const headLength = 15;

            ctx.beginPath();
            ctx.moveTo(end.x * canvasScale, end.y * canvasScale);
            ctx.lineTo(
              end.x * canvasScale - headLength * Math.cos(angle - Math.PI / 6),
              end.y * canvasScale - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(end.x * canvasScale, end.y * canvasScale);
            ctx.lineTo(
              end.x * canvasScale - headLength * Math.cos(angle + Math.PI / 6),
              end.y * canvasScale - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
          }
          break;

        case "circle":
          if (annotation.startPoint && annotation.endPoint) {
            const centerX =
              ((annotation.startPoint.x + annotation.endPoint.x) / 2) * canvasScale;
            const centerY =
              ((annotation.startPoint.y + annotation.endPoint.y) / 2) * canvasScale;
            const radiusX =
              (Math.abs(annotation.endPoint.x - annotation.startPoint.x) / 2) *
              canvasScale;
            const radiusY =
              (Math.abs(annotation.endPoint.y - annotation.startPoint.y) / 2) *
              canvasScale;

            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;

        case "rectangle":
          if (annotation.startPoint && annotation.endPoint) {
            const x = Math.min(annotation.startPoint.x, annotation.endPoint.x) * canvasScale;
            const y = Math.min(annotation.startPoint.y, annotation.endPoint.y) * canvasScale;
            const width =
              Math.abs(annotation.endPoint.x - annotation.startPoint.x) * canvasScale;
            const height =
              Math.abs(annotation.endPoint.y - annotation.startPoint.y) * canvasScale;

            ctx.strokeRect(x, y, width, height);
          }
          break;

        case "text":
          if (annotation.startPoint && annotation.text) {
            ctx.font = `${annotation.strokeWidth * 4}px sans-serif`;
            ctx.fillText(
              annotation.text,
              annotation.startPoint.x * canvasScale,
              annotation.startPoint.y * canvasScale
            );
          }
          break;
      }
    });
  }, [image, annotations, currentAnnotation, canvasScale]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / canvasScale,
      y: (e.clientY - rect.top) / canvasScale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);

    if (tool === "text") {
      setTextPosition(point);
      return;
    }

    setIsDrawing(true);

    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      tool,
      color,
      strokeWidth,
      startPoint: point,
      endPoint: point,
      points: tool === "pen" ? [point] : undefined,
    };

    setCurrentAnnotation(newAnnotation);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAnnotation) return;

    const point = getCanvasPoint(e);

    if (tool === "pen") {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [...(currentAnnotation.points || []), point],
      });
    } else {
      setCurrentAnnotation({
        ...currentAnnotation,
        endPoint: point,
      });
    }
  };

  const handleMouseUp = () => {
    if (currentAnnotation) {
      setUndoStack([...undoStack, annotations]);
      setRedoStack([]);
      setAnnotations([...annotations, currentAnnotation]);
      setCurrentAnnotation(null);
    }
    setIsDrawing(false);
  };

  const handleTextSubmit = () => {
    if (textPosition && textInput.trim()) {
      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        tool: "text",
        color,
        strokeWidth,
        startPoint: textPosition,
        text: textInput,
      };

      setUndoStack([...undoStack, annotations]);
      setRedoStack([]);
      setAnnotations([...annotations, newAnnotation]);
    }
    setTextPosition(null);
    setTextInput("");
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    setRedoStack([...redoStack, annotations]);
    setAnnotations(previous);
    setUndoStack(undoStack.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];
    setUndoStack([...undoStack, annotations]);
    setAnnotations(next);
    setRedoStack(redoStack.slice(0, -1));
  };

  const handleClear = () => {
    setUndoStack([...undoStack, annotations]);
    setRedoStack([]);
    setAnnotations([]);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !onSave) return;

    // Create a full-size canvas for export
    const exportCanvas = document.createElement("canvas");
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx || !image) return;

    exportCanvas.width = image.width;
    exportCanvas.height = image.height;

    // Draw image at full size
    exportCtx.drawImage(image, 0, 0);

    // Draw annotations at full size
    annotations.forEach((annotation) => {
      exportCtx.strokeStyle = annotation.color;
      exportCtx.fillStyle = annotation.color;
      exportCtx.lineWidth = annotation.strokeWidth;
      exportCtx.lineCap = "round";
      exportCtx.lineJoin = "round";

      switch (annotation.tool) {
        case "pen":
          if (annotation.points && annotation.points.length > 0) {
            exportCtx.beginPath();
            exportCtx.moveTo(annotation.points[0].x, annotation.points[0].y);
            annotation.points.forEach((point) => {
              exportCtx.lineTo(point.x, point.y);
            });
            exportCtx.stroke();
          }
          break;

        case "line":
          if (annotation.startPoint && annotation.endPoint) {
            exportCtx.beginPath();
            exportCtx.moveTo(annotation.startPoint.x, annotation.startPoint.y);
            exportCtx.lineTo(annotation.endPoint.x, annotation.endPoint.y);
            exportCtx.stroke();
          }
          break;

        case "arrow":
          if (annotation.startPoint && annotation.endPoint) {
            const start = annotation.startPoint;
            const end = annotation.endPoint;

            exportCtx.beginPath();
            exportCtx.moveTo(start.x, start.y);
            exportCtx.lineTo(end.x, end.y);
            exportCtx.stroke();

            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const headLength = 20;

            exportCtx.beginPath();
            exportCtx.moveTo(end.x, end.y);
            exportCtx.lineTo(
              end.x - headLength * Math.cos(angle - Math.PI / 6),
              end.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            exportCtx.moveTo(end.x, end.y);
            exportCtx.lineTo(
              end.x - headLength * Math.cos(angle + Math.PI / 6),
              end.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            exportCtx.stroke();
          }
          break;

        case "circle":
          if (annotation.startPoint && annotation.endPoint) {
            const centerX = (annotation.startPoint.x + annotation.endPoint.x) / 2;
            const centerY = (annotation.startPoint.y + annotation.endPoint.y) / 2;
            const radiusX = Math.abs(annotation.endPoint.x - annotation.startPoint.x) / 2;
            const radiusY = Math.abs(annotation.endPoint.y - annotation.startPoint.y) / 2;

            exportCtx.beginPath();
            exportCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            exportCtx.stroke();
          }
          break;

        case "rectangle":
          if (annotation.startPoint && annotation.endPoint) {
            const x = Math.min(annotation.startPoint.x, annotation.endPoint.x);
            const y = Math.min(annotation.startPoint.y, annotation.endPoint.y);
            const width = Math.abs(annotation.endPoint.x - annotation.startPoint.x);
            const height = Math.abs(annotation.endPoint.y - annotation.startPoint.y);

            exportCtx.strokeRect(x, y, width, height);
          }
          break;

        case "text":
          if (annotation.startPoint && annotation.text) {
            exportCtx.font = `${annotation.strokeWidth * 4}px sans-serif`;
            exportCtx.fillText(annotation.text, annotation.startPoint.x, annotation.startPoint.y);
          }
          break;
      }
    });

    const dataUrl = exportCanvas.toDataURL("image/png");
    onSave(annotations, dataUrl);
  };

  if (!image) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" ref={containerRef}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg">
        {/* Tools */}
        <div className="flex items-center gap-1 border-r border-border pr-3">
          <Button
            variant={tool === "pen" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTool("pen")}
            title="Pen"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "line" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTool("line")}
            title="Line"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "arrow" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTool("arrow")}
            title="Arrow"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "circle" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTool("circle")}
            title="Circle"
          >
            <Circle className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "rectangle" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTool("rectangle")}
            title="Rectangle"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === "text" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTool("text")}
            title="Text"
          >
            <Type className="h-4 w-4" />
          </Button>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1 border-r border-border pr-3">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`w-6 h-6 rounded-full border-2 ${
                color === c ? "border-primary" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
              title={c}
            />
          ))}
        </div>

        {/* Stroke Width */}
        <div className="flex items-center gap-1 border-r border-border pr-3">
          {STROKE_WIDTHS.map((sw) => (
            <button
              key={sw}
              className={`w-8 h-8 rounded flex items-center justify-center ${
                strokeWidth === sw ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
              onClick={() => setStrokeWidth(sw)}
              title={`${sw}px`}
            >
              <div
                className="rounded-full"
                style={{
                  width: sw + 2,
                  height: sw + 2,
                  backgroundColor: strokeWidth === sw ? "white" : "currentColor",
                }}
              />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={annotations.length === 0}
            title="Clear All"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Save/Cancel */}
        <div className="flex items-center gap-2 ml-auto">
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          {onSave && (
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative border rounded-lg overflow-hidden bg-muted/50">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair"
          style={{
            width: image.width * canvasScale,
            height: image.height * canvasScale,
          }}
        />

        {/* Text input overlay */}
        {textPosition && (
          <div
            className="absolute"
            style={{
              left: textPosition.x * canvasScale,
              top: textPosition.y * canvasScale,
            }}
          >
            <div className="flex items-center gap-1 bg-white shadow-lg rounded border p-1">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTextSubmit();
                  if (e.key === "Escape") {
                    setTextPosition(null);
                    setTextInput("");
                  }
                }}
                className="px-2 py-1 text-sm border-none focus:outline-none w-40"
                placeholder="Enter text..."
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleTextSubmit}>
                <Check className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTextPosition(null);
                  setTextInput("");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground text-center">
        {tool === "text"
          ? "Click on the image to add text"
          : "Click and drag to draw. Use the toolbar to change tools and colors."}
      </p>
    </div>
  );
}

export default PhotoAnnotator;
