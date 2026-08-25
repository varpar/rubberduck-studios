import { HomeSeoFallback } from "./_components/HomeSeoFallback";
import { Stage } from "./_components/Stage";

export default function Home() {
  return (
    <>
      <div className="home-interactive-stage">
        <Stage />
      </div>
      <HomeSeoFallback />
    </>
  );
}
