import { Composition } from "remotion";
import { V0Teaser } from "./compositions/V0Teaser";
import { V1Interview } from "./compositions/V1Interview";
import { V2Build } from "./compositions/V2Build";
import { V4Audit } from "./compositions/V4Audit";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* V0: Teaser — 15 seconds */}
      <Composition
        id="V0-Teaser"
        component={V0Teaser}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="V0-Teaser-Landscape"
        component={V0Teaser}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* V1: The Interview — 30 seconds */}
      <Composition
        id="V1-Interview"
        component={V1Interview}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* V2: The Build — 30 seconds */}
      <Composition
        id="V2-Build"
        component={V2Build}
        durationInFrames={900}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* V4: The Audit — 20 seconds */}
      <Composition
        id="V4-Audit"
        component={V4Audit}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
