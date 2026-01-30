interface RunButtonsProps {
  onRunChange: (runs: number | null) => void;
  resetTrigger?: number;
  disabled?: boolean;
}

export function RunButtons({ onRunChange, disabled = false }: RunButtonsProps) {
  const handleRun = (runs: number) => {
    // Final action - immediately trigger scoring or wicket popup
    onRunChange(runs);
  };

  // Buttons: 0, 1, 2, 3, 4, 6
  const runValues = [0, 1, 2, 3, 4, 6];

  return (
    <div className="grid grid-cols-6 gap-2">
      {runValues.map((runs) => (
        <button
          key={runs}
          onClick={() => handleRun(runs)}
          disabled={disabled}
          className={`w-12 h-12 rounded-full border-2 font-bold text-base shadow-md transition-all duration-75 flex items-center justify-center touch-target ${
            disabled
              ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50"
              : "border-green-500 bg-white text-green-600 active:shadow-none active:scale-95 active:bg-green-500 active:text-white"
          }`}
        >
          {runs}
        </button>
      ))}
    </div>
  );
}
