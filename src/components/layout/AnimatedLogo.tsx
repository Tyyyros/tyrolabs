import { useState } from "react";
import { useTheme } from "../../lib/theme";
import { LegacyScene } from "./animated-logo/LegacyScene";
import { LavaScene } from "./animated-logo/variants/LavaScene";
import { ThunderScene } from "./animated-logo/variants/ThunderScene";
import { SnowScene } from "./animated-logo/variants/SnowScene";
import { SakuraScene } from "./animated-logo/variants/SakuraScene";

export function AnimatedLogo() {
  const theme = useTheme();
  const [hover, setHover] = useState(false);

  return (
    <div
      data-logo-anim
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        cursor: "default",
        position: "relative",
        pointerEvents: "auto",
      }}
    >
      {theme.id === "obsidian" ? (
        <LavaScene theme={theme} hover={hover} />
      ) : theme.id === "carbon" ? (
        <ThunderScene theme={theme} hover={hover} />
      ) : theme.id === "arctic" ? (
        <SnowScene theme={theme} hover={hover} />
      ) : theme.id === "sakura" ? (
        <SakuraScene theme={theme} hover={hover} />
      ) : (
        <LegacyScene hover={hover} />
      )}
    </div>
  );
}
