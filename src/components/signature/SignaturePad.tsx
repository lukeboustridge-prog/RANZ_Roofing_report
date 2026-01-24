"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Undo2 } from "lucide-react";

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string | null;
}

interface SignaturePadProps {
  width?: number;
  height?: number;
  lineColor?: string;
  lineWidth?: number;
  backgroundColor?: string;
  onSign?: () => void;
  disabled?: boolean;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  (
    {
      width = 500,
      height = 200,
      lineColor = "#1e3a5f",
      lineWidth = 2,
      backgroundColor = "#ffffff",
      onSign,
      disabled = false,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [history, setHistory] = useState<ImageData[]>([]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set up canvas
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw signature line
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(50, height - 40);
      ctx.lineTo(width - 50, height - 40);
      ctx.stroke();
      ctx.setLineDash([]);

      // Add "Sign here" text
      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px sans-serif";
      ctx.fillText("Sign above line", width / 2 - 40, height - 15);

      // Save initial state
      const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialState]);
    }, [width, height, lineColor, lineWidth, backgroundColor]);

    const getCoordinates = (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const startDrawing = (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      if (disabled) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;

      // Save state before drawing
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev, currentState]);

      const { x, y } = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    };

    const draw = (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      if (!isDrawing || disabled) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (isDrawing && !hasDrawn) {
        setHasDrawn(true);
        onSign?.();
      }
      setIsDrawing(false);
    };

    const clear = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;

      // Reset to initial state
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Redraw signature line
      ctx.strokeStyle = lineColor;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(50, height - 40);
      ctx.lineTo(width - 50, height - 40);
      ctx.stroke();
      ctx.setLineDash([]);

      // Redraw text
      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px sans-serif";
      ctx.fillText("Sign above line", width / 2 - 40, height - 15);

      // Reset stroke style for drawing
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth;

      setHasDrawn(false);
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };

    const undo = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas || history.length <= 1) return;

      const newHistory = [...history];
      newHistory.pop(); // Remove current state
      const prevState = newHistory[newHistory.length - 1];

      if (prevState) {
        ctx.putImageData(prevState, 0, 0);
        setHistory(newHistory);

        // Check if we're back to initial state
        if (newHistory.length === 1) {
          setHasDrawn(false);
        }
      }
    };

    const isEmpty = () => !hasDrawn;

    const toDataURL = () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return null;
      return canvas.toDataURL("image/png");
    };

    useImperativeHandle(ref, () => ({
      clear,
      isEmpty,
      toDataURL,
    }));

    return (
      <div className="space-y-2">
        <div
          className={`relative border-2 rounded-lg overflow-hidden ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-crosshair"
          } ${hasDrawn ? "border-green-500" : "border-muted-foreground/30"}`}
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full touch-none"
            style={{ maxWidth: width }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={disabled || history.length <= 1}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clear}
            disabled={disabled || !hasDrawn}
          >
            <Eraser className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";

export { SignaturePad };
