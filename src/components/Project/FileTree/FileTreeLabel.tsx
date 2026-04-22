import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

interface Props {
  label: string;
  hovered: boolean;
  rowRef: RefObject<HTMLElement | null>;
  muted?: boolean;
}

const FileTreeLabel: React.FC<Props> = ({
  label,
  hovered,
  rowRef,
  muted = false,
}) => {
  const labelRef = useRef<HTMLParagraphElement>(null);
  const [overlayRect, setOverlayRect] = useState<DOMRect | null>(null);
  const [rowRect, setRowRect] = useState<DOMRect | null>(null);

  const updateMeasurements = () => {
    const element = labelRef.current;

    if (!element) return;

    setOverlayRect(element.getBoundingClientRect());
    setRowRect(rowRef.current?.getBoundingClientRect() ?? null);
  };

  useEffect(() => {
    const element = labelRef.current;

    if (!element) return;

    updateMeasurements();

    const observer = new ResizeObserver(updateMeasurements);
    observer.observe(element);

    window.addEventListener("resize", updateMeasurements);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMeasurements);
    };
  }, [label, rowRef]);

  useEffect(() => {
    if (!hovered) return;

    updateMeasurements();
    window.addEventListener("scroll", updateMeasurements, true);

    return () => {
      window.removeEventListener("scroll", updateMeasurements, true);
    };
  }, [hovered, rowRef]);

  const showOverlay = hovered && overlayRect && rowRect;

  return (
    <div className="min-w-0 flex-1">
      <p
        ref={labelRef}
        className={`block w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm select-none ${
          muted ? "text-neutral-400" : ""
        }`}
      >
        {label}
      </p>
      {showOverlay && (
        <div
          className={`pointer-events-none fixed z-50 whitespace-nowrap bg-accent px-1 text-sm ${
            muted ? "text-neutral-400" : "text-primary"
          }`}
          style={{
            left: overlayRect.left - 4,
            top: rowRect.top,
            height: rowRect.height,
            lineHeight: `${rowRect.height}px`,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

export default FileTreeLabel;
