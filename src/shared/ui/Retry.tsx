import { Button } from "./controls";

type Props = {
  text: string;
  textButton?: string;
  onClick: () => void;
};

export const Retry: React.FC<Props> = ({
  text,
  textButton = "Retry",
  onClick,
}) => {
  return (
    <div className="mb-3 flex items-center justify-between rounded-md border border-[var(--kma-danger-border)] bg-[var(--kma-danger-bg)] px-3 py-2 text-sm text-[var(--kma-danger)]">
      <span>{text}</span>
      <Button onClick={onClick}>{textButton}</Button>
    </div>
  );
};
