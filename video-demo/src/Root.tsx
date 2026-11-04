import { Composition } from "remotion";
import { RunovaDemo } from "./Composition";
import { RunovaLaunch } from "./LaunchVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RunovaLaunch"
        component={RunovaLaunch}
        durationInFrames={5400}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="RunovaDemo"
        component={RunovaDemo}
        durationInFrames={5400}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
