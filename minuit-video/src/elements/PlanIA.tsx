import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { getStaticFiles } from "@remotion/studio";
import { clamp } from "../lib/util";

const VIDEO = ["mp4", "webm", "mov"];
const IMAGE = ["png", "jpg", "jpeg", "webp"];

// Cherche public/plans/<id>.<ext>
export const trouverPlan = (id: string) => {
  const fichiers = getStaticFiles();
  for (const ext of [...VIDEO, ...IMAGE]) {
    const f = fichiers.find((s) => s.name === `plans/${id}.${ext}`);
    if (f) return { nom: f.name, video: VIDEO.includes(ext) };
  }
  return null;
};

// Affiche le plan IA s'il existe. Une image fixe reçoit un lent travelling avant.
export const PlanIA: React.FC<{ readonly id: string; readonly duree: number }> = ({ id, duree }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const plan = trouverPlan(id);
  if (!plan) return null;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {plan.video ? (
        <Video src={staticFile(plan.nom)} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
      ) : (
        <Img
          src={staticFile(plan.nom)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale: interpolate(frame, [0, duree * fps], [1.02, 1.1], clamp),
          }}
        />
      )}
    </AbsoluteFill>
  );
};
