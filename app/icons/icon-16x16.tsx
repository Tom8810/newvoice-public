import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 16,
  height: 16,
};
export const contentType = "image/png";

// Image generation
export default function Icon16() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg,rgb(195, 65, 189) 0%, rgb(156, 8, 116) 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: "3px",
        }}
      >
        {/* Simplified audio wave for 16px - 3 bars only */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1px",
          }}
        >
          <div
            style={{
              width: "1px",
              height: "4px",
              background: "white",
              borderRadius: "0.5px",
            }}
          />
          <div
            style={{
              width: "1px",
              height: "6px",
              background: "white",
              borderRadius: "0.5px",
            }}
          />
          <div
            style={{
              width: "1px",
              height: "8px",
              background: "white",
              borderRadius: "0.5px",
            }}
          />
          <div
            style={{
              width: "1px",
              height: "6px",
              background: "white",
              borderRadius: "0.5px",
            }}
          />
          <div
            style={{
              width: "1px",
              height: "4px",
              background: "white",
              borderRadius: "0.5px",
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
