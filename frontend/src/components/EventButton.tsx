interface EventButtonProps {
  label: string;
  onClick: () => void;
}

export default function EventButton({ label, onClick }: EventButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-violet-600 text-white py-2 px-2 rounded-full hover:bg-violet-900 transition cursor-pointer text-sm"
    >
      {label}
    </button>
  );
}
