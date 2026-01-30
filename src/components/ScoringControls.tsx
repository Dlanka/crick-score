import { useState, useEffect, useRef } from "react";

export type WicketType =
  | "bowled"
  | "caught"
  | "lbw"
  | "stumping"
  | "hitWicket"
  | "runOutStriker"
  | "runOutNonStriker";

interface ScoringControlsProps {
  onWideChange: (checked: boolean) => void;
  onNoBallChange: (checked: boolean) => void;
  onExtrasStateChange: (state: {
    wide: boolean;
    noBall: boolean;
    byes: boolean;
    legByes: boolean;
  }) => void;
  onWicketChange: (checked: boolean) => void;
  onWicketStateChange: (state: {
    wicket: boolean;
    wicketType: WicketType | "";
    newBatterName: string;
    runOutBatsman: string;
  }) => void;
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  resetTrigger?: number;
  disabled?: boolean;
}

export function ScoringControls({
  onWideChange,
  onNoBallChange,
  onExtrasStateChange,
  onWicketChange,
  onWicketStateChange,
  onValidationChange,
  resetTrigger,
  disabled = false,
}: ScoringControlsProps) {
  // Component state for extras checkboxes
  // NOTE: Extras are PRE-SELECTION ONLY - they do NOT score immediately
  // They only affect the next run button tap, then reset after scoring
  const [wide, setWide] = useState(false);
  const [noBall, setNoBall] = useState(false);
  const [byes, setByes] = useState(false);
  const [legByes, setLegByes] = useState(false);

  // Component state for wicket checkbox and dropdown
  const [wicket, setWicket] = useState(false);
  const [wicketType, setWicketType] = useState<WicketType | "">("");
  const [newBatterName, setNewBatterName] = useState("");

  // Store latest callbacks in refs to avoid stale closures
  const onWideChangeRef = useRef(onWideChange);
  const onNoBallChangeRef = useRef(onNoBallChange);
  const onWicketChangeRef = useRef(onWicketChange);

  // Update refs when callbacks change
  useEffect(() => {
    onWideChangeRef.current = onWideChange;
    onNoBallChangeRef.current = onNoBallChange;
    onWicketChangeRef.current = onWicketChange;
  }, [onWideChange, onNoBallChange, onWicketChange]);

  // Track previous resetTrigger to only reset when it actually changes
  const prevResetTriggerRef = useRef<number | undefined>(resetTrigger);

  // Reset ONLY when resetTrigger changes (not on every render)
  useEffect(() => {
    // Only reset if resetTrigger has actually changed and is greater than 0
    if (
      resetTrigger !== undefined &&
      resetTrigger > 0 &&
      resetTrigger !== prevResetTriggerRef.current
    ) {
      prevResetTriggerRef.current = resetTrigger;

      // Reset all checkbox states
      setWide(false);
      setNoBall(false);
      setByes(false);
      setLegByes(false);
      setWicket(false);
      setWicketType("");
      setNewBatterName("");

      // Notify parent of state changes using refs to avoid stale closures
      onWideChangeRef.current(false);
      onNoBallChangeRef.current(false);
      onWicketChangeRef.current(false);
    }
  }, [resetTrigger]); // Only depend on resetTrigger, not callbacks

  // Handle Wide checkbox
  const handleWide = (checked: boolean) => {
    if (checked) {
      if (wicket) {
        return; // Prevent selection if Wicket is checked
      }
      setWide(true);
      setNoBall(false);
      setByes(false);
      setLegByes(false);
      onWideChange(true);
    } else {
      setWide(false);
      onWideChange(false);
    }
  };

  // Handle No Ball checkbox
  const handleNoBall = (checked: boolean) => {
    if (checked) {
      setNoBall(true);
      setWide(false);
      onNoBallChange(true);
    } else {
      setNoBall(false);
      onNoBallChange(false);
    }
  };

  // Handle Byes checkbox
  const handleByes = (checked: boolean) => {
    if (checked) {
      setByes(true);
      setLegByes(false);
      setWide(false);
    } else {
      setByes(false);
    }
  };

  // Handle Leg Byes checkbox
  const handleLegByes = (checked: boolean) => {
    if (checked) {
      setLegByes(true);
      setByes(false);
      setWide(false);
    } else {
      setLegByes(false);
    }
  };

  // Handle Wicket checkbox
  const handleWicket = (checked: boolean) => {
    if (checked) {
      if (wide) {
        return; // Prevent selection if Wide is checked
      }
      setWicket(true);
      onWicketChange(true);
    } else {
      setWicket(false);
      setWicketType("");
      setNewBatterName("");
      onWicketChange(false);
    }
  };

  // Wicket type and new batter name are only set in the modal, not in the main panel

  // Sync: if Wicket becomes checked, uncheck Wide
  useEffect(() => {
    if (wicket && wide) {
      setWide(false);
      onWideChangeRef.current(false);
    }
  }, [wicket, wide]); // Only depend on state values, not callbacks

  // Sync: if Wide becomes checked, uncheck Wicket
  useEffect(() => {
    if (wide && wicket) {
      setWicket(false);
      setWicketType("");
      setNewBatterName("");
      onWicketChangeRef.current(false);
    }
  }, [wide, wicket]); // Only depend on state values, not callbacks

  // Wicket type validation is handled in the modal, not in the main panel

  // Store latest callbacks in refs for extras and wicket state changes
  const onExtrasStateChangeRef = useRef(onExtrasStateChange);
  const onWicketStateChangeRef = useRef(onWicketStateChange);

  // Update refs when callbacks change
  useEffect(() => {
    onExtrasStateChangeRef.current = onExtrasStateChange;
    onWicketStateChangeRef.current = onWicketStateChange;
  }, [onExtrasStateChange, onWicketStateChange]);

  // Notify parent of extras state changes
  useEffect(() => {
    onExtrasStateChangeRef.current({ wide, noBall, byes, legByes });
  }, [wide, noBall, byes, legByes]); // Only depend on state values

  // Notify parent of wicket state changes
  useEffect(() => {
    onWicketStateChangeRef.current({
      wicket,
      wicketType,
      newBatterName,
      runOutBatsman: "",
    });
  }, [wicket, wicketType, newBatterName]); // Only depend on state values

  // Calculate validation errors for wicket + extras combinations
  const validationErrors: string[] = [];
  let isValid = true;

  // Validation: Wicket + Wide ❌
  if (wicket && wide) {
    validationErrors.push("Wicket cannot be selected with Wide");
    isValid = false;
  }

  // Validation: Wicket + No ball ✅ (Run out only)
  // If wicket is selected and noBall is selected, wicketType must be a run-out type (if selected)
  // If wicketType is not selected yet but noBall is selected, we can't validate yet
  if (wicket && noBall) {
    if (
      wicketType &&
      wicketType !== "runOutStriker" &&
      wicketType !== "runOutNonStriker"
    ) {
      validationErrors.push("Wicket with No ball is only allowed for Run Out");
      isValid = false;
    }
  }

  // Notify parent of validation state changes
  // Use a ref to track validation state and only notify when it changes
  const prevValidationRef = useRef<{ isValid: boolean; errorCount: number }>({
    isValid: true,
    errorCount: 0,
  });
  useEffect(() => {
    const currentErrorCount = validationErrors.length;
    if (
      prevValidationRef.current.isValid !== isValid ||
      prevValidationRef.current.errorCount !== currentErrorCount
    ) {
      prevValidationRef.current = { isValid, errorCount: currentErrorCount };
      if (onValidationChange) {
        onValidationChange(isValid, validationErrors);
      }
    }
  }, [isValid, onValidationChange, validationErrors, validationErrors.length]); // Only depend on isValid and errors length

  // Calculate disabled states dynamically
  const isWideDisabled = wicket || byes || legByes;
  const isNoBallDisabled = wide;
  const isByesDisabled = wide;
  const isLegByesDisabled = wide;
  const isWicketDisabled = wide;

  // Wicket type options and validation are handled in the modal, not in the main panel

  return (
    <div className="space-y-2">
      {/* Extras + Wicket Group */}
      <div className="space-y-1">
        {/* Validation error messages */}
        {validationErrors.length > 0 && (
          <div className="text-xs text-red-600 space-y-0.5">
            {validationErrors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        )}
        <div className="flex flex-row flex-nowrap gap-4">
          <label
            className={`flex items-center gap-1 py-0.5 px-1 rounded transition-colors touch-target ${
              isWideDisabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:bg-gray-100"
            }`}
          >
            <input
              type="checkbox"
              checked={wide}
              onChange={(e) => handleWide(e.target.checked)}
              disabled={isWideDisabled || disabled}
              className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-xs text-gray-700">WD</span>
          </label>

          <label
            className={`flex items-center gap-1 py-0.5 px-1 rounded transition-colors touch-target ${
              isNoBallDisabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:bg-gray-100"
            }`}
          >
            <input
              type="checkbox"
              checked={noBall}
              onChange={(e) => handleNoBall(e.target.checked)}
              disabled={isNoBallDisabled || disabled}
              className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-xs text-gray-700">NB</span>
          </label>

          <label
            className={`flex items-center gap-1 py-0.5 px-1 rounded transition-colors touch-target ${
              isByesDisabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:bg-gray-100"
            }`}
          >
            <input
              type="checkbox"
              checked={byes}
              onChange={(e) => handleByes(e.target.checked)}
              disabled={isByesDisabled || disabled}
              className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-xs text-gray-700">B</span>
          </label>

          <label
            className={`flex items-center gap-1 py-0.5 px-1 rounded transition-colors touch-target ${
              isLegByesDisabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:bg-gray-100"
            }`}
          >
            <input
              type="checkbox"
              checked={legByes}
              onChange={(e) => handleLegByes(e.target.checked)}
              disabled={isLegByesDisabled || disabled}
              className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-xs text-gray-700">LB</span>
          </label>

          <label
            className={`flex items-center gap-1 py-0.5 px-1 rounded transition-colors touch-target ${
              isWicketDisabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:bg-gray-100"
            }`}
          >
            <input
              type="checkbox"
              checked={wicket}
              onChange={(e) => handleWicket(e.target.checked)}
              disabled={isWicketDisabled || disabled}
              className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:ring-offset-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-xs text-gray-700">Wicket</span>
          </label>
        </div>
      </div>
    </div>
  );
}
