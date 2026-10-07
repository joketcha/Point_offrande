import React from "react";
import { random, useCurrentFrame } from "remotion";
import { Stage } from "./Stage";

const BANDES = new Array(7).fill(0).map((_, i) => ({
  x: random(`brume-x-${i}`) * 2400 - 300,
  dy: (random(`brume-y-${i}`) - 0.5) * 120,
  w: 700 + random(`brume-w-${i}`) * 900,
  h: 40 + random(`brume-h-${i}`) * 60,
}));

// Brume légère dans les vallées.
export const Mist: React.FC<{
  readonly y?: number;
  readonly opacity?: number;
  readonly speed?: number;
  readonly color?: string;
}> = ({ y = 640, opacity = 0.18, speed = 0.3, color = "#8ea3c9" }) => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <g filter="url(#flou-30)" opacity={opacity}>
        {BANDES.map((b, i) => (
          <ellipse
            key={i}
            cx={((b.x + frame * speed * (i % 2 ? 1 : 0.6) + 600) % 3000) - 600}
            cy={y + b.dy}
            rx={b.w / 2}
            ry={b.h}
            fill={color}
          />
        ))}
      </g>
    </Stage>
  );
};
