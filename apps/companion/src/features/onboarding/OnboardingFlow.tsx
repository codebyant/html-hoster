import { useState } from "react";
import { WelcomeStep } from "./steps/WelcomeStep";
import { ApiUrlStep } from "./steps/ApiUrlStep";
import { ApiKeyStep } from "./steps/ApiKeyStep";
import { DoneStep } from "./steps/DoneStep";
import { markOnboardingCompleted } from "../settings/settings.service";

type Step = "welcome" | "api-url" | "api-key" | "done";

interface Props {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [apiUrl, setApiUrl] = useState("");

  async function handleDone() {
    await markOnboardingCompleted();
    onComplete();
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {step === "welcome" && <WelcomeStep onNext={() => setStep("api-url")} />}
      {step === "api-url" && (
        <ApiUrlStep
          onNext={(url) => {
            setApiUrl(url);
            setStep("api-key");
          }}
          onBack={() => setStep("welcome")}
        />
      )}
      {step === "api-key" && (
        <ApiKeyStep
          apiUrl={apiUrl}
          onNext={() => setStep("done")}
          onBack={() => setStep("api-url")}
        />
      )}
      {step === "done" && <DoneStep onDone={handleDone} />}
    </div>
  );
}
