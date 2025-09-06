import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 192,
  height: 192,
};
export const contentType = "image/png";

// Image generation
export default function Icon192() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 96,
          background:
            "linear-gradient(135deg, rgb(195, 65, 189) 0%, rgb(156, 8, 116) 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: "32px",
          fontWeight: "bold",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Audio wave visualization - 5 bars */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "48px",
              background: "white",
              borderRadius: "8px",
            }}
          />
          <div
            style={{
              width: "12px",
              height: "72px",
              background: "white",
              borderRadius: "8px",
            }}
          />
          <div
            style={{
              width: "12px",
              height: "96px",
              background: "white",
              borderRadius: "8px",
            }}
          />
          <div
            style={{
              width: "12px",
              height: "72px",
              background: "white",
              borderRadius: "8px",
            }}
          />
          <div
            style={{
              width: "12px",
              height: "48px",
              background: "white",
              borderRadius: "8px",
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
