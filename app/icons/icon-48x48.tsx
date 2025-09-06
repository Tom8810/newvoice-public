import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 48,
  height: 48,
};
export const contentType = "image/png";

// Image generation
export default function Icon48() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background:
            "linear-gradient(135deg,rgb(195, 65, 189) 0%, rgb(156, 8, 116) 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: "8px",
          fontWeight: "bold",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Audio wave icon effect - medium size for 48px */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          <div
            style={{
              width: "3px",
              height: "12px",
              background: "white",
              borderRadius: "2px",
            }}
          />
          <div
            style={{
              width: "3px",
              height: "18px",
              background: "white",
              borderRadius: "2px",
            }}
          />
          <div
            style={{
              width: "3px",
              height: "24px",
              background: "white",
              borderRadius: "2px",
            }}
          />
          <div
            style={{
              width: "3px",
              height: "18px",
              background: "white",
              borderRadius: "2px",
            }}
          />
          <div
            style={{
              width: "3px",
              height: "12px",
              background: "white",
              borderRadius: "2px",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
